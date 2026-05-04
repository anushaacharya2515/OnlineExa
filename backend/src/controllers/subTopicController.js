import { SubTopic } from "../models/SubTopic.js";

export async function createSubTopic(req, res) {
  const name = (req.body?.name || "").trim();
  const topicId = req.body?.topicId;
  if (!name || !topicId) return res.status(400).json({ message: "name and topicId are required" });

  const existing = await SubTopic.findOne({ topicId, name: new RegExp(`^${name}$`, "i") }).lean();
  if (existing) return res.status(400).json({ message: "Subtopic already exists in this topic" });

  const created = await SubTopic.create({ name, topicId });
  res.status(201).json(created);
}

export async function listSubTopics(req, res) {
  const { topicId } = req.query;
  const subtopics = await SubTopic.find(topicId ? { topicId } : {}).sort({ name: 1 }).lean();
  res.json(subtopics);
}

export async function deleteSubTopic(req, res) {
  const deleted = await SubTopic.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ message: "Subtopic not found" });
  res.json({ message: "Deleted" });
}
