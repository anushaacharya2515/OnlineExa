import { buildQuestion } from "../services/questionBank.js";
import { Question } from "../models/Question.js";
import { Exam } from "../models/Exam.js";
import { Module } from "../models/Module.js";
import { Topic } from "../models/Topic.js";

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
  const options = [
    row.option1,
    row.option2,
    row.option3,
    row.option4
  ].filter(Boolean);

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

function parseIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(",")).map((v) => v.trim()).filter(Boolean);
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

function parseNameList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

async function buildQuestionFilter({
  module,
  topic,
  modules = [],
  topics = [],
  difficulty,
  difficulties = [],
  type,
  moduleIds = [],
  topicIds = [],
  subTopicIds = []
}) {
  const normalizedDifficulties = difficulties.length
    ? difficulties
    : parseNameList(difficulty);

  const filter = {
    ...(normalizedDifficulties.length ? { difficulty: { $in: normalizedDifficulties } } : {}),
    ...(type ? { type } : {})
  };
  const groups = [];

  const moduleNamesFromRequest = parseNameList(modules.length ? modules : module);
  if (moduleIds.length || moduleNamesFromRequest.length) {
    const modules = await Module.find({ _id: { $in: moduleIds } }).lean();
    const moduleNames = [...new Set([
      ...modules.map((item) => item.name).filter(Boolean),
      ...moduleNamesFromRequest
    ])];
    const moduleGroup = [];
    if (moduleIds.length) {
      moduleGroup.push({ moduleId: { $in: moduleIds } });
    }
    if (moduleNames.length) {
      moduleGroup.push({ subject: { $in: moduleNames } });
    }
    groups.push({ $or: moduleGroup });
  }

  const topicNamesFromRequest = parseNameList(topics.length ? topics : topic);
  if (topicIds.length || topicNamesFromRequest.length) {
    const topics = await Topic.find({ _id: { $in: topicIds } }).lean();
    const topicNames = [...new Set([
      ...topics.map((item) => item.name).filter(Boolean),
      ...topicNamesFromRequest
    ])];
    const topicGroup = [];
    if (topicIds.length) {
      topicGroup.push({ topicId: { $in: topicIds } });
    }
    if (topicNames.length) {
      topicGroup.push({ topic: { $in: topicNames } });
    }
    groups.push({ $or: topicGroup });
  }

  if (subTopicIds.length) {
    filter.subTopicId = { $in: subTopicIds };
  }

  if (groups.length === 1) {
    Object.assign(filter, groups[0]);
  } else if (groups.length > 1) {
    filter.$and = groups;
  }

  return filter;
}

export function listQuestions(req, res) {
  const { module, topic, difficulty, type, ids } = req.query;
  if (ids) {
    const list = ids.split(",").map((v) => v.trim()).filter(Boolean);
    return Question.find({ id: { $in: list } }).lean().then((questions) => res.json(questions));
  }
  const moduleIds = parseIdList(req.query.moduleIds || req.query.moduleId);
  const topicIds = parseIdList(req.query.topicIds || req.query.topicId);
  const subTopicIds = parseIdList(req.query.subTopicIds || req.query.subTopicId);
  buildQuestionFilter({
    module,
    topic,
    difficulty,
    type,
    moduleIds,
    topicIds,
    subTopicIds
  })
    .then((filter) => Question.find(filter).lean())
    .then((questions) => res.json(questions));
}

export function searchQuestions(req, res) {
  const keyword = (req.query.keyword || "").toString().trim().toLowerCase();
  if (!keyword) return Question.find().lean().then((questions) => res.json(questions));

  Question.find().lean().then((questions) => {
    const result = questions.filter((q) => {
      const hay = `${q.text || ""} ${q.subject || ""} ${q.topic || ""}`.toLowerCase();
      return hay.includes(keyword);
    });
    res.json(result);
  });
}

export function filterQuestions(req, res) {
  const { subject, difficulty, type } = req.query;
  Question.find({
    ...(subject ? { subject } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(type ? { type } : {})
  }).lean().then((result) => res.json(result));
}

export function filterQuestionsAdvanced(req, res) {
  const modules = parseNameList(req.body?.modules);
  const topics = parseNameList(req.body?.topics);
  const difficulties = parseNameList(req.body?.difficulty);
  const moduleIds = parseIdList(req.body?.moduleIds);
  const topicIds = parseIdList(req.body?.topicIds);

  if (!modules.length && !moduleIds.length) {
    return res.status(400).json({ message: "Please select at least one module" });
  }

  buildQuestionFilter({
    modules,
    topics,
    difficulties,
    type: req.body?.type || "",
    moduleIds,
    topicIds
  })
    .then((filter) => Question.find(filter).lean())
    .then((questions) => res.json(questions))
    .catch((err) => res.status(500).json({ message: err.message }));
}

export function createQuestion(req, res) {
  const question = buildQuestion(req.body);
  if (question.error) {
    return res.status(400).json({ message: question.error });
  }
  Question.create(question).then((created) => res.status(201).json(created));
}

export function updateQuestion(req, res) {
  const normalized = {
    ...req.body,
    text: req.body.text ?? req.body.question_text,
    correctAnswer: req.body.correctAnswer ?? req.body.correct_answer,
    subject: req.body.subject ?? req.body.subject_name,
    topic: req.body.topic ?? req.body.topic_name,
    difficulty: req.body.difficulty ?? req.body.level
  };

  Question.findOneAndUpdate(
    { id: req.params.id },
    { ...normalized, updatedAt: new Date().toISOString() },
    { new: true }
  ).then((updated) => {
    if (!updated) return res.status(404).json({ message: "Question not found" });
    res.json(updated);
  });
}

export function deleteQuestion(req, res) {
  Question.deleteOne({ id: req.params.id }).then(async (result) => {
    if (result.deletedCount === 0) return res.status(404).json({ message: "Question not found" });
    await Exam.updateMany({}, { $pull: { questionIds: req.params.id } });
    res.json({ message: "Deleted" });
  });
}

export async function uploadCsv(req, res) {
  const csv = req.body?.csv;
  if (!csv || typeof csv !== "string") {
    return res.status(400).json({ message: "csv content is required" });
  }

  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return res.status(400).json({ message: "CSV must include a header and at least one row" });
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const added = [];
  const errors = [];
  const moduleCache = new Map();
  const topicCache = new Map();

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
    const moduleName = (rawQuestion.subject || "").trim();
    const topicName = (rawQuestion.topic || "").trim();

    const moduleDoc = await resolveModuleByName(moduleName);
    if (!moduleDoc) {
      errors.push({ row: i + 1, message: `Module not found: ${moduleName || "(empty)"}` });
      continue;
    }

    const topicDoc = await resolveTopicByName(moduleDoc._id, topicName);
    if (!topicDoc) {
      errors.push({ row: i + 1, message: `Topic not found in module "${moduleName}": ${topicName || "(empty)"}` });
      continue;
    }

    const question = buildQuestion({
      ...rawQuestion,
      moduleId: String(moduleDoc._id),
      topicId: String(topicDoc._id),
      subject: moduleDoc.name,
      topic: topicDoc.name
    });
    if (question.error) {
      errors.push({ row: i + 1, message: question.error });
      continue;
    }
    added.push(question);
  }

  if (added.length === 0) {
    return res.status(400).json({ added: 0, errors, message: "No valid questions to import" });
  }

  await Question.insertMany(added);
  return res.json({ added: added.length, errors });
}
