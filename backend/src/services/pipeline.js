/**
 * pipeline.js
 *
 * Orchestrates the full kit generation pipeline.
 * Steps emit progress events via an optional onProgress callback
 * so the Express route can stream them as Server-Sent Events.
 *
 * Steps:
 *   1.  Sanitise + hash input
 *   2.  Crawl company site (homepage → rank links → about + hiring pages)
 *   3.  Search public discussion
 *   4.  Extract requirements from JD  [LLM]
 *   5.  Generate company brief        [LLM]
 *   6.  Generate questions per category (4 calls) [LLM]
 *   7.  Generate flashcards           [LLM]
 *   8.  Coverage check pass 1         [deterministic]
 *   9.  Gap fill if needed            [LLM]
 *  10.  Coverage check pass 2         [deterministic]
 *  11.  Build schedule                [deterministic]
 *  12.  Validate kit structure        [Zod]
 *  13.  Return final kit object
 */

const crypto = require('crypto');
const { sanitiseURL } = require('../utils/urlSanitise');
const { crawlCompany } = require('./crawler');
const { searchPublicDiscussion, extractCompanyName } = require('./researcher');
const { extractRequirements, generateCompanyBrief } = require('./extractor');
const { generateAllQuestions, generateGapQuestions, generateFlashcards } = require('./generator');
const { checkCoverage } = require('./coverage');
const { buildSchedule } = require('./scheduler');
const { validateKit } = require('../utils/kitValidator');

const MAX_COVERAGE_PASSES = 2;

/**
 * Generate a stable MD5 hash of a string (used for dedup).
 */
function hashJD(jd, companyUrl) {
  return crypto.createHash('md5').update(jd + companyUrl).digest('hex');
}

/**
 * Run the full pipeline.
 *
 * @param {object} input
 * @param {string} input.jd           - job description text
 * @param {string} input.companyUrl   - company website URL
 * @param {number} input.days         - days available for prep
 * @param {Function} [onProgress]     - (step, message, percent) => void
 * @returns {Promise<object>}         - the complete kit object
 */
async function runPipeline({ jd, companyUrl, days }, onProgress = () => {}) {
  const progress = (step, msg, pct) => {
    console.log(`[PIPELINE:${step}] ${msg}`);
    onProgress(step, msg, pct);
  };

  // ── Step 1: Validate input ──────────────────────────────────────────────
  progress('init', 'Validating inputs…', 2);
  const daysAvailable = Math.max(1, Math.min(parseInt(days, 10) || 5, 365));
  const jdText = String(jd || '').trim();

  if (!jdText) throw Object.assign(new Error('Job description is required'), { code: 'INVALID_INPUT' });

  let parsedURL;
  try {
    parsedURL = sanitiseURL(companyUrl);
  } catch (err) {
    throw Object.assign(err, { code: 'INVALID_URL' });
  }

  const jdHash = hashJD(jdText, parsedURL.href);
  const researched_at = new Date().toISOString();

  // ── Step 2: Crawl company site ──────────────────────────────────────────
  progress('crawl', 'Crawling company website…', 5);
  let crawlResult = { homepageText: '', aboutText: '', hiringText: '', pagesUsed: [] };
  try {
    crawlResult = await crawlCompany(parsedURL.href, (step, msg) => progress(step, msg, 10));
  } catch (err) {
    progress('crawl', `Warning: Crawl failed — ${err.message}. Continuing.`, 15);
  }

  // ── Step 3: Public discussion search ───────────────────────────────────
  progress('research', 'Searching for public interview discussion…', 20);
  const companyName = extractCompanyName(parsedURL.href);
  let publicDiscussion = '';
  try {
    publicDiscussion = await searchPublicDiscussion(companyName);
  } catch (err) {
    progress('research', `Warning: Public search failed — ${err.message}. Continuing.`, 22);
  }

  // ── Step 4: Extract requirements from JD ───────────────────────────────
  progress('extract', 'Extracting requirements from job description…', 25);
  let roleInfo;
  try {
    roleInfo = await extractRequirements(jdText);
  } catch (err) {
    throw Object.assign(
      new Error(`Failed to extract requirements: ${err.message}`),
      { code: 'EXTRACTION_FAILED' }
    );
  }

  const requirements = roleInfo.requirements;
  const detectedCompany = roleInfo.company !== 'Unknown' ? roleInfo.company : companyName;

  // ── Step 5: Generate company brief ─────────────────────────────────────
  progress('brief', 'Generating company brief…', 35);
  let companyBrief;
  try {
    companyBrief = await generateCompanyBrief({
      companyName: detectedCompany,
      jd,
      homepageText: crawlResult.homepageText,
      aboutText: crawlResult.aboutText,
      hiringText: crawlResult.hiringText,
      publicDiscussion,
      pagesUsed: crawlResult.pagesUsed,
    });
  } catch (err) {
    progress('brief', `Warning: Brief generation failed — ${err.message}`, 38);
    companyBrief = {
      summary: 'Company brief could not be generated.',
      about_company: 'No information available.',
      what_they_do: 'No information available.',  // Appendix A required field
      jd_relevance: 'No information available.',
      interview_process: 'No public information found.',
      sources: crawlResult.pagesUsed,
    };
  }

  // ── Step 6: Generate questions per category ────────────────────────────
  progress('generate', 'Generating interview questions (4 categories)…', 40);
  let questions = [];
  try {
    questions = await generateAllQuestions(
      {
        requirements,
        roleTitle: roleInfo.title,
        companyBrief: `${companyBrief.summary} ${companyBrief.what_they_do}`,
        hiringText: crawlResult.hiringText,
      },
      (step, msg) => progress(step, msg, 55)
    );
  } catch (err) {
    progress('generate', `Warning: Question generation partially failed — ${err.message}`, 58);
  }

  // ── Step 7: Generate flashcards ────────────────────────────────────────
  progress('flashcards', 'Generating flashcards…', 60);
  let flashcards = [];
  try {
    flashcards = await generateFlashcards({
      requirements,
      questions,
      roleTitle: roleInfo.title,
    });
  } catch (err) {
    progress('flashcards', `Warning: Flashcard generation failed — ${err.message}`, 63);
  }

  // ── Step 8: Coverage check pass 1 ──────────────────────────────────────
  progress('coverage', 'Running coverage check (pass 1)…', 65);
  let coverageResult = checkCoverage(requirements, questions);
  let passes = 1;

  // ── Step 9: Gap fill ───────────────────────────────────────────────────
  if (coverageResult.gaps.length > 0 && passes < MAX_COVERAGE_PASSES) {
    progress('gap-fill', `Filling ${coverageResult.gaps.length} coverage gaps…`, 68);
    try {
      const gapQuestions = await generateGapQuestions({
        requirements,
        gapReqIds: coverageResult.gaps,
        roleTitle: roleInfo.title,
        companyBrief: `${companyBrief.summary} ${companyBrief.what_they_do}`,
        hiringText: crawlResult.hiringText,
        existingQuestions: questions,
      });
      questions = [...questions, ...gapQuestions];
    } catch (err) {
      progress('gap-fill', `Warning: Gap fill failed — ${err.message}`, 72);
    }

    // ── Step 10: Coverage check pass 2 ──────────────────────────────────
    passes++;
    progress('coverage', 'Running coverage check (pass 2)…', 75);
    coverageResult = checkCoverage(requirements, questions);
  }

  // ── Step 11: Build schedule ────────────────────────────────────────────
  progress('schedule', 'Building study schedule…', 80);
  const schedule = buildSchedule({ requirements, questions, daysAvailable });

  // ── Assemble final kit ─────────────────────────────────────────────────
  const kit = {
    source: {
      company: detectedCompany,
      company_url: parsedURL.href,
      role: roleInfo.title,
      location: roleInfo.location,
      jd_chars: jdText.length,
      researched_at,
      pages_used: crawlResult.pagesUsed,
    },
    company_brief: companyBrief,
    role: {
      title: roleInfo.title,
      seniority: roleInfo.seniority,
      responsibilities: roleInfo.responsibilities,
      requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: coverageResult.gaps,
      passes,
    },
    _meta: { jdHash },
  };

  // ── Step 12: Validate structure ────────────────────────────────────────
  progress('validate', 'Validating kit structure…', 90);
  try {
    validateKit(kit);
  } catch (err) {
    progress('validate', `Warning: Structure validation issues — ${err.message}`, 92);
  }

  progress('done', 'Kit generation complete!', 100);
  return kit;
}

module.exports = { runPipeline, hashJD };
