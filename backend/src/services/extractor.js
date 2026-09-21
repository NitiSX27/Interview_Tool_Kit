/**
 * extractor.js
 *
 * Uses Gemini to extract structured requirements from a job description,
 * and to generate the company brief.
 *
 * These are separate LLM calls because:
 *   - Requirement extraction uses only the JD text
 *   - Company brief uses crawled page content
 *   - Keeping them separate isolates failures and allows targeted retries
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { extractJSON } = require('../utils/jsonRepair');
const { withRetry } = require('../utils/retry');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel(pro = false) {
  const name = pro
    ? (process.env.GEMINI_PRO_MODEL || 'gemini-1.5-flash')
    : (process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash');
  return genAI.getGenerativeModel({ model: name });
}

/**
 * Extract requirements and role info from a job description.
 *
 * @param {string} jd  - raw job description text
 * @returns {Promise<{ role, requirements }>}
 */
async function extractRequirements(jd) {
  const trimmedJD = jd.slice(0, 12000); // hard cap to manage tokens

  const prompt = `You are an expert technical recruiter. Analyse the following job description and extract structured information.

JOB DESCRIPTION:
"""
${trimmedJD}
"""

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "title": "job title from the posting",
  "seniority": "junior | mid | senior | lead | principal | not specified",
  "location": "location or 'Remote' or 'Not specified'",
  "company": "company name if mentioned, else 'Unknown'",
  "responsibilities": ["responsibility 1", "responsibility 2"],
  "requirements": [
    {
      "id": "r1",
      "text": "concise requirement text",
      "kind": "technical | behavioural | domain",
      "priority": "must | nice"
    }
  ]
}

Rules:
- "must" = explicitly required, mandatory, essential, minimum qualification, "required", "must have", "you will need"
- "nice" = preferred, bonus, "nice to have", "plus", "desirable", "ideally"  
- If wording is ambiguous, default to "must"
- kind = "technical" for hard skills/tools/languages/frameworks
- kind = "behavioural" for soft skills, communication, leadership, collaboration
- kind = "domain" for industry knowledge, business domain experience
- Each requirement gets a unique id: r1, r2, r3, ...
- Extract every distinct requirement — do not invent ones not in the JD
- If the JD has almost no detail, extract what little there is and say so in the text
- responsibilities should list actual role duties, not requirements`;

  return withRetry(async () => {
    const model = getModel(false);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    // Normalise & validate
    if (!Array.isArray(parsed.requirements)) parsed.requirements = [];
    if (!Array.isArray(parsed.responsibilities)) parsed.responsibilities = [];

    // Ensure ids are assigned
    parsed.requirements = parsed.requirements.map((r, i) => ({
      id: r.id || `r${i + 1}`,
      text: String(r.text || '').trim(),
      kind: ['technical', 'behavioural', 'domain'].includes(r.kind) ? r.kind : 'technical',
      priority: r.priority === 'nice' ? 'nice' : 'must',
    }));

    return {
      title: parsed.title || 'Software Engineer',
      seniority: parsed.seniority || 'not specified',
      location: parsed.location || 'Not specified',
      company: parsed.company || 'Unknown',
      responsibilities: parsed.responsibilities.slice(0, 15),
      requirements: parsed.requirements,
    };
  });
}

/**
 * Generate the company brief from crawled page content.
 * Produces TWO distinct sections:
 *   1. about_company  — general overview (what they do, products, culture)
 *   2. jd_relevance   — what this JD reveals about the team & what they're really looking for
 *
 * @param {object} params
 * @param {string} params.companyName
 * @param {string} params.jd            — raw job description for context
 * @param {string} params.homepageText
 * @param {string} params.aboutText
 * @param {string} params.hiringText
 * @param {string} params.publicDiscussion
 * @param {string[]} params.pagesUsed
 * @returns {Promise<{ summary, about_company, jd_relevance, interview_process, sources }>}
 */
async function generateCompanyBrief({ companyName, jd, homepageText, aboutText, hiringText, publicDiscussion, pagesUsed }) {
  const combined = [
    homepageText && `HOMEPAGE:\n${homepageText}`,
    aboutText    && `ABOUT PAGE:\n${aboutText}`,
    hiringText   && `HIRING / CAREERS PAGE:\n${hiringText}`,
    publicDiscussion && `PUBLIC DISCUSSION ABOUT THEIR INTERVIEW PROCESS:\n${publicDiscussion}`,
  ]
    .filter(Boolean)
    .join('\n\n---\n\n')
    .slice(0, 15000);

  const jdSnippet = (jd || '').slice(0, 3000);
  const hasContent = combined.length > 50;

  const prompt = hasContent
    ? `You are preparing a two-part company brief for a job candidate who is interviewing at ${companyName}.

PART A — Use ONLY the company sources below:
${combined}

PART B — Also read this job description:
"""
${jdSnippet}
"""

Return ONLY a JSON object with this exact structure:
{
  "summary": "One punchy sentence: what the company does and who it serves.",
  "about_company": "3-5 sentences covering: what they build or sell, their key products or services, their customer base, company size/stage if mentioned, engineering culture or tech stack if mentioned, any notable funding or milestones.",
  "jd_relevance": "3-5 sentences written directly to the candidate: what this role reveals about the team's priorities, what problems you'd be solving, what they seem to value most based on the JD language, any signals about team culture or working style, and one thing that makes this company interesting for this specific role.",
  "interview_process": "What is known about their interview process (from hiring page or public discussion). If nothing is known, write: 'No public information found about their interview process.'"
}

Rules:
- about_company uses ONLY information from the company sources. Do not invent.
- jd_relevance synthesises the JD + any company source signals. Be specific to THIS role.
- Be honest if information is sparse.
- Write for a human, not for a database — use natural language.`
    : `You are preparing a company brief for a job candidate.

No website content was found for "${companyName}". However you have the job description:
"""
${jdSnippet}
"""

Return ONLY a JSON object:
{
  "summary": "Company information could not be retrieved from the website.",
  "about_company": "No public information was found for ${companyName}. The company website was unreachable or contained insufficient content. You may want to research the company independently before your interview.",
  "jd_relevance": "Based on the job description alone: ${companyName || 'this company'} is hiring for a role that requires the skills outlined in the JD. Review the requirements carefully — they reveal what the team values most.",
  "interview_process": "No public information found about their interview process."
}`;

  return withRetry(async () => {
    const model = getModel(false);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    return {
      summary:          parsed.summary          || 'No information available.',
      about_company:    parsed.about_company    || 'No information available.',
      // Appendix A alias
      what_they_do:     parsed.about_company    || parsed.what_they_do || 'No information available.',
      jd_relevance:     parsed.jd_relevance     || 'No information available.',
      interview_process: parsed.interview_process || 'No public information found about their interview process.',
      sources: pagesUsed,
    };
  });
}

module.exports = { extractRequirements, generateCompanyBrief };
