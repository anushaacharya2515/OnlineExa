import mongoose from "mongoose";

const TopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true }
  },
  { timestamps: true }
);

TopicSchema.index({ moduleId: 1, name: 1 }, { unique: true });

export const Topic = mongoose.model("Topic", TopicSchema);
