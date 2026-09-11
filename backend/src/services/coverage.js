/**
 * Deterministic coverage check — never delegated to LLM.
 * Returns uncovered requirement IDs and which must-haves are missing.
 */
function checkCoverage(requirements, questions) {
  const coveredIds = new Set(questions.flatMap(q => q.requirement_ids || []));

  const uncovered = requirements.filter(r => !coveredIds.has(r.id));
  const uncoveredMustHaves = uncovered.filter(r => r.priority === 'must');

  return {
    uncovered_requirement_ids: uncovered.map(r => r.id),
    uncoveredMustHaves,
    passes: 0,
  };
}

function allMustHavesCovered(requirements, questions) {
  const coveredIds = new Set(questions.flatMap(q => q.requirement_ids || []));
  return requirements
    .filter(r => r.priority === 'must')
    .every(r => coveredIds.has(r.id));
}

module.exports = { checkCoverage, allMustHavesCovered };
