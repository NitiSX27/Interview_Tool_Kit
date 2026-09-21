const mongoose = require('mongoose');

// ── Sub-schemas ────────────────────────────────────────────────────────────

const requirementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
    priority: { type: String, enum: ['must', 'nice'], required: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    requirement_ids: [String],
    category: {
      type: String,
      enum: ['technical', 'behavioural', 'system-design', 'company-fit'],
      required: true,
    },
    prompt: { type: String, required: true },
    answer_outline: { type: String, required: true },
    difficulty: { type: Number, min: 1, max: 3, required: true },
    // State tracking — generated | edited | pinned
    _state: { type: String, enum: ['generated', 'edited', 'pinned'], default: 'generated' },
  },
  { _id: false }
);

const flashcardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    requirement_ids: [String],
    _state: { type: String, enum: ['generated', 'edited', 'pinned'], default: 'generated' },
  },
  { _id: false }
);

const scheduleDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    focus: { type: String, required: true },
    question_ids: [String],
    minutes: { type: Number, required: true },
    done: { type: Boolean, default: false },
    completedQuestionIds: { type: [String], default: [] }, // task-level progress
  },
  { _id: false }
);

const practiceRecordSchema = new mongoose.Schema(
  {
    flashcardId: { type: String, required: true },
    confidence: { type: Number, min: 1, max: 3, required: true }, // 1=low 2=medium 3=high
    reviewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main Kit schema ────────────────────────────────────────────────────────

const kitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Pipeline status
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'error'],
      default: 'pending',
    },
    errorMessage: String,
    progress: { type: Number, default: 0 }, // 0-100

    // Source info
    source: {
      company: String,
      company_url: String,
      role: String,
      location: String,
      jd_chars: Number,
      researched_at: String,
      pages_used: [String],
    },

    // Company brief — two-part LLM output
    company_brief: {
      summary:          String,  // one-line tagline
      about_company:    String,  // general company overview
      jd_relevance:     String,  // what this JD signals about the team/role
      interview_process: String, // known interview process info
      // Legacy field kept for backward compatibility
      what_they_do:     String,
      sources: [String],
    },

    // Role
    role: {
      title: String,
      seniority: String,
      responsibilities: [String],
      requirements: [requirementSchema],
    },

    // Questions
    questions: [questionSchema],

    // Flashcards
    flashcards: [flashcardSchema],

    // Schedule
    schedule: {
      days_available: Number,
      days: [scheduleDaySchema],
    },

    // Coverage
    coverage: {
      uncovered_requirement_ids: [String],
      passes: Number,
    },

    // Raw JD stored for re-use
    jobDescription: String,

    // Practice history (flashcard confidence ratings)
    practiceHistory: [practiceRecordSchema],

    // Per-question practice notes (inline mock answers)
    questionNotes: {
      type: Map,
      of: String,
      default: {},
    },

    // For dedup detection
    jdHash: String,
  },
  { timestamps: true }
);

// Compound index for dedup
kitSchema.index({ userId: 1, jdHash: 1 });

module.exports = mongoose.model('Kit', kitSchema);
