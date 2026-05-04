import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    title: { type: String, required: true },
    examName: { type: String },
    subject: { type: String, default: "General" },
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
    questionIds: { type: [String], default: [] },
    published: { type: Boolean, default: true },
    selection: { type: mongoose.Schema.Types.Mixed, default: null },
    selectionRules: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: String },
    updatedAt: { type: String }
  },
  { versionKey: false }
);

export const Exam = mongoose.model("Exam", ExamSchema);
