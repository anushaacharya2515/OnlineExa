import mongoose from "mongoose";

const SubTopicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true }
  },
  { timestamps: true }
);

SubTopicSchema.index({ topicId: 1, name: 1 }, { unique: true });

export const SubTopic = mongoose.model("SubTopic", SubTopicSchema);
