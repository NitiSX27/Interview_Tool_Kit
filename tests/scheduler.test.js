/**
 * scheduler.test.js — Unit tests for the schedule allocation algorithm
 */

const { buildSchedule } = require('../backend/src/services/scheduler');

// Helpers
function makeReq(id, priority = 'must', kind = 'technical') {
  return { id, text: `Requirement ${id}`, kind, priority };
}

function makeQ(id, reqIds, category = 'technical', difficulty = 2) {
  return { id, requirement_ids: reqIds, category, prompt: `Q ${id}`, answer_outline: 'outline', difficulty };
}

describe('buildSchedule', () => {
  test('number of days equals daysAvailable', () => {
    const reqs = [makeReq('r1'), makeReq('r2')];
    const qs = [makeQ('q1', ['r1']), makeQ('q2', ['r2'])];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 5 });
    expect(result.days.length).toBe(5);
    expect(result.days_available).toBe(5);
  });

  test('all must-have requirements appear in schedule', () => {
    const reqs = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'nice')];
    const qs = [makeQ('q1', ['r1']), makeQ('q2', ['r2']), makeQ('q3', ['r3'])];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 3 });

    const scheduledQIds = new Set(result.days.flatMap((d) => d.question_ids));
    expect(scheduledQIds.has('q1')).toBe(true); // covers r1 (must)
    expect(scheduledQIds.has('q2')).toBe(true); // covers r2 (must)
  });

  test('1-day schedule works', () => {
    const reqs = [makeReq('r1'), makeReq('r2'), makeReq('r3')];
    const qs = [makeQ('q1', ['r1']), makeQ('q2', ['r2']), makeQ('q3', ['r3'])];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 1 });
    expect(result.days.length).toBe(1);
    expect(result.days[0].question_ids.length).toBeGreaterThan(0);
  });

  test('60-day schedule works and days are exactly 60', () => {
    const reqs = [makeReq('r1'), makeReq('r2')];
    const qs = [makeQ('q1', ['r1']), makeQ('q2', ['r2'])];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 60 });
    expect(result.days.length).toBe(60);
  });

  test('minutes is an integer', () => {
    const reqs = [makeReq('r1')];
    const qs = [makeQ('q1', ['r1'])];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 3 });
    for (const day of result.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  test('must-haves land on earlier days than nice-to-haves', () => {
    const reqs = [
      makeReq('r1', 'must'),
      makeReq('r2', 'must'),
      makeReq('r3', 'nice'),
      makeReq('r4', 'nice'),
    ];
    const qs = [
      makeQ('q1', ['r1'], 'technical', 3),
      makeQ('q2', ['r2'], 'technical', 3),
      makeQ('q3', ['r3'], 'technical', 1),
      makeQ('q4', ['r4'], 'technical', 1),
    ];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 4 });

    // Day 1 should contain q1 or q2 (must-haves), not q3/q4 alone
    const day1Ids = result.days[0].question_ids;
    const hasMusts = day1Ids.some((id) => ['q1', 'q2'].includes(id));
    expect(hasMusts).toBe(true);
  });

  test('every question_id in days references an actual question', () => {
    const reqs = [makeReq('r1')];
    const qs = [makeQ('q1', ['r1']), makeQ('q2', ['r1'])];
    const result = buildSchedule({ requirements: reqs, questions: qs, daysAvailable: 2 });

    const validIds = new Set(qs.map((q) => q.id));
    for (const day of result.days) {
      for (const qid of day.question_ids) {
        expect(validIds.has(qid)).toBe(true);
      }
    }
  });

  test('empty questions produces valid empty days structure', () => {
    const reqs = [makeReq('r1')];
    const result = buildSchedule({ requirements: reqs, questions: [], daysAvailable: 3 });
    expect(result.days.length).toBe(3);
  });
});
