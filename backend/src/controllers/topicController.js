import { Topic } from "../models/Topic.js";

function parseIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(",")).map((v) => v.trim()).filter(Boolean);
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

export async function createTopic(req, res) {
  const name = (req.body?.name || "").trim();
  const moduleId = req.body?.moduleId;
  if (!name || !moduleId) return res.status(400).json({ message: "name and moduleId are required" });

  const existing = await Topic.findOne({ moduleId, name: new RegExp(`^${name}$`, "i") }).lean();
  if (existing) return res.status(400).json({ message: "Topic already exists in this module" });

  const created = await Topic.create({ name, moduleId });
  res.status(201).json(created);
}

export async function listTopics(req, res) {
  const moduleIds = parseIdList(req.query.moduleIds || req.query.moduleId);
  const filter = moduleIds.length ? { moduleId: { $in: moduleIds } } : {};
  const topics = await Topic.find(filter).sort({ name: 1 }).lean();
  res.json(topics);
}

export async function deleteTopic(req, res) {
  const deleted = await Topic.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ message: "Topic not found" });
  res.json({ message: "Deleted" });
}
