import { v4 as uuidv4 } from "uuid";
import { gradeAttempt } from "../services/grading.js";
import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { Result } from "../models/Result.js";
import { Module } from "../models/Module.js";
import { Topic } from "../models/Topic.js";

function parseIdList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(",")).map((v) => v.trim()).filter(Boolean);
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

function normalizeExamBody(body) {
  return {
    examName: body.exam_name ?? body.examName ?? body.title ?? "",
    subject: body.subject ?? "",
    duration: Number(body.duration ?? body.durationMinutes ?? body.duration_minutes ?? 0),
    totalMarks: Number(body.total_marks ?? body.totalMarks ?? 0),
    totalQuestions: Number(body.total_questions ?? body.totalQuestions ?? 0),
    negativeMarking: Boolean(body.negative_marking ?? body.negativeMarking ?? false),
    negativeMarkValue: Number(body.negative_mark_value ?? body.negativeMarkValue ?? 0.25),
    startDate: body.start_date ?? body.startDate ?? null,
    endDate: body.end_date ?? body.endDate ?? null,
    questionIds: Array.isArray(body.questions ?? body.questionIds) ? (body.questions ?? body.questionIds) : []
  };
}

function isWithinWindow(exam) {
  if (!exam.startDate && !exam.endDate) return true;
  const now = Date.now();
  if (exam.startDate && now < new Date(exam.startDate).getTime()) return false;
  if (exam.endDate && now > new Date(exam.endDate).getTime()) return false;
  return true;
}

function selectByRules(data, rules) {
  const { subject, counts = {}, topic } = rules || {};
  const difficulties = Object.entries(counts).filter(([, count]) => Number(count) > 0);
  if (difficulties.length === 0) {
    return { error: "selection rules must include at least one difficulty count" };
  }

  const picked = [];
  for (const [level, countRaw] of difficulties) {
    const count = Number(countRaw);
    const pool = data.questions.filter((q) => {
      if (subject && q.subject !== subject) return false;
      if (topic && q.topic !== topic) return false;
      return q.difficulty === level;
    });
    if (pool.length < count) {
      return { error: `Not enough ${level} questions for the selected rules` };
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    picked.push(...shuffled.slice(0, count).map((q) => q.id));
  }

  return { questionIds: picked };
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

async function buildQuestionPoolFilter({ subject, topic, moduleIds = [], topicIds = [], subTopicId, difficulty }) {
  const filter = { difficulty };
  const clauses = [];

  if (moduleIds.length) {
    clauses.push({ moduleId: { $in: moduleIds } });
    const modules = await Module.find({ _id: { $in: moduleIds } }).lean();
    const moduleNames = modules.map((item) => item.name).filter(Boolean);
    if (moduleNames.length) {
      clauses.push({ subject: { $in: moduleNames } });
    }
  } else if (subject) {
    filter.subject = subject;
  }

  if (topicIds.length) {
    clauses.push({ topicId: { $in: topicIds } });
    const topics = await Topic.find({ _id: { $in: topicIds } }).lean();
    const topicNames = topics.map((item) => item.name).filter(Boolean);
    if (topicNames.length) {
      clauses.push({ topic: { $in: topicNames } });
    }
  } else if (topic) {
    filter.topic = topic;
  }

  if (subTopicId) {
    filter.subTopicId = subTopicId;
  }

  if (clauses.length === 1) {
    Object.assign(filter, clauses[0]);
  } else if (clauses.length > 1) {
    filter.$and = [
      {
        $or: clauses.filter((clause) => "moduleId" in clause || "subject" in clause)
      },
      {
        $or: clauses.filter((clause) => "topicId" in clause || "topic" in clause)
      }
    ].filter((group) => group.$or.length);
  }

  return filter;
}

async function pickQuestionsByCounts({ subject, topic, counts, moduleIds = [], topicIds = [], subTopicId }) {
  const difficulties = Object.entries(counts || {}).filter(([, count]) => Number(count) > 0);
  if (difficulties.length === 0) {
    return { error: "selection rules must include at least one difficulty count" };
  }

  const picked = [];
  for (const [level, countRaw] of difficulties) {
    const count = Number(countRaw);
    const filter = await buildQuestionPoolFilter({
      subject,
      topic,
      moduleIds,
      topicIds,
      subTopicId,
      difficulty: level
    });
    const pool = await Question.find(filter).lean();

    if (pool.length < count) {
      return { error: `Not enough ${level} questions for the selected rules` };
    }

    picked.push(...shuffle(pool).slice(0, count));
  }

  const unique = new Map(picked.map((q) => [q.id, q]));
  return { questions: shuffle([...unique.values()]) };
}

export async function autoGenerateExam(req, res) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  const {
    name,
    duration,
    module,
    topic,
    moduleId,
    topicId,
    moduleIds = [],
    topicIds = [],
    subTopicId,
    easyCount = 0,
    mediumCount = 0,
    hardCount = 0,
    negativeMarking = false,
    negativeMarkValue = 0.25,
    preview = false,
    startDate = null,
    endDate = null
  } = req.body;

  if (!duration) {
    return res.status(400).json({ message: "duration is required" });
  }

  if (!preview && !name) {
    return res.status(400).json({ message: "name is required" });
  }

  const counts = { Easy: Number(easyCount), Medium: Number(mediumCount), Hard: Number(hardCount) };
  const resolvedModuleIds = parseIdList(moduleIds.length ? moduleIds : moduleId);
  const resolvedTopicIds = parseIdList(topicIds.length ? topicIds : topicId);
  const pick = await pickQuestionsByCounts({
    subject: module,
    topic,
    counts,
    moduleIds: resolvedModuleIds,
    topicIds: resolvedTopicIds,
    subTopicId
  });
  if (pick.error) return res.status(400).json({ message: pick.error });

  const questionIds = pick.questions.map((q) => q.id);
  const totalMarks = pick.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  if (preview) {
    return res.json({
      questions: pick.questions,
      questionIds,
      totalMarks,
      totalQuestions: questionIds.length
    });
  }

  const exam = {
    id: uuidv4(),
    title: name,
    examName: name,
    subject: module || (
      resolvedModuleIds.length === 1
        ? (await Module.findById(resolvedModuleIds[0]).lean())?.name
        : resolvedModuleIds.length > 1
          ? "Mixed Modules"
          : "General"
    ) || "General",
    durationMinutes: Number(duration),
    totalMarks,
    totalQuestions: questionIds.length,
    startDate,
    endDate,
    questionIds,
    published: true,
    negativeMarking: Boolean(negativeMarking),
    negativeMarkValue: Number(negativeMarkValue || 0.25),
    selectionRules: { subject: module, topic, moduleIds: resolvedModuleIds, topicIds: resolvedTopicIds, subTopicId, counts },
    createdAt: new Date().toISOString()
  };

  Exam.create(exam).then((created) => res.status(201).json(created));
}

export async function manualCreateExam(req, res) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

  const {
    name,
    duration,
    selectedQuestions = [],
    negativeMarking = false,
    negativeMarkValue = 0.25,
    startDate = null,
    endDate = null
  } = req.body;

  if (!name || !duration) {
    return res.status(400).json({ message: "name and duration are required" });
  }

  if (!Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
    return res.status(400).json({ message: "selectedQuestions must include at least one question" });
  }

  const questions = await Question.find({ id: { $in: selectedQuestions } }).lean();
  if (questions.length !== selectedQuestions.length) {
    return res.status(400).json({ message: "One or more selected questions are invalid" });
  }

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const exam = {
    id: uuidv4(),
    title: name,
    examName: name,
    subject: questions[0]?.subject || "General",
    durationMinutes: Number(duration),
    totalMarks,
    totalQuestions: selectedQuestions.length,
    startDate,
    endDate,
    questionIds: selectedQuestions,
    published: true,
    negativeMarking: Boolean(negativeMarking),
    negativeMarkValue: Number(negativeMarkValue || 0.25),
    createdAt: new Date().toISOString()
  };

  Exam.create(exam).then((created) => res.status(201).json(created));
}

export function createExam(req, res) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const norm = normalizeExamBody(req.body);

  if (!norm.examName || !norm.subject || !norm.duration) {
    return res.status(400).json({ message: "exam name, subject, and duration are required" });
  }

  if (!norm.questionIds.length) {
    return res.status(400).json({ message: "At least one question is required" });
  }

  Question.find({ id: { $in: norm.questionIds } }).lean().then((qs) => {
    const totalMarks = norm.totalMarks || qs.reduce((sum, q) => sum + (q.marks || 0), 0);
    const exam = {
      id: uuidv4(),
      title: norm.examName,
      examName: norm.examName,
      subject: norm.subject,
      durationMinutes: norm.duration,
      totalMarks,
      totalQuestions: norm.totalQuestions || norm.questionIds.length,
      startDate: norm.startDate,
      endDate: norm.endDate,
      questionIds: norm.questionIds,
      published: true,
      negativeMarking: norm.negativeMarking,
      negativeMarkValue: norm.negativeMarkValue,
      createdAt: new Date().toISOString()
    };
    Exam.create(exam).then((created) => res.status(201).json(created));
  });
}

export function listExams(req, res) {
  if (req.user.role === "admin") {
    return Exam.find().lean().then((exams) => res.json(exams));
  }
  Exam.find({ published: true }).lean().then((exams) => {
    const visible = exams.filter((e) => isWithinWindow(e));
    res.json(visible);
  });
}

export function getExam(req, res) {
  Exam.findOne({ id: req.params.id }).lean().then(async (exam) => {
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (req.user.role !== "admin" && (!exam.published || !isWithinWindow(exam))) {
      return res.status(403).json({ message: "Exam not available" });
    }
    const questions = await Question.find({ id: { $in: exam.questionIds } }).lean();
    res.json({ ...exam, questions });
  });
}

export function generateExam(req, res) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  const norm = normalizeExamBody(req.body);
  const rules = req.body.rules || req.body.selectionRules || {};

  if (!norm.examName || !norm.subject || !norm.duration) {
    return res.status(400).json({ message: "exam name, subject, and duration are required" });
  }

  Question.find().lean().then((questions) => {
    const picked = selectByRules({ questions }, { subject: norm.subject, topic: rules.topic, counts: rules.counts || rules });
    if (picked.error) return res.status(400).json({ message: picked.error });

    const totalMarks = questions
      .filter((q) => picked.questionIds.includes(q.id))
      .reduce((sum, q) => sum + (q.marks || 0), 0);

    const exam = {
      id: uuidv4(),
      title: norm.examName,
      examName: norm.examName,
      subject: norm.subject,
      durationMinutes: norm.duration,
      totalMarks,
      totalQuestions: picked.questionIds.length,
      startDate: norm.startDate,
      endDate: norm.endDate,
      questionIds: picked.questionIds,
      published: true,
      negativeMarking: norm.negativeMarking,
      negativeMarkValue: norm.negativeMarkValue,
      selectionRules: rules,
      createdAt: new Date().toISOString()
    };

    Exam.create(exam).then((created) => res.status(201).json(created));
  });
}

export function submitExam(req, res) {
  if (req.user.role !== "student") return res.status(403).json({ message: "Forbidden" });
  const { exam_id, examId, answers } = req.body;
  const examIdResolved = examId || exam_id;
  if (!examIdResolved || !answers) {
    return res.status(400).json({ message: "exam_id and answers are required" });
  }

  Exam.findOne({ id: examIdResolved }).lean().then(async (exam) => {
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!exam.published || !isWithinWindow(exam)) {
      return res.status(403).json({ message: "Exam not available" });
    }

    const existing = await Result.findOne({ examId: examIdResolved, studentId: req.user.userId }).lean();
    if (existing) {
      return res.status(400).json({ message: "Exam already submitted" });
    }

    const examQuestions = await Question.find({ id: { $in: exam.questionIds } }).lean();
    const graded = gradeAttempt(examQuestions, answers, {
      negativeMarking: exam?.negativeMarking || false,
      negativeMarkValue: exam?.negativeMarkValue || 0.25
    });
    const correctCount = graded.details.filter((d) => d.correct).length;
    const wrongCount = graded.details.filter((d) => !d.correct).length;
    const percentage = examQuestions.length ? Math.round((graded.score / (exam.totalMarks || graded.score || 1)) * 100) : 0;

    const result = {
      id: uuidv4(),
      studentId: req.user.userId,
      examId: exam.id,
      correct: correctCount,
      wrong: wrongCount,
      score: graded.score,
      percentage,
      submittedAt: new Date().toISOString()
    };

    Result.create(result).then((created) => res.json(created));
  });
}
