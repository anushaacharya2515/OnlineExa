import mongoose from "mongoose";

const PairSchema = new mongoose.Schema(
  { left: String, right: String },
  { _id: false }
);

const IntegerRangeSchema = new mongoose.Schema(
  { min: Number, max: Number },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    type: { type: String, required: true },
    text: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: mongoose.Schema.Types.Mixed },
    passage: { type: String, default: "" },
    pairs: { type: [PairSchema], default: [] },
    matrixRows: { type: [String], default: [] },
    matrixCols: { type: [String], default: [] },
    integerRange: { type: IntegerRangeSchema, default: null },
    assertion: { type: String, default: "" },
    reason: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    audioUrl: { type: String, default: "" },
    explanation: { type: String, default: "" },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", default: null },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
    subTopicId: { type: mongoose.Schema.Types.ObjectId, ref: "SubTopic", default: null },
    subject: { type: String, default: "" },
    topic: { type: String, default: "" },
    difficulty: { type: String, required: true },
    marks: { type: Number, default: 1 },
    generatedByAI: { type: Boolean, default: false },
    createdAt: { type: String },
    updatedAt: { type: String }
  },
  { versionKey: false }
);

export const Question = mongoose.model("Question", QuestionSchema);
