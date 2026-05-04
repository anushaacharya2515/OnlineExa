import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { Module } from "./models/Module.js";
import { Topic } from "./models/Topic.js";
import { Question } from "./models/Question.js";
import { buildQuestion } from "./services/questionBank.js";

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const next = line[i + 1];
      if (next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  out.push(current);
  return out;
}

function toRowObject(headers, values) {
  const row = {};
  headers.forEach((h, idx) => {
    row[h] = (values[idx] ?? "").trim();
  });
  return row;
}

function toQuestionFromCsv(row) {
  const type = (row.type || "MCQ").toUpperCase();
  const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean);

  let correctAnswer = row.answer || row.correct_answer || "";
  if (type === "MSQ") {
    correctAnswer = correctAnswer
      .split(/[|;]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  if (type === "TRUE_FALSE" && options.length === 0) {
    options.push("True", "False");
  }

  return {
    type,
    text: row.question || row.question_text,
    subject: row.subject,
    topic: row.topic || "General",
    difficulty: row.difficulty || "Easy",
    options,
    correctAnswer,
    marks: Number(row.marks || 1)
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function run() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: node src/importQuestionsCsv.js <csv-file>");
  }

  const absolutePath = path.resolve(process.cwd(), fileArg);
  const csv = await fs.readFile(absolutePath, "utf8");
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must include a header and at least one row");
  }

  await connectDB();

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const moduleCache = new Map();
  const topicCache = new Map();
  let addedCount = 0;
  const errors = [];

  async function resolveModuleByName(name) {
    const key = (name || "").trim().toLowerCase();
    if (!key) return null;
    if (moduleCache.has(key)) return moduleCache.get(key);

    const found = await Module.findOne({ name: new RegExp(`^${escapeRegex(name.trim())}$`, "i") }).lean();
    moduleCache.set(key, found || null);
    return found || null;
  }

  async function resolveTopicByName(moduleId, name) {
    const key = `${moduleId}::${(name || "").trim().toLowerCase()}`;
    if (!moduleId || !name?.trim()) return null;
    if (topicCache.has(key)) return topicCache.get(key);

    const found = await Topic.findOne({
      moduleId,
      name: new RegExp(`^${escapeRegex(name.trim())}$`, "i")
    }).lean();
    topicCache.set(key, found || null);
    return found || null;
  }

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = toRowObject(headers, values);
    const rawQuestion = toQuestionFromCsv(row);
    const moduleDoc = await resolveModuleByName(rawQuestion.subject || "");
    if (!moduleDoc) {
      errors.push(`Row ${i + 1}: Module not found: ${rawQuestion.subject || "(empty)"}`);
      continue;
    }

    const topicDoc = await resolveTopicByName(moduleDoc._id, rawQuestion.topic || "");
    if (!topicDoc) {
      errors.push(`Row ${i + 1}: Topic not found in module "${moduleDoc.name}": ${rawQuestion.topic || "(empty)"}`);
      continue;
    }

    const built = buildQuestion({
      ...rawQuestion,
      moduleId: String(moduleDoc._id),
      topicId: String(topicDoc._id),
      subject: moduleDoc.name,
      topic: topicDoc.name
    });

    if (built.error) {
      errors.push(`Row ${i + 1}: ${built.error}`);
      continue;
    }

    const exists = await Question.findOne({ text: built.text, moduleId: moduleDoc._id, topicId: topicDoc._id }).lean();
    if (exists) {
      errors.push(`Row ${i + 1}: Duplicate question skipped`);
      continue;
    }

    await Question.create(built);
    addedCount += 1;
  }

  console.log(`Imported ${addedCount} questions from ${path.basename(absolutePath)}`);
  if (errors.length) {
    console.log("Issues:");
    errors.forEach((msg) => console.log(`- ${msg}`));
  }
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
