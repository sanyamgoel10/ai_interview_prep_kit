/**
 * Deterministic schedule allocation — never delegated to LLM.
 * Distributes questions across exactly the requested number of days.
 * Harder and higher-priority material lands earlier.
 */
function allocateSchedule(questions, requirements, daysAvailable) {
  if (!daysAvailable || daysAvailable < 1) daysAvailable = 1;

  // Sort questions: must-have first, then by difficulty descending
  const reqPriority = {};
  requirements.forEach(r => { reqPriority[r.id] = r.priority === 'must' ? 2 : 1; });

  const sorted = [...questions].sort((a, b) => {
    const aPriority = Math.max(...(a.requirement_ids || []).map(id => reqPriority[id] || 0), 0);
    const bPriority = Math.max(...(b.requirement_ids || []).map(id => reqPriority[id] || 0), 0);
    if (bPriority !== aPriority) return bPriority - aPriority;
    return (b.difficulty || 1) - (a.difficulty || 1);
  });

  const days = [];
  const questionsPerDay = Math.ceil(sorted.length / daysAvailable);
  const MINUTES_PER_QUESTION = 15;

  for (let d = 0; d < daysAvailable; d++) {
    const dayQuestions = sorted.slice(d * questionsPerDay, (d + 1) * questionsPerDay);
    const questionIds = dayQuestions.map(q => q.id);

    // Derive a focus label from the questions in this day
    const categories = [...new Set(dayQuestions.map(q => q.category).filter(Boolean))];
    const focus = categories.length > 0 ? categories.join(' + ') : 'General review';

    const minutes = Math.max(questionIds.length * MINUTES_PER_QUESTION, questionIds.length > 0 ? 15 : 15);

    days.push({
      day: d + 1,
      focus,
      question_ids: questionIds,
      minutes: Math.round(minutes), // always integer
    });
  }

  // Edge case: if some days ended up empty (fewer questions than days), give them a review focus
  for (let i = 0; i < days.length; i++) {
    if (days[i].question_ids.length === 0) {
      days[i].focus = 'Review and self-assessment';
      days[i].minutes = 30;
    }
  }

  return {
    days_available: daysAvailable,
    days,
  };
}

module.exports = { allocateSchedule };
