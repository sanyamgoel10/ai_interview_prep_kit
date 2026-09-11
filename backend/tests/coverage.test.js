const { checkCoverage, allMustHavesCovered } = require('../src/services/coverage');

const requirements = [
  { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Node.js', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'Communication', kind: 'behavioural', priority: 'nice' },
  { id: 'r4', text: 'AWS', kind: 'technical', priority: 'nice' },
];

describe('checkCoverage', () => {
  test('detects fully covered requirements', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'] },
      { id: 'q2', requirement_ids: ['r2'] },
      { id: 'q3', requirement_ids: ['r3'] },
      { id: 'q4', requirement_ids: ['r4'] },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.uncovered_requirement_ids).toHaveLength(0);
    expect(result.uncoveredMustHaves).toHaveLength(0);
  });

  test('identifies uncovered must-haves', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'] },
      // r2 not covered
      { id: 'q3', requirement_ids: ['r3'] },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.uncovered_requirement_ids).toContain('r2');
    expect(result.uncoveredMustHaves.map(r => r.id)).toContain('r2');
  });

  test('question covering multiple requirements counts for all', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1', 'r2', 'r3', 'r4'] },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.uncovered_requirement_ids).toHaveLength(0);
  });

  test('empty questions leaves all uncovered', () => {
    const result = checkCoverage(requirements, []);
    expect(result.uncovered_requirement_ids).toHaveLength(4);
    expect(result.uncoveredMustHaves).toHaveLength(2);
  });
});

describe('allMustHavesCovered', () => {
  test('returns true when all must-haves have questions', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'] },
      { id: 'q2', requirement_ids: ['r2'] },
    ];
    expect(allMustHavesCovered(requirements, questions)).toBe(true);
  });

  test('returns false when a must-have is missing', () => {
    const questions = [
      { id: 'q1', requirement_ids: ['r1'] },
    ];
    expect(allMustHavesCovered(requirements, questions)).toBe(false);
  });

  test('returns true when there are no must-haves', () => {
    const reqs = [{ id: 'r1', priority: 'nice' }];
    expect(allMustHavesCovered(reqs, [])).toBe(true);
  });
});
