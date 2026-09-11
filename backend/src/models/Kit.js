const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  id: String,
  text: String,
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'] },
  priority: { type: String, enum: ['must', 'nice'] },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  id: String,
  requirement_ids: [String],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'] },
  prompt: String,
  answer_outline: String,
  difficulty: { type: Number, min: 1, max: 3 },
  _state: { type: String, enum: ['generated', 'edited', 'pinned'], default: 'generated' },
}, { _id: false });

const flashcardSchema = new mongoose.Schema({
  id: String,
  front: String,
  back: String,
  requirement_ids: [String],
  _state: { type: String, enum: ['generated', 'edited', 'pinned'], default: 'generated' },
  confidence: { type: Number, default: 0 },
  practiceCount: { type: Number, default: 0 },
  lastPracticed: Date,
}, { _id: false });

const daySchema = new mongoose.Schema({
  day: Number,
  focus: String,
  question_ids: [String],
  minutes: Number,
}, { _id: false });

const kitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'generating', 'done', 'failed'], default: 'pending' },
  error: { type: String, default: null },
  source: {
    company: String,
    company_url: String,
    role: String,
    location: String,
    jd_chars: Number,
    researched_at: String,
    pages_used: [String],
  },
  company_brief: {
    summary: String,
    what_they_do: String,
    sources: [String],
    _state: { type: String, enum: ['generated', 'edited', 'pinned'], default: 'generated' },
  },
  role: {
    title: String,
    seniority: String,
    responsibilities: [String],
    requirements: [requirementSchema],
  },
  questions: [questionSchema],
  flashcards: [flashcardSchema],
  schedule: {
    days_available: Number,
    days: [daySchema],
    _state: { type: String, enum: ['generated', 'edited', 'pinned'], default: 'generated' },
  },
  coverage: {
    uncovered_requirement_ids: [String],
    passes: Number,
  },
  jd: String,
  days: Number,
  progressLog: [String],
}, { timestamps: true });

module.exports = mongoose.model('Kit', kitSchema);
