const { allocateSchedule } = require('../src/services/scheduler');

const sampleRequirements = [
  { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Node.js', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'Communication', kind: 'behavioural', priority: 'nice' },
];

const sampleQuestions = [
  { id: 'q1', requirement_ids: ['r1'], category: 'technical', difficulty: 3 },
  { id: 'q2', requirement_ids: ['r1'], category: 'technical', difficulty: 2 },
  { id: 'q3', requirement_ids: ['r2'], category: 'technical', difficulty: 3 },
  { id: 'q4', requirement_ids: ['r2'], category: 'system-design', difficulty: 3 },
  { id: 'q5', requirement_ids: ['r3'], category: 'behavioural', difficulty: 1 },
];

describe('allocateSchedule', () => {
  test('produces exactly the requested number of days', () => {
    const schedule = allocateSchedule(sampleQuestions, sampleRequirements, 5);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);
  });

  test('1-day schedule works', () => {
    const schedule = allocateSchedule(sampleQuestions, sampleRequirements, 1);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    // All question IDs should appear in the single day
    const allIds = schedule.days[0].question_ids;
    sampleQuestions.forEach(q => expect(allIds).toContain(q.id));
  });

  test('60-day schedule works', () => {
    const schedule = allocateSchedule(sampleQuestions, sampleRequirements, 60);
    expect(schedule.days_available).toBe(60);
    expect(schedule.days.length).toBe(60);
  });

  test('all days have integer minutes', () => {
    const schedule = allocateSchedule(sampleQuestions, sampleRequirements, 3);
    schedule.days.forEach(d => {
      expect(Number.isInteger(d.minutes)).toBe(true);
    });
  });

  test('every referenced question_id exists in question set', () => {
    const schedule = allocateSchedule(sampleQuestions, sampleRequirements, 3);
    const questionIds = new Set(sampleQuestions.map(q => q.id));
    schedule.days.forEach(d => {
      d.question_ids.forEach(id => {
        expect(questionIds.has(id)).toBe(true);
      });
    });
  });

  test('higher priority questions appear in earlier days', () => {
    const schedule = allocateSchedule(sampleQuestions, sampleRequirements, 5);
    const firstDayIds = schedule.days[0].question_ids;
    // must-have requirement questions should appear before nice-to-have
    // q5 is nice, so it should not be the only question in day 1 when must-haves exist
    const hasMusts = firstDayIds.some(id => ['q1', 'q2', 'q3', 'q4'].includes(id));
    expect(hasMusts).toBe(true);
  });
});
