import { Module } from "../models/Module.js";

export async function createModule(req, res) {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ message: "name is required" });

  const existing = await Module.findOne({ name: new RegExp(`^${name}$`, "i") }).lean();
  if (existing) return res.status(400).json({ message: "Module already exists" });

  const created = await Module.create({ name });
  res.status(201).json(created);
}

export async function listModules(req, res) {
  const modules = await Module.find().sort({ name: 1 }).lean();
  res.json(modules);
}

export async function deleteModule(req, res) {
  const deleted = await Module.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ message: "Module not found" });
  res.json({ message: "Deleted" });
}
