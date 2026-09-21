/**
 * Safely extract a JSON object/array from text that may be wrapped in
 * markdown code fences (```json ... ```) or contain leading/trailing noise.
 *
 * Returns parsed object/array, or throws if nothing valid found.
 */
function extractJSON(text) {
  if (!text) throw new Error('Empty response from LLM');

  // 1. Strip markdown fences
  let cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim();

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // 3. Find first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No JSON found in LLM response');
  } else if (firstBrace === -1) {
    start = firstBracket;
  } else if (firstBracket === -1) {
    start = firstBrace;
  } else {
    start = Math.min(firstBrace, firstBracket);
  }

  const isArray = cleaned[start] === '[';
  const end = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');

  if (end === -1) throw new Error('Malformed JSON from LLM response');

  const slice = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(slice);
  } catch (err) {
    // 4. Last-resort: remove trailing commas before } or ]
    const fixed = slice
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{[,])\s*,/g, '$1');
    return JSON.parse(fixed);
  }
}

module.exports = { extractJSON };
