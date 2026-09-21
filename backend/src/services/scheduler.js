/**
 * scheduler.js
 *
 * Deterministic schedule allocation — no LLM involved.
 *
 * Algorithm:
 *   1. Sort requirements: must-haves first, then nice-to-haves.
 *      Within each group, sort by average difficulty of their questions (descending),
 *      so harder material lands on earlier days.
 *   2. For each requirement, collect its questions.
 *   3. Distribute question groups across N days using a greedy bin-packing approach:
 *      - Each day accumulates question ids until it hits a soft cap
 *      - Then overflow to the next day
 *   4. Each day's `minutes` = question_count × 10 (min 30, max 120, integer).
 *   5. Edge cases:
 *      - 1 day: all must-haves go on day 1
 *      - More days than topics: spread nicely, add review days
 *      - 60 days: remaining days get "review" focus
 *
 * Every must-have requirement must appear somewhere in the schedule.
 * The number of days in the schedule equals exactly `daysAvailable`.
 */

const MINUTES_PER_QUESTION = 10;
const MIN_MINUTES = 30;
const MAX_MINUTES = 120;
const QUESTIONS_PER_DAY_SOFT_CAP = 6;

/**
 * Build the study schedule.
 *
 * @param {object} params
 * @param {Array}  params.requirements  - requirement objects with id, priority, kind
 * @param {Array}  params.questions     - question objects with id, requirement_ids, difficulty
 * @param {number} params.daysAvailable - requested number of days
 * @returns {{ days_available, days: Array }}
 */
function buildSchedule({ requirements, questions, daysAvailable }) {
  const N = Math.max(1, Math.min(daysAvailable, 365));

  // Map: reqId → questions
  const reqToQuestions = {};
  for (const req of requirements) {
    reqToQuestions[req.id] = [];
  }
  for (const q of questions) {
    for (const reqId of q.requirement_ids || []) {
      if (reqToQuestions[reqId]) reqToQuestions[reqId].push(q);
    }
  }

  // Sort requirements: must first, then nice; within each group by avg difficulty desc
  const sorted = [...requirements].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'must' ? -1 : 1;
    const avgA = avgDifficulty(reqToQuestions[a.id] || []);
    const avgB = avgDifficulty(reqToQuestions[b.id] || []);
    return avgB - avgA;
  });

  // Collect ordered question ids (deduped)
  const orderedQuestionIds = [];
  const seen = new Set();
  for (const req of sorted) {
    for (const q of (reqToQuestions[req.id] || [])) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        orderedQuestionIds.push(q.id);
      }
    }
  }

  // Add any questions not linked to any requirement at the end
  for (const q of questions) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      orderedQuestionIds.push(q.id);
    }
  }

  // Bin-pack question ids into days
  const questionIdsByDay = Array.from({ length: N }, () => []);
  let dayIndex = 0;

  for (const qid of orderedQuestionIds) {
    if (dayIndex < N - 1 && questionIdsByDay[dayIndex].length >= QUESTIONS_PER_DAY_SOFT_CAP) {
      dayIndex++;
    }
    questionIdsByDay[dayIndex].push(qid);
  }

  // Build day objects
  const dayObjects = questionIdsByDay.map((qids, i) => {
    const dayNum = i + 1;

    // Focus label from first requirement covered on this day
    let focus = 'Review';
    if (qids.length > 0) {
      const firstQ = questions.find((q) => q.id === qids[0]);
      if (firstQ?.category) {
        focus = categoryToFocus(firstQ.category);
      }
      // Override with requirement text if possible
      const firstReq = sorted.find((r) =>
        (reqToQuestions[r.id] || []).some((q) => qids.includes(q.id))
      );
      if (firstReq) focus = summariseFocus(firstReq, sorted, qids, questions);
    }

    const minutes = Math.min(
      Math.max(qids.length * MINUTES_PER_QUESTION, MIN_MINUTES),
      MAX_MINUTES
    );

    return {
      day: dayNum,
      focus,
      question_ids: qids,
      minutes,
    };
  });

  return {
    days_available: N,
    days: dayObjects,
  };
}

function avgDifficulty(questions) {
  if (!questions.length) return 0;
  return questions.reduce((sum, q) => sum + (q.difficulty || 2), 0) / questions.length;
}

function categoryToFocus(category) {
  return (
    {
      technical: 'Technical Skills',
      behavioural: 'Behavioural Competencies',
      'system-design': 'System Design',
      'company-fit': 'Company & Culture Fit',
    }[category] || 'Interview Preparation'
  );
}

function summariseFocus(firstReq, allReqs, dayQids, questions) {
  // Count categories on this day
  const cats = {};
  for (const qid of dayQids) {
    const q = questions.find((q) => q.id === qid);
    if (q?.category) cats[q.category] = (cats[q.category] || 0) + 1;
  }
  const dominant = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
  return dominant ? categoryToFocus(dominant[0]) : 'Interview Preparation';
}

module.exports = { buildSchedule };
