const express = require('express');
const Kit = require('../models/Kit');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List all kits for the authenticated user
router.get('/', async (req, res) => {
  try {
    const kits = await Kit.find({ userId: req.userId })
      .select('source status createdAt updatedAt error coverage')
      .sort('-createdAt');
    res.json(kits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single kit
router.get('/:id', async (req, res) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    res.json(kit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a kit
router.delete('/:id', async (req, res) => {
  try {
    const kit = await Kit.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update kit (builder edits)
router.patch('/:id', async (req, res) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, userId: req.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    const allowed = ['company_brief', 'role', 'questions', 'flashcards', 'schedule'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    Object.assign(kit, update);
    await kit.save();
    res.json(kit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update flashcard confidence (practice mode)
router.patch('/:id/flashcards/:cardId/confidence', async (req, res) => {
  try {
    const { confidence } = req.body;
    if (typeof confidence !== 'number' || confidence < 1 || confidence > 3) {
      return res.status(400).json({ error: 'confidence must be 1, 2, or 3' });
    }

    const kit = await Kit.findOne({ _id: req.params.id, userId: req.userId });
    if (!kit) return res.status(404).json({ error: 'Kit not found' });

    const card = kit.flashcards.find(f => f.id === req.params.cardId);
    if (!card) return res.status(404).json({ error: 'Flashcard not found' });

    card.confidence = confidence;
    card.practiceCount = (card.practiceCount || 0) + 1;
    card.lastPracticed = new Date();
    kit.markModified('flashcards');
    await kit.save();
    res.json({ id: card.id, confidence: card.confidence, practiceCount: card.practiceCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
