const { callLLM } = require('./llm');

function normalizeToString(val) {
  if (Array.isArray(val)) return val.join('\n');
  if (typeof val === 'string') return val;
  return '';
}

const CATEGORY_INSTRUCTIONS = {
  technical: 'Generate a technical question that tests hands-on coding, architecture, or system knowledge. Focus on practical application.',
  behavioural: 'Generate a behavioural question using the STAR format. Focus on past experiences, leadership, communication, or team dynamics.',
  'system-design': 'Generate a system design question that tests ability to design scalable, distributed systems. Ask about architecture decisions.',
  'company-fit': 'Generate a company-fit question that explores alignment with the company\'s values, mission, and culture.',
};

function mapRequirementToCategory(requirement) {
  if (requirement.kind === 'behavioural') return 'behavioural';
  if (requirement.kind === 'technical') {
    // High difficulty technical requirements sometimes warrant system-design
    return 'technical';
  }
  if (requirement.kind === 'domain') return 'technical';
  return 'technical';
}

async function generateQuestionsForRequirement(requirement, companyContext, hiringContext, questionIndex) {
  const category = mapRequirementToCategory(requirement);
  const instruction = CATEGORY_INSTRUCTIONS[category];

  const prompt = `You are an expert interview question generator.

Requirement: "${requirement.text}"
Category: ${category}
Instruction: ${instruction}

Company context: ${companyContext.slice(0, 500)}
${hiringContext ? `Interview process context: ${hiringContext.slice(0, 300)}` : ''}

Generate 1-2 interview questions for this specific requirement.

Respond with valid JSON only:
{
  "questions": [
    {
      "category": "${category}",
      "prompt": "the interview question",
      "answer_outline": "3-5 bullet points outlining what a strong answer should cover",
      "difficulty": 2
    }
  ]
}

difficulty: 1=easy, 2=medium, 3=hard. Base difficulty on seniority implied by the requirement.`;

  const result = await callLLM(prompt);
  const questions = (result.questions || []).slice(0, 2);

  return questions.map((q, i) => ({
    id: `q${questionIndex + i + 1}`,
    requirement_ids: [requirement.id],
    category: q.category || category,
    prompt: q.prompt || '',
    answer_outline: normalizeToString(q.answer_outline),
    difficulty: Math.min(3, Math.max(1, Math.round(q.difficulty || 2))),
    _state: 'generated',
  }));
}

async function generateSystemDesignQuestions(requirements, companyContext, startIndex) {
  const techReqs = requirements.filter(r => r.kind === 'technical' && r.priority === 'must').slice(0, 3);
  if (techReqs.length === 0) return [];

  const prompt = `You are an expert interview question generator.

Generate 1-2 system design questions based on these technical requirements:
${techReqs.map(r => `- ${r.text}`).join('\n')}

Company context: ${companyContext.slice(0, 400)}

Respond with valid JSON only:
{
  "questions": [
    {
      "prompt": "the system design question",
      "answer_outline": "key points: scalability considerations, components to design, trade-offs to discuss",
      "difficulty": 3,
      "requirement_ids": ["r1"]
    }
  ]
}`;

  const result = await callLLM(prompt);
  const questions = (result.questions || []).slice(0, 2);
  const reqIds = techReqs.map(r => r.id);

  return questions.map((q, i) => ({
    id: `q${startIndex + i + 1}`,
    requirement_ids: q.requirement_ids || reqIds,
    category: 'system-design',
    prompt: q.prompt || '',
    answer_outline: normalizeToString(q.answer_outline),
    difficulty: Math.min(3, Math.max(1, Math.round(q.difficulty || 3))),
    _state: 'generated',
  }));
}

async function generateCompanyFitQuestion(companyBrief, requirements, startIndex) {
  const prompt = `Generate 1 company-fit interview question based on what is known about this company.

Company summary: ${companyBrief.summary}
What they do: ${companyBrief.what_they_do}

The question should explore the candidate's alignment with this company's mission and values.

Respond with valid JSON only:
{
  "question": {
    "prompt": "the company-fit question",
    "answer_outline": "what a strong answer should demonstrate"
  }
}`;

  const result = await callLLM(prompt);
  if (!result.question) return [];

  return [{
    id: `q${startIndex + 1}`,
    requirement_ids: [],
    category: 'company-fit',
    prompt: result.question.prompt || '',
    answer_outline: normalizeToString(result.question.answer_outline),
    difficulty: 1,
    _state: 'generated',
  }];
}

async function generateFlashcards(requirements, questions, startIndex) {
  const mustHaveReqs = requirements.filter(r => r.priority === 'must').slice(0, 10);
  if (mustHaveReqs.length === 0) return [];

  const prompt = `Create flashcards for interview preparation.

Requirements to cover:
${mustHaveReqs.map(r => `- [${r.id}] ${r.text}`).join('\n')}

Sample questions for context:
${questions.slice(0, 5).map(q => `Q: ${q.prompt}`).join('\n')}

Create 1 flashcard per requirement. Each flashcard should be a self-contained study card.

Respond with valid JSON only:
{
  "flashcards": [
    {
      "front": "concise question or concept to recall",
      "back": "concise answer or key points (2-3 bullets)",
      "requirement_id": "r1"
    }
  ]
}`;

  const result = await callLLM(prompt);
  const cards = (result.flashcards || []).slice(0, mustHaveReqs.length);

  return cards.map((c, i) => ({
    id: `f${startIndex + i + 1}`,
    front: c.front || '',
    back: normalizeToString(c.back),
    requirement_ids: [c.requirement_id || mustHaveReqs[i]?.id].filter(Boolean),
    _state: 'generated',
    confidence: 0,
    practiceCount: 0,
  }));
}

async function generateQuestionsForGaps(gapRequirements, companyContext, hiringContext, startIndex) {
  const allQuestions = [];
  let idx = startIndex;

  for (const req of gapRequirements) {
    const qs = await generateQuestionsForRequirement(req, companyContext, hiringContext, idx);
    allQuestions.push(...qs);
    idx += qs.length;
  }

  return allQuestions;
}

module.exports = {
  generateQuestionsForRequirement,
  generateSystemDesignQuestions,
  generateCompanyFitQuestion,
  generateFlashcards,
  generateQuestionsForGaps,
};
