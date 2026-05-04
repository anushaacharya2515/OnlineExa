import mongoose from "mongoose";

const AttemptSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    examId: { type: String, required: true },
    studentId: { type: String, required: true },
    questionIds: { type: [String], default: [] },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "in_progress" },
    startedAt: { type: String },
    endAt: { type: String },
    submittedAt: { type: String },
    score: { type: Number, default: null },
    details: { type: [mongoose.Schema.Types.Mixed], default: [] },
    aiGeneratedCount: { type: Number, default: 0 },
    isRetake: { type: Boolean, default: false }
  },
  { versionKey: false }
);

export const Attempt = mongoose.model("Attempt", AttemptSchema);
