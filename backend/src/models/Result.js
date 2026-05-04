import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    studentId: { type: String, required: true },
    examId: { type: String, required: true },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: String }
  },
  { versionKey: false }
);

export const Result = mongoose.model("Result", ResultSchema);
