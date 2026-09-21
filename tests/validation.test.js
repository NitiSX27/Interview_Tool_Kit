/**
 * validation.test.js — Unit tests for kit structure validation
 */

const { validateKit } = require('../backend/src/utils/kitValidator');

function validKit(overrides = {}) {
  return {
    source: {
      company: 'Acme',
      company_url: 'https://acme.com',
      role: 'Backend Engineer',
      location: 'Remote',
      jd_chars: 500,
      researched_at: '2026-09-01T09:00:00Z',
      pages_used: ['https://acme.com'],
    },
    company_brief: {
      summary: 'Acme builds things.',
      what_they_do: 'They build software.',
      sources: ['https://acme.com'],
    },
    role: {
      title: 'Backend Engineer',
      seniority: 'senior',
      responsibilities: ['Build APIs'],
      requirements: [
        { id: 'r1', text: '5+ years Node.js', kind: 'technical', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Tell me about Node.js',
        answer_outline: 'Event loop, async/await, streams.',
        difficulty: 2,
      },
    ],
    flashcards: [
      { id: 'f1', front: 'What is Node.js?', back: 'A JS runtime.', requirement_ids: ['r1'] },
    ],
    schedule: {
      days_available: 3,
      days: [
        { day: 1, focus: 'Technical Skills', question_ids: ['q1'], minutes: 60 },
        { day: 2, focus: 'Review', question_ids: [], minutes: 30 },
        { day: 3, focus: 'Review', question_ids: [], minutes: 30 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2,
    },
    ...overrides,
  };
}

describe('validateKit', () => {
  test('valid kit passes validation', () => {
    expect(() => validateKit(validKit())).not.toThrow();
  });

  test('missing source throws', () => {
    const kit = validKit();
    delete kit.source;
    expect(() => validateKit(kit)).toThrow();
  });

  test('invalid question category throws', () => {
    const kit = validKit();
    kit.questions[0].category = 'invalid_category';
    expect(() => validateKit(kit)).toThrow();
  });

  test('invalid difficulty throws', () => {
    const kit = validKit();
    kit.questions[0].difficulty = 4; // only 1-3 allowed
    expect(() => validateKit(kit)).toThrow();
  });

  test('float minutes throws', () => {
    const kit = validKit();
    kit.schedule.days[0].minutes = 60.5;
    expect(() => validateKit(kit)).toThrow();
  });

  test('invalid requirement kind throws', () => {
    const kit = validKit();
    kit.role.requirements[0].kind = 'unknown';
    expect(() => validateKit(kit)).toThrow();
  });

  test('invalid requirement priority throws', () => {
    const kit = validKit();
    kit.role.requirements[0].priority = 'maybe';
    expect(() => validateKit(kit)).toThrow();
  });

  test('schedule referencing non-existent question id throws', () => {
    const kit = validKit();
    kit.schedule.days[0].question_ids = ['q999']; // doesn't exist
    expect(() => validateKit(kit)).toThrow(/non-existent question/);
  });

  test('empty questions array is valid', () => {
    const kit = validKit();
    kit.questions = [];
    kit.schedule.days.forEach((d) => (d.question_ids = []));
    expect(() => validateKit(kit)).not.toThrow();
  });

  test('multiple requirements are all validated', () => {
    const kit = validKit();
    kit.role.requirements.push({ id: 'r2', text: 'React', kind: 'technical', priority: 'nice' });
    expect(() => validateKit(kit)).not.toThrow();
  });
});
