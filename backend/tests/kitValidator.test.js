const { validateKit } = require('../src/utils/kitValidator');

const validKit = {
  source: { company: 'Acme', company_url: 'https://acme.com', role: 'Engineer', location: '', jd_chars: 500, researched_at: '2026-09-08T00:00:00Z', pages_used: [] },
  company_brief: { summary: 'Acme builds things', what_they_do: 'They build software', sources: [] },
  role: {
    title: 'Software Engineer',
    seniority: 'senior',
    responsibilities: ['Build features'],
    requirements: [
      { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Communication', kind: 'behavioural', priority: 'nice' },
    ],
  },
  questions: [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Q?', answer_outline: 'A', difficulty: 2 },
    { id: 'q2', requirement_ids: ['r2'], category: 'behavioural', prompt: 'Q?', answer_outline: 'A', difficulty: 1 },
  ],
  flashcards: [
    { id: 'f1', front: 'What is React?', back: 'A UI library', requirement_ids: ['r1'] },
  ],
  schedule: {
    days_available: 2,
    days: [
      { day: 1, focus: 'technical', question_ids: ['q1'], minutes: 30 },
      { day: 2, focus: 'behavioural', question_ids: ['q2'], minutes: 20 },
    ],
  },
  coverage: { uncovered_requirement_ids: [], passes: 1 },
};

describe('validateKit', () => {
  test('valid kit passes validation', () => {
    const result = validateKit(validKit);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing source fails validation', () => {
    const kit = { ...validKit, source: undefined };
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('source'))).toBe(true);
  });

  test('invalid question category fails', () => {
    const kit = {
      ...validKit,
      questions: [{ ...validKit.questions[0], category: 'invalid-cat' }],
    };
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('category'))).toBe(true);
  });

  test('float minutes fails validation', () => {
    const kit = {
      ...validKit,
      schedule: {
        days_available: 2,
        days: [
          { day: 1, focus: 'technical', question_ids: ['q1'], minutes: 30.5 },
          { day: 2, focus: 'behavioural', question_ids: ['q2'], minutes: 20 },
        ],
      },
    };
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  test('schedule referencing unknown question_id fails', () => {
    const kit = {
      ...validKit,
      schedule: {
        days_available: 1,
        days: [{ day: 1, focus: 'test', question_ids: ['q999'], minutes: 30 }],
      },
    };
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('q999'))).toBe(true);
  });

  test('day count mismatch fails', () => {
    const kit = {
      ...validKit,
      schedule: {
        days_available: 5,
        days: [{ day: 1, focus: 'test', question_ids: ['q1'], minutes: 30 }],
      },
    };
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  test('invalid requirement kind fails', () => {
    const kit = {
      ...validKit,
      role: {
        ...validKit.role,
        requirements: [{ id: 'r1', text: 'React', kind: 'unknown', priority: 'must' }],
      },
    };
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });
});
