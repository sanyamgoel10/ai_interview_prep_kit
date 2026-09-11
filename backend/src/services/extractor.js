const { callLLM } = require('./llm');
const { v4: uuidv4 } = require('uuid');

async function extractRequirements(jd) {
  const prompt = `You are a precise job requirements extractor. Analyze this job description and extract structured requirements.

RULES:
- Only extract requirements explicitly stated in the JD. Do NOT invent or infer requirements not mentioned.
- Classify kind: "technical" (tools, languages, frameworks, systems), "behavioural" (soft skills, leadership, communication), "domain" (industry knowledge, business domain)
- Classify priority: "must" ONLY if the JD uses words like "required", "must have", "essential", "you will need", "minimum", "mandatory". Use "nice" for "preferred", "bonus", "nice to have", "plus", "ideally", "experience with".
- If the JD is very short or vague, extract only what is actually there. A thin JD produces few requirements.
- Extract responsibilities separately.

Job Description:
${jd.slice(0, 6000)}

Respond with valid JSON only:
{
  "title": "inferred job title",
  "seniority": "junior|mid|senior|lead|principal or empty string",
  "location": "location if mentioned or empty string",
  "responsibilities": ["responsibility 1", "responsibility 2"],
  "requirements": [
    { "text": "requirement text", "kind": "technical|behavioural|domain", "priority": "must|nice" }
  ]
}`;

  const result = await callLLM(prompt);

  // Assign stable IDs
  const requirements = (result.requirements || []).map((r, i) => ({
    id: `r${i + 1}`,
    text: r.text,
    kind: r.kind || 'technical',
    priority: r.priority || 'nice',
  }));

  return {
    title: result.title || 'Software Engineer',
    seniority: result.seniority || '',
    location: result.location || '',
    responsibilities: result.responsibilities || [],
    requirements,
  };
}

async function generateCompanyBrief(companyInfo, hiringInfo, companyName, companyUrl, publicDiscussion) {
  const prompt = `You are writing a concise company brief for an interview candidate.
Based ONLY on the information provided below, write a brief about this company.
If information is missing or not found, say so honestly — do NOT fabricate information.

Company: ${companyName}
URL: ${companyUrl}

Company website content:
${companyInfo.slice(0, 3000) || 'No company information could be retrieved.'}

Hiring/culture page content:
${hiringInfo.slice(0, 2000) || 'No hiring page found.'}

Public discussion about their interview process:
${publicDiscussion.slice(0, 2000) || 'No public discussion found.'}

Respond with valid JSON only:
{
  "summary": "2-3 sentence summary of what the company does and their scale/stage",
  "what_they_do": "paragraph describing their product/service and business model",
  "interview_process": "what is known about their interview process, or 'No public information found about their interview process' if nothing is known"
}`;

  const result = await callLLM(prompt);
  return {
    summary: result.summary || 'Company information could not be retrieved.',
    what_they_do: result.what_they_do || 'No company information available.',
    interview_process: result.interview_process || 'No public information found about their interview process.',
  };
}

module.exports = { extractRequirements, generateCompanyBrief };
