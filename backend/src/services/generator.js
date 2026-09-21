/**
 * generator.js
 *
 * Generates questions and flashcards via Gemini.
 *
 * Key design decisions:
 *   - One LLM call per question category (technical, behavioural, system-design, company-fit)
 *     so each prompt can be targeted and failures are isolated.
 *   - Gap-fill generation uses the same function but targets only uncovered requirement ids.
 *   - Flashcard generation is a single separate call.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { extractJSON } = require('../utils/jsonRepair');
const { withRetry } = require('../utils/retry');
const { sleep } = require('../utils/retry');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getModel() {
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_FAST_MODEL || 'gemini-1.5-flash',
  });
}

const CATEGORIES = ['technical', 'behavioural', 'system-design', 'company-fit'];

/**
 * Generate questions for a single category.
 *
 * @param {object} params
 * @param {string}   params.category      - one of CATEGORIES
 * @param {Array}    params.requirements   - full requirements array
 * @param {string}   params.roleTitle
 * @param {string}   params.companyBrief
 * @param {string}   params.hiringText    - interview process details if found
 * @param {string[]} [params.targetReqIds] - if set, only generate for these req ids
 * @param {string}   [params.existingIds]  - ids already used (to avoid clashes)
 * @returns {Promise<Array>} - array of question objects
 */
async function generateQuestionsForCategory({
  category,
  requirements,
  roleTitle,
  companyBrief,
  hiringText,
  targetReqIds = null,
  existingIds = [],
}) {
  // Filter requirements relevant to this category
  const categoryReqMap = {
    technical: ['technical'],
    behavioural: ['behavioural'],
    'system-design': ['technical', 'domain'],
    'company-fit': ['behavioural', 'domain'],
  };

  let relevantReqs = requirements.filter((r) =>
    categoryReqMap[category]?.includes(r.kind)
  );

  // If targeting specific reqs for gap fill, use those
  if (targetReqIds && targetReqIds.length > 0) {
    relevantReqs = requirements.filter((r) => targetReqIds.includes(r.id));
  }

  if (relevantReqs.length === 0) return [];

  const reqList = relevantReqs
    .map((r) => `- [${r.id}] (${r.priority}/${r.kind}) ${r.text}`)
    .join('\n');

  const hiringContext = hiringText
    ? `\nINTERVIEW PROCESS (from company site):\n${hiringText.slice(0, 2000)}`
    : '';

  const companyContext = companyBrief
    ? `\nCOMPANY CONTEXT:\n${companyBrief.slice(0, 1000)}`
    : '';

  const qCountHint = Math.min(Math.max(relevantReqs.length * 2, 3), 10);

  const prompt = `You are an expert interviewer preparing a ${category} question bank for a "${roleTitle}" candidate.
${companyContext}${hiringContext}

Generate ${qCountHint} ${category} interview questions that together cover ALL of these requirements:
${reqList}

Return ONLY a JSON array of question objects:
[
  {
    "requirement_ids": ["r1", "r2"],
    "category": "${category}",
    "prompt": "The full interview question text",
    "answer_outline": "Key points the candidate should cover in a strong answer (3-5 bullet points as a string)",
    "difficulty": 1
  }
]

Rules:
- difficulty: 1 = entry level, 2 = mid level, 3 = senior/hard
- Every requirement id in the list must appear in at least one question's requirement_ids
- requirement_ids lists which requirements from the list above this question tests
- For "must" priority requirements, difficulty should be 2 or 3
- For "nice" requirements, difficulty can be 1
- answer_outline should be substantive (what a great answer includes), not generic
- Do NOT invent requirements not in the list`;

  return withRetry(async () => {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    if (!Array.isArray(parsed)) return [];

    // Assign stable ids
    let counter = existingIds.length + 1;
    return parsed
      .filter((q) => q.prompt && q.answer_outline)
      .map((q) => {
        const id = `q${counter++}`;
        return {
          id,
          requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids : [],
          category: category,
          prompt: String(q.prompt).trim(),
          answer_outline: String(q.answer_outline).trim(),
          difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
          _state: 'generated',
        };
      });
  });
}

/**
 * Generate all questions across all categories.
 * Adds a small delay between calls to respect Gemini TPM limits.
 *
 * @returns {Promise<Array>} - all questions combined
 */
async function generateAllQuestions(params, onProgress = () => {}) {
  const allQuestions = [];

  for (const category of CATEGORIES) {
    onProgress('generate', `Generating ${category} questions…`);
    try {
      const questions = await generateQuestionsForCategory({
        ...params,
        category,
        existingIds: allQuestions.map((q) => q.id),
      });
      allQuestions.push(...questions);
    } catch (err) {
      console.warn(`[GENERATOR] Failed to generate ${category} questions:`, err.message);
      // Continue with other categories — partial is better than nothing
    }
    // Small delay between category calls to avoid TPM rate limit
    await sleep(1500);
  }

  return allQuestions;
}

/**
 * Generate questions only for specific uncovered requirement ids (gap fill).
 */
async function generateGapQuestions({ requirements, gapReqIds, roleTitle, companyBrief, hiringText, existingQuestions }) {
  if (!gapReqIds || gapReqIds.length === 0) return [];

  const allNew = [];
  const existingIds = existingQuestions.map((q) => q.id);

  // Group gap reqs by kind to pick category
  const gapReqs = requirements.filter((r) => gapReqIds.includes(r.id));

  const techGaps = gapReqs.filter((r) => r.kind === 'technical').map((r) => r.id);
  const behGaps = gapReqs.filter((r) => r.kind === 'behavioural').map((r) => r.id);
  const domainGaps = gapReqs.filter((r) => r.kind === 'domain').map((r) => r.id);

  const tasks = [];
  if (techGaps.length > 0) tasks.push({ category: 'technical', targetReqIds: techGaps });
  if (behGaps.length > 0) tasks.push({ category: 'behavioural', targetReqIds: behGaps });
  if (domainGaps.length > 0) tasks.push({ category: 'technical', targetReqIds: domainGaps });

  for (const task of tasks) {
    try {
      const qs = await generateQuestionsForCategory({
        ...task,
        requirements,
        roleTitle,
        companyBrief,
        hiringText,
        existingIds: [...existingIds, ...allNew.map((q) => q.id)],
      });
      allNew.push(...qs);
    } catch (err) {
      console.warn('[GENERATOR] Gap fill failed for category:', task.category, err.message);
    }
    await sleep(1500);
  }

  return allNew;
}

/**
 * Generate flashcards from requirements and questions.
 *
 * @returns {Promise<Array>} - flashcard objects
 */
async function generateFlashcards({ requirements, questions, roleTitle }) {
  const mustReqs = requirements.filter((r) => r.priority === 'must').slice(0, 15);
  if (mustReqs.length === 0) return [];

  const reqList = mustReqs.map((r) => `[${r.id}] ${r.text}`).join('\n');

  const prompt = `Create interview flashcards for a "${roleTitle}" candidate.

Requirements to cover:
${reqList}

Return ONLY a JSON array of flashcard objects:
[
  {
    "front": "Concise question or concept (1-2 sentences)",
    "back": "Clear, concise answer covering key points (2-4 sentences)",
    "requirement_ids": ["r1"]
  }
]

Rules:
- Create one flashcard per requirement
- front should be a specific question or "What is X?" style prompt
- back should be a complete, study-friendly answer
- requirement_ids lists which requirement this card tests
- Keep answers factual and practical for interview prep`;

  return withRetry(async () => {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((f) => f.front && f.back)
      .map((f, i) => ({
        id: `f${i + 1}`,
        front: String(f.front).trim(),
        back: String(f.back).trim(),
        requirement_ids: Array.isArray(f.requirement_ids) ? f.requirement_ids : [],
        _state: 'generated',
      }));
  });
}

module.exports = {
  generateAllQuestions,
  generateQuestionsForCategory,
  generateGapQuestions,
  generateFlashcards,
};
