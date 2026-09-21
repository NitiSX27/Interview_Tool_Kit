/**
 * coverage.js
 *
 * Deterministic coverage check — no LLM involved.
 *
 * Algorithm:
 *   1. Build a map: requirement_id → [question_ids that cover it]
 *   2. For every "must" requirement: if no question covers it, it is a gap
 *   3. Return { covered: [...req ids], gaps: [...req ids] }
 *
 * This is arithmetic — the spec explicitly says this must not be handed to the model.
 */

/**
 * Check which "must" requirements are covered by the questions.
 *
 * @param {Array} requirements - array of { id, priority, ... }
 * @param {Array} questions    - array of { id, requirement_ids, ... }
 * @returns {{ covered: string[], gaps: string[], coverageMap: object }}
 */
function checkCoverage(requirements, questions) {
  // Build coverage map: reqId → question ids
  const coverageMap = {};
  for (const req of requirements) {
    coverageMap[req.id] = [];
  }

  for (const q of questions) {
    if (!Array.isArray(q.requirement_ids)) continue;
    for (const reqId of q.requirement_ids) {
      if (coverageMap[reqId] !== undefined) {
        coverageMap[reqId].push(q.id);
      }
    }
  }

  // Only "must" requirements must be covered
  const mustRequirements = requirements.filter((r) => r.priority === 'must');

  const covered = [];
  const gaps = [];

  for (const req of mustRequirements) {
    if (coverageMap[req.id]?.length > 0) {
      covered.push(req.id);
    } else {
      gaps.push(req.id);
    }
  }

  return { covered, gaps, coverageMap };
}

module.exports = { checkCoverage };
