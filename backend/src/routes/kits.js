const express = require('express');
const { z } = require('zod');
const Kit = require('../models/Kit');
const { requireAuth } = require('../middleware/auth');
const { runPipeline, hashJD } = require('../services/pipeline');
const { generateQuestionsForCategory, generateFlashcards } = require('../services/generator');
const { generateCompanyBrief } = require('../services/extractor');
const { buildSchedule } = require('../services/scheduler');
const { checkCoverage } = require('../services/coverage');
const { sanitiseURL } = require('../utils/urlSanitise');

const router = express.Router();

// All kit routes require auth
router.use(requireAuth);

// ── GET /api/kits — list user's kits ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const kits = await Kit.find({ userId: req.user.id })
      .select('_id status createdAt updatedAt source.company source.role source.company_url progress errorMessage')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ kits });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/kits/:id — single kit ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    res.json({ kit });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/kits — create a new kit ──────────────────────────────────────
const createSchema = z.object({
  jd: z.string().min(10, 'Job description is too short'),
  companyUrl: z.string().min(3),
  days: z.number().int().min(1).max(365).default(5),
});

router.post('/', async (req, res, next) => {
  try {
    const { jd, companyUrl, days } = createSchema.parse(req.body);

    // Validate URL
    let parsedURL;
    try {
      parsedURL = sanitiseURL(companyUrl);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const jdHash = hashJD(jd, parsedURL.href);

    // Dedup check
    const existing = await Kit.findOne({ userId: req.user.id, jdHash, status: { $in: ['done', 'processing'] } });
    if (existing) {
      return res.status(200).json({ kit: existing, duplicate: true });
    }

    // Create pending kit record
    const kit = await Kit.create({
      userId: req.user.id,
      status: 'pending',
      progress: 0,
      jobDescription: jd,
      jdHash,
      source: { company_url: parsedURL.href, jd_chars: jd.length },
    });

    // Start pipeline in background (don't await — SSE route handles progress)
    startPipelineBackground(kit._id.toString(), { jd, companyUrl: parsedURL.href, days });

    res.status(202).json({ kitId: kit._id });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    next(err);
  }
});

// ── GET /api/kits/:id/stream — SSE progress stream ─────────────────────────
router.get('/:id/stream', async (req, res, next) => {
  const kitId = req.params.id;

  // Verify ownership
  const kit = await Kit.findOne({ _id: kitId, userId: req.user.id });
  if (!kit) return res.status(404).json({ error: 'Kit not found' });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Poll MongoDB for updates every 1.5s until done/error
  const interval = setInterval(async () => {
    try {
      const current = await Kit.findById(kitId)
        .select('status progress errorMessage')
        .lean();
      if (!current) { clearInterval(interval); res.end(); return; }

      send({ status: current.status, progress: current.progress });

      if (current.status === 'done' || current.status === 'error') {
        clearInterval(interval);
        setTimeout(() => res.end(), 500);
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 1500);

  req.on('close', () => clearInterval(interval));
});

// ── PATCH /api/kits/:id — update kit (builder edits) ───────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    const allowed = ['questions', 'flashcards', 'schedule', 'company_brief', 'role', 'questionNotes'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Ensure what_they_do alias is always present for Appendix A compliance
    if (update.company_brief && !update.company_brief.what_they_do) {
      update.company_brief.what_they_do = update.company_brief.about_company || update.company_brief.summary || '';
    }

    Object.assign(kit, update);
    await kit.save();

    res.json({ kit });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/kits/:id/regenerate — regenerate a single section ────────────
router.post('/:id/regenerate', async (req, res, next) => {
  try {
    const { section, category } = req.body;
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    if (kit.status === 'processing') {
      return res.status(409).json({ error: 'Kit is currently being generated' });
    }

    if (section === 'company_brief') {
      const brief = await generateCompanyBrief({
        companyName: kit.source?.company || '',
        jd: kit.jobDescription || '',
        homepageText: '',
        aboutText: '',
        hiringText: '',
        publicDiscussion: '',
        pagesUsed: kit.source?.pages_used || [],
      });
      kit.company_brief = brief;
      await kit.save();
      return res.json({ section: 'company_brief', data: brief });
    }

    if (section === 'questions' && category) {
      // Preserve edited/pinned questions in this category
      const preserved = kit.questions.filter(
        (q) => q.category === category && (q._state === 'edited' || q._state === 'pinned')
      );
      const otherQuestions = kit.questions.filter((q) => q.category !== category);

      const companyBriefContext = [
        kit.company_brief?.summary,
        kit.company_brief?.about_company || kit.company_brief?.what_they_do,
        kit.company_brief?.jd_relevance,
      ].filter(Boolean).join(' ');

      const newQuestions = await generateQuestionsForCategory({
        category,
        requirements: kit.role.requirements,
        roleTitle: kit.role.title,
        companyBrief: companyBriefContext,
        hiringText: '',
        existingIds: [...otherQuestions, ...preserved].map((q) => q.id),
      });

      // Merge: preserved + new generated
      const merged = [...otherQuestions, ...preserved, ...newQuestions];

      // Re-run coverage + rebuild schedule
      const coverage = checkCoverage(kit.role.requirements, merged);
      const schedule = buildSchedule({
        requirements: kit.role.requirements,
        questions: merged,
        daysAvailable: kit.schedule.days_available,
      });

      kit.questions = merged;
      kit.coverage = { uncovered_requirement_ids: coverage.gaps, passes: kit.coverage.passes };
      kit.schedule = schedule;
      await kit.save();

      return res.json({
        section: 'questions',
        category,
        data: { questions: kit.questions, schedule: kit.schedule, coverage: kit.coverage },
      });
    }

    if (section === 'schedule') {
      const schedule = buildSchedule({
        requirements: kit.role.requirements,
        questions: kit.questions,
        daysAvailable: kit.schedule.days_available,
      });
      kit.schedule = schedule;
      await kit.save();
      return res.json({ section: 'schedule', data: schedule });
    }

    if (section === 'flashcards') {
      const preserved = kit.flashcards.filter(
        (f) => f._state === 'edited' || f._state === 'pinned'
      );
      const newFlashcards = await generateFlashcards({
        requirements: kit.role.requirements,
        questions: kit.questions,
        roleTitle: kit.role.title,
      });
      kit.flashcards = [...preserved, ...newFlashcards];
      await kit.save();
      return res.json({ section: 'flashcards', data: kit.flashcards });
    }

    return res.status(400).json({ error: 'Unknown section: ' + section });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/kits/:id — delete a kit ────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Kit.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Kit not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/kits/:id/practice — record a practice session result ──────────
router.post('/:id/practice', async (req, res, next) => {
  try {
    const { flashcardId, confidence } = req.body;
    if (!flashcardId || ![1, 2, 3].includes(confidence)) {
      return res.status(400).json({ error: 'flashcardId and confidence (1-3) required' });
    }

    const kit = await Kit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    kit.practiceHistory.push({ flashcardId, confidence, reviewedAt: new Date() });
    await kit.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/kits/batch — batch upload (multiple JDs) ─────────────────────
router.post('/batch', async (req, res, next) => {
  try {
    const { cases } = req.body;
    if (!Array.isArray(cases)) return res.status(400).json({ error: 'cases array required' });

    const kitIds = [];
    for (const c of cases.slice(0, 20)) { // cap at 20 per upload
      try {
        const { jd, companyUrl, days } = c;
        const parsedURL = sanitiseURL(companyUrl);
        const jdHash = hashJD(jd, parsedURL.href);

        const existing = await Kit.findOne({ userId: req.user.id, jdHash });
        if (existing) { kitIds.push({ id: c.id, kitId: existing._id, duplicate: true }); continue; }

        const kit = await Kit.create({
          userId: req.user.id,
          status: 'pending',
          progress: 0,
          jobDescription: jd,
          jdHash,
          source: { company_url: parsedURL.href, jd_chars: jd.length },
        });

        startPipelineBackground(kit._id.toString(), { jd, companyUrl: parsedURL.href, days: days || 5 });
        kitIds.push({ id: c.id, kitId: kit._id });
      } catch (err) {
        kitIds.push({ id: c.id, error: err.message });
      }
    }

    res.json({ kits: kitIds });
  } catch (err) {
    next(err);
  }
});

// ── Background pipeline runner ──────────────────────────────────────────────
async function startPipelineBackground(kitId, input) {
  // Update status to processing
  await Kit.findByIdAndUpdate(kitId, { status: 'processing', progress: 0 });

  try {
    const kitData = await runPipeline(input, async (step, msg, pct) => {
      await Kit.findByIdAndUpdate(kitId, { progress: pct || 0 }).catch(() => {});
    });

    // Strip internal _meta before saving
    const { _meta, ...kitFields } = kitData;

    await Kit.findByIdAndUpdate(kitId, {
      status: 'done',
      progress: 100,
      ...kitFields,
      jdHash: kitFields.coverage ? _meta?.jdHash : undefined,
    });
  } catch (err) {
    console.error('[PIPELINE ERROR]', kitId, err.message);
    await Kit.findByIdAndUpdate(kitId, {
      status: 'error',
      errorMessage: err.message,
      progress: 0,
    });
  }
}

module.exports = router;
