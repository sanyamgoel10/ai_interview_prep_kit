const { crawlCompanySite } = require('./crawler');
const { researchPublicDiscussion } = require('./researcher');
const { extractRequirements, generateCompanyBrief } = require('./extractor');
const {
  generateQuestionsForRequirement,
  generateSystemDesignQuestions,
  generateCompanyFitQuestion,
  generateFlashcards,
  generateQuestionsForGaps,
} = require('./generator');
const { checkCoverage, allMustHavesCovered } = require('./coverage');
const { allocateSchedule } = require('./scheduler');
const { validateKit } = require('../utils/kitValidator');
const { validateExternalUrl } = require('../utils/urlValidator');

const MAX_COVERAGE_PASSES = 3;

async function runPipeline(input, emit) {
  const { jd, company_url, days } = input;

  emit?.({ step: 'start', message: 'Starting pipeline...' });

  // ── Step 1: Validate company URL ──────────────────────────────────────────
  const urlCheck = validateExternalUrl(company_url);
  const companyUrlValid = urlCheck.valid;
  let crawlResult = { companyInfo: '', hiringInfo: '', pagesUsed: [], hiringPageFound: false, error: null };

  if (!companyUrlValid) {
    emit?.({ step: 'crawl', message: `Company URL invalid: ${urlCheck.reason} — continuing without company data` });
    crawlResult.error = urlCheck.reason;
  } else {
    // ── Step 2: Crawl company site ─────────────────────────────────────────
    emit?.({ step: 'crawl', message: 'Crawling company website...' });
    crawlResult = await crawlCompanySite(company_url, msg => emit?.({ step: 'crawl', message: msg }));
    if (crawlResult.error) {
      emit?.({ step: 'crawl', message: `Warning: ${crawlResult.error} — continuing without company data` });
    }
  }

  // ── Step 3: Extract company name from URL ──────────────────────────────────
  let companyName = 'the company';
  try {
    const parsed = new URL(company_url);
    companyName = parsed.hostname.replace(/^www\./, '').split('.')[0];
    companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
  } catch {}

  // ── Step 4: Search public discussion ──────────────────────────────────────
  emit?.({ step: 'research', message: 'Searching public discussion...' });
  const discussion = await researchPublicDiscussion(
    companyName,
    msg => emit?.({ step: 'research', message: msg })
  );

  // ── Step 5: Extract requirements from JD ──────────────────────────────────
  emit?.({ step: 'extract', message: 'Extracting requirements from job description...' });
  const roleData = await extractRequirements(jd);
  emit?.({ step: 'extract', message: `Found ${roleData.requirements.length} requirements (${roleData.requirements.filter(r => r.priority === 'must').length} must-have)` });

  // ── Step 6: Generate company brief ────────────────────────────────────────
  emit?.({ step: 'brief', message: 'Generating company brief...' });
  const companyBrief = await generateCompanyBrief(
    crawlResult.companyInfo,
    crawlResult.hiringInfo,
    companyName,
    company_url,
    discussion.summary
  );

  // ── Step 7: Generate questions per requirement/category ───────────────────
  emit?.({ step: 'questions', message: 'Generating questions...' });
  let questions = [];
  let questionIndex = 0;

  // Generate questions for each requirement (technical and behavioural separately)
  for (const req of roleData.requirements) {
    const qs = await generateQuestionsForRequirement(
      req,
      crawlResult.companyInfo,
      crawlResult.hiringInfo,
      questionIndex
    );
    questions.push(...qs);
    questionIndex += qs.length;
  }

  // Add system-design questions for technical must-haves
  const systemDesignQs = await generateSystemDesignQuestions(
    roleData.requirements,
    crawlResult.companyInfo,
    questionIndex
  );
  questions.push(...systemDesignQs);
  questionIndex += systemDesignQs.length;

  // Add a company-fit question
  const companyFitQs = await generateCompanyFitQuestion(companyBrief, roleData.requirements, questionIndex);
  questions.push(...companyFitQs);
  questionIndex += companyFitQs.length;

  // ── Step 8: Coverage loop (deterministic check + LLM gap fill) ────────────
  emit?.({ step: 'coverage', message: 'Checking coverage...' });
  let coverageResult = checkCoverage(roleData.requirements, questions);
  let passes = 1;

  while (!allMustHavesCovered(roleData.requirements, questions) && passes < MAX_COVERAGE_PASSES) {
    const gapReqs = coverageResult.uncoveredMustHaves;
    if (gapReqs.length === 0) break;

    emit?.({ step: 'coverage', message: `Pass ${passes}: ${gapReqs.length} must-have requirement(s) uncovered — filling gaps...` });

    const gapQuestions = await generateQuestionsForGaps(
      gapReqs,
      crawlResult.companyInfo,
      crawlResult.hiringInfo,
      questionIndex
    );
    questions.push(...gapQuestions);
    questionIndex += gapQuestions.length;

    coverageResult = checkCoverage(roleData.requirements, questions);
    passes++;
  }

  coverageResult.passes = passes;
  emit?.({ step: 'coverage', message: `Coverage complete after ${passes} pass(es). Uncovered: ${coverageResult.uncovered_requirement_ids.length}` });

  // ── Step 9: Generate flashcards ───────────────────────────────────────────
  emit?.({ step: 'flashcards', message: 'Generating flashcards...' });
  const flashcards = await generateFlashcards(roleData.requirements, questions, 0);

  // ── Step 10: Allocate schedule (deterministic) ────────────────────────────
  emit?.({ step: 'schedule', message: `Allocating ${days}-day study schedule...` });
  const schedule = allocateSchedule(questions, roleData.requirements, days);

  // ── Step 11: Assemble kit ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  const kit = {
    source: {
      company: companyName,
      company_url,
      role: roleData.title,
      location: roleData.location,
      jd_chars: jd.length,
      researched_at: now,
      pages_used: crawlResult.pagesUsed,
    },
    company_brief: {
      ...companyBrief,
      sources: crawlResult.pagesUsed,
      _state: 'generated',
    },
    role: {
      title: roleData.title,
      seniority: roleData.seniority,
      responsibilities: roleData.responsibilities,
      requirements: roleData.requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: coverageResult.uncovered_requirement_ids,
      passes: coverageResult.passes,
    },
  };

  // ── Step 12: Validate kit structure ──────────────────────────────────────
  emit?.({ step: 'validate', message: 'Validating kit structure...' });
  const validation = validateKit(kit);
  if (!validation.valid) {
    console.warn('Kit validation warnings:', validation.errors);
  }

  emit?.({ step: 'done', message: 'Kit generation complete!' });
  return kit;
}

module.exports = { runPipeline };
