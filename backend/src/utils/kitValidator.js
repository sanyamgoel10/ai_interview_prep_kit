/**
 * Validates a kit against the Appendix A structure.
 * Returns { valid: boolean, errors: string[] }
 */
function validateKit(kit) {
  const errors = [];

  if (!kit.source) errors.push('Missing: source');
  if (!kit.company_brief) errors.push('Missing: company_brief');
  if (!kit.role) errors.push('Missing: role');
  if (!Array.isArray(kit.questions)) errors.push('Missing: questions array');
  if (!Array.isArray(kit.flashcards)) errors.push('Missing: flashcards array');
  if (!kit.schedule) errors.push('Missing: schedule');
  if (!kit.coverage) errors.push('Missing: coverage');

  if (kit.role?.requirements) {
    const reqIds = new Set();
    kit.role.requirements.forEach((r, i) => {
      if (!r.id) errors.push(`requirement[${i}] missing id`);
      if (!['technical', 'behavioural', 'domain'].includes(r.kind)) {
        errors.push(`requirement[${i}] invalid kind: ${r.kind}`);
      }
      if (!['must', 'nice'].includes(r.priority)) {
        errors.push(`requirement[${i}] invalid priority: ${r.priority}`);
      }
      if (r.id) reqIds.add(r.id);
    });

    if (kit.questions) {
      const questionIds = new Set();
      kit.questions.forEach((q, i) => {
        if (!q.id) errors.push(`question[${i}] missing id`);
        if (!['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category)) {
          errors.push(`question[${i}] invalid category: ${q.category}`);
        }
        if (![1, 2, 3].includes(q.difficulty)) {
          errors.push(`question[${i}] invalid difficulty: ${q.difficulty}`);
        }
        if (q.id) questionIds.add(q.id);
      });

      if (kit.schedule?.days) {
        kit.schedule.days.forEach((d, i) => {
          if (typeof d.minutes !== 'number' || !Number.isInteger(d.minutes)) {
            errors.push(`schedule.days[${i}] minutes must be integer`);
          }
          (d.question_ids || []).forEach(qid => {
            if (!questionIds.has(qid)) {
              errors.push(`schedule.days[${i}] references unknown question_id: ${qid}`);
            }
          });
        });

        const scheduledDays = kit.schedule.days.length;
        if (scheduledDays !== kit.schedule.days_available) {
          errors.push(`schedule has ${scheduledDays} days but days_available is ${kit.schedule.days_available}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateKit };
