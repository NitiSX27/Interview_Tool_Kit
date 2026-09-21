/**
 * kitValidator.js
 *
 * Validates that a generated kit conforms to the Appendix A structure.
 * Uses Zod for schema validation.
 */

const { z } = require('zod');

const requirementSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

const questionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const flashcardSchema = z.object({
  id: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
});

const scheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  minutes: z.number().int().positive(),
});

const kitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int(),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(requirementSchema),
  }),
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: z.object({
    days_available: z.number().int().positive(),
    days: z.array(scheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int().positive(),
  }),
});

/**
 * Validate a kit object against the expected structure.
 * Throws with details if invalid.
 */
function validateKit(kit) {
  const result = kitSchema.safeParse(kit);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Kit validation failed: ${issues}`);
  }

  // Cross-reference: every question_id in schedule must exist in questions
  const questionIds = new Set((kit.questions || []).map((q) => q.id));
  const badRefs = [];
  for (const day of kit.schedule?.days || []) {
    for (const qid of day.question_ids || []) {
      if (!questionIds.has(qid)) badRefs.push(qid);
    }
  }
  if (badRefs.length > 0) {
    throw new Error(`Schedule references non-existent question ids: ${badRefs.join(', ')}`);
  }

  return true;
}

module.exports = { validateKit, kitSchema };
