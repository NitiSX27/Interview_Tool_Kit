/**
 * coverage.test.js — Unit tests for the coverage check algorithm
 */

const { checkCoverage } = require('../backend/src/services/coverage');

function makeReq(id, priority = 'must') {
  return { id, text: `Req ${id}`, kind: 'technical', priority };
}

function makeQ(id, reqIds) {
  return { id, requirement_ids: reqIds, category: 'technical', prompt: 'Q', answer_outline: 'A', difficulty: 2 };
}

describe('checkCoverage', () => {
  test('all covered — no gaps', () => {
    const reqs = [makeReq('r1', 'must'), makeReq('r2', 'must')];
    const qs = [makeQ('q1', ['r1', 'r2'])];
    const { gaps, covered } = checkCoverage(reqs, qs);
    expect(gaps).toEqual([]);
    expect(covered).toContain('r1');
    expect(covered).toContain('r2');
  });

  test('one gap detected', () => {
    const reqs = [makeReq('r1', 'must'), makeReq('r2', 'must')];
    const qs = [makeQ('q1', ['r1'])]; // r2 not covered
    const { gaps } = checkCoverage(reqs, qs);
    expect(gaps).toContain('r2');
    expect(gaps).not.toContain('r1');
  });

  test('nice-to-have requirements are NOT in gaps', () => {
    const reqs = [makeReq('r1', 'must'), makeReq('r2', 'nice')];
    const qs = [makeQ('q1', ['r1'])]; // r2 (nice) not covered
    const { gaps } = checkCoverage(reqs, qs);
    expect(gaps).not.toContain('r2');
  });

  test('empty questions — all musts are gaps', () => {
    const reqs = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'nice')];
    const { gaps } = checkCoverage(reqs, []);
    expect(gaps).toContain('r1');
    expect(gaps).toContain('r2');
    expect(gaps).not.toContain('r3');
  });

  test('empty requirements — no gaps', () => {
    const qs = [makeQ('q1', ['r1'])];
    const { gaps } = checkCoverage([], qs);
    expect(gaps).toEqual([]);
  });

  test('coverage map is correctly populated', () => {
    const reqs = [makeReq('r1', 'must')];
    const qs = [makeQ('q1', ['r1']), makeQ('q2', ['r1'])];
    const { coverageMap } = checkCoverage(reqs, qs);
    expect(coverageMap['r1']).toContain('q1');
    expect(coverageMap['r1']).toContain('q2');
  });

  test('question with unknown requirement ids does not crash', () => {
    const reqs = [makeReq('r1', 'must')];
    const qs = [makeQ('q1', ['r1', 'r99'])]; // r99 doesn't exist
    const { gaps } = checkCoverage(reqs, qs);
    expect(gaps).not.toContain('r1'); // r1 is still covered
  });
});
