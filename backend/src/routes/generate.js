const express = require('express');
const Kit = require('../models/Kit');
const { authMiddleware } = require('../middleware/auth');
const { runPipeline } = require('../services/pipeline');
const {
  generateQuestionsForRequirement,
  generateCompanyFitQuestion,
  generateSystemDesignQuestions,
  generateFlashcards,
} = require('../services/generator');
const { generateCompanyBrief } = require('../services/extractor');
const { crawlCompanySite } = require('../services/crawler');
const { allocateSchedule } = require('../services/scheduler');
const { checkCoverage } = require('../services/coverage');

const router = express.Router();
router.use(authMiddleware);

// In-memory set of kitIds with an active pipeline — prevents duplicate runs on SSE reconnect
const activePipelines = new Set();

// Create a new kit and start generation via SSE
router.post('/', async (req, res) => {
  try {
    const { jd, company_url, days } = req.body;
    if (!jd || !company_url || !days) {
      return res.status(400).json({ error: 'jd, company_url, and days are required' });
    }
    if (typeof days !== 'number' || days < 1 || days > 365) {
      return res.status(400).json({ error: 'days must be a number between 1 and 365' });
    }

    // Create kit placeholder
    const kit = await Kit.create({
      userId: req.userId,
      jd,
      days,
      status: 'generating',
      source: { company_url },
    });

    res.json({ kitId: kit._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE stream for kit generation progress
router.get('/:kitId/stream', authMiddleware, async (req, res) => {
  const kitId = req.params.kitId;
  const kit = await Kit.findOne({ _id: kitId, userId: req.userId });
  if (!kit) return res.status(404).json({ error: 'Kit not found' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  // If kit already completed/failed, just report current state and close
  if (kit.status === 'done') {
    send({ step: 'complete', kitId });
    return res.end();
  }
  if (kit.status === 'failed') {
    send({ step: 'error', message: kit.error || 'Generation failed' });
    return res.end();
  }

  // Prevent duplicate pipelines on SSE reconnect
  if (activePipelines.has(kitId)) {
    send({ step: 'info', message: 'Generation already in progress — reconnected' });
    // Keep SSE open so the client gets the completion event when the active pipeline finishes
    req.on('close', () => {});
    return;
  }

  activePipelines.add(kitId);

  try {
    const result = await runPipeline(
      { jd: kit.jd, company_url: kit.source.company_url, days: kit.days },
      (event) => send(event)
    );

    Object.assign(kit, result, { status: 'done' });
    await kit.save();

    send({ step: 'complete', kitId });
  } catch (err) {
    console.error('Pipeline error:', err);
    kit.status = 'failed';
    kit.error = err.message;
    await kit.save();
    send({ step: 'error', message: err.message });
  } finally {
    activePipelines.delete(kitId);
    res.end();
  }
});

// Regenerate a single section (preserves edited/pinned items)
router.post('/:kitId/regenerate/:section', async (req, res) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.kitId, userId: req.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    const { section } = req.params;

    switch (section) {
      case 'company_brief': {
        if (kit.company_brief?._state === 'pinned') {
          return res.json({ message: 'Section is pinned — no changes made' });
        }
        const crawlResult = await crawlCompanySite(kit.source.company_url);
        const newBrief = await generateCompanyBrief(
          crawlResult.companyInfo, crawlResult.hiringInfo,
          kit.source.company, kit.source.company_url, ''
        );
        kit.company_brief = { ...newBrief, sources: crawlResult.pagesUsed, _state: 'generated' };
        break;
      }

      case 'questions_technical':
      case 'questions_behavioural':
      case 'questions_system-design':
      case 'questions_company-fit': {
        const category = section.replace('questions_', '');
        // Preserve edited/pinned questions in this category
        const preserved = kit.questions.filter(
          q => q.category === category && (q._state === 'edited' || q._state === 'pinned')
        );
        const preserved_other = kit.questions.filter(q => q.category !== category);
        const reqs = kit.role.requirements.filter(r => {
          if (category === 'technical' || category === 'system-design') return r.kind === 'technical';
          if (category === 'behavioural') return r.kind === 'behavioural';
          return true;
        });

        let newQs = [];
        const startIdx = preserved_other.length + preserved.length;
        for (const req of reqs) {
          const qs = await generateQuestionsForRequirement(req, '', '', startIdx + newQs.length);
          newQs.push(...qs);
        }
        if (category === 'system-design') {
          const sdQs = await generateSystemDesignQuestions(reqs, '', startIdx + newQs.length);
          newQs.push(...sdQs);
        }

        kit.questions = [...preserved_other, ...preserved, ...newQs];
        // Recalculate coverage and schedule
        const coverage = checkCoverage(kit.role.requirements, kit.questions);
        kit.coverage = { ...coverage, passes: kit.coverage.passes };
        kit.schedule = allocateSchedule(kit.questions, kit.role.requirements, kit.days);
        break;
      }

      case 'schedule': {
        if (kit.schedule?._state === 'pinned') {
          return res.json({ message: 'Section is pinned — no changes made' });
        }
        kit.schedule = allocateSchedule(kit.questions, kit.role.requirements, kit.days);
        break;
      }

      case 'flashcards': {
        const preserved = kit.flashcards.filter(f => f._state === 'edited' || f._state === 'pinned');
        const newCards = await generateFlashcards(kit.role.requirements, kit.questions, preserved.length);
        kit.flashcards = [...preserved, ...newCards];
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown section: ${section}` });
    }

    await kit.save();
    res.json(kit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
