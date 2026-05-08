import express from "express";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/auth.js";
import { buildQuestion } from "../services/questionBank.js";
import { Question } from "../models/Question.js";
import { Exam } from "../models/Exam.js";
import { Attempt } from "../models/Attempt.js";
import { User } from "../models/User.js";
import { cleanupOldData, getRetentionMonths } from "../services/dataRetention.js";

const router = express.Router();

router.use(auth("admin"));

router.get("/questions", (req, res) => {
  Question.find().lean().then((questions) => res.json(questions));
});

router.post("/questions", (req, res) => {
  const question = buildQuestion(req.body);
  if (question.error) {
    return res.status(400).json({ message: question.error });
  }
  Question.create(question).then((created) => {
    res.status(201).json(created);
  });
});

router.post("/questions/bulk", (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: "questions array required" });
  }

  const created = [];

  for (const item of questions) {
    const q = buildQuestion(item);
    if (q.error) {
      return res.status(400).json({ message: q.error });
    }
    created.push(q);
  }

  Question.insertMany(created).then(() => res.status(201).json({ count: created.length }));
});


router.put("/questions/:id", (req, res) => {
  Question.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  ).then((updated) => {
    if (!updated) return res.status(404).json({ message: "Question not found" });
    res.json(updated);
  });
});

router.delete("/questions/:id", (req, res) => {
  Question.deleteOne({ id: req.params.id }).then(async (result) => {
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    await Exam.updateMany({}, { $pull: { questionIds: req.params.id } });
    res.json({ message: "Deleted" });
  });
});

router.get("/exams", (req, res) => {
  Exam.find().lean().then((exams) => res.json(exams));
});

router.post("/exams", async (req, res) => {
  const {
    title,
    durationMinutes,
    questionIds = [],
    published = true,
    selection = null,
    selectionRules = null
  } = req.body;
  if (!title || !durationMinutes) {
    return res.status(400).json({ message: "title and durationMinutes are required" });
  }

  let pickedIds = Array.isArray(questionIds) ? questionIds : [];

  if (selectionRules) {
    const { subject, topic, counts = {} } = selectionRules;
    const difficulties = Object.entries(counts).filter(([, count]) => Number(count) > 0);
    if (difficulties.length === 0) {
      return res.status(400).json({ message: "selectionRules.counts must include at least one difficulty" });
    }

    const picked = [];
    for (const [level, countRaw] of difficulties) {
      const count = Number(countRaw);
      const pool = await Question.find({
        ...(subject ? { subject } : {}),
        ...(topic ? { topic } : {}),
        difficulty: level
      }).lean();

      if (pool.length < count) {
        return res.status(400).json({ message: `Not enough ${level} questions for the selected rules` });
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      picked.push(...shuffled.slice(0, count).map((q) => q.id));
    }

    pickedIds = picked;
  } else if (selection) {
    const {
      subject,
      difficulty,
      topic,
      marks,
      count
    } = selection;

    if (!count || Number(count) <= 0) {
      return res.status(400).json({ message: "selection.count must be > 0" });
    }

    const candidates = await Question.find({
      ...(subject ? { subject } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(topic ? { topic } : {}),
      ...(marks ? { marks: Number(marks) } : {})
    }).lean();

    if (candidates.length < Number(count)) {
      return res.status(400).json({ message: "Not enough questions for the selected criteria" });
    }

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    pickedIds = shuffled.slice(0, Number(count)).map((q) => q.id);
  }

  if (!Array.isArray(pickedIds) || pickedIds.length === 0) {
    return res.status(400).json({ message: "No questions selected for this exam" });
  }

  const exam = {
    id: uuidv4(),
    title,
    durationMinutes: Number(durationMinutes),
    questionIds: pickedIds,
    published,
    selection: selection || null,
    selectionRules: selectionRules || null,
    createdAt: new Date().toISOString()
  };

  Exam.create(exam).then((created) => res.status(201).json(created));
});

router.put("/exams/:id", (req, res) => {
  Exam.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  ).then((updated) => {
    if (!updated) return res.status(404).json({ message: "Exam not found" });
    res.json(updated);
  });
});

router.get("/results", async (req, res) => {
  const hasQueryFilters = [
    "page",
    "limit",
    "search",
    "exam",
    "examId",
    "status",
    "sort",
    "minScore",
    "maxScore",
    "dateFrom",
    "dateTo"
  ].some((key) => req.query[key] !== undefined);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(20, Math.max(10, Number.parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const search = String(req.query.search || "").trim().toLowerCase();
  const examFilter = String(req.query.exam || req.query.examId || "").trim();
  const statusFilter = String(req.query.status || "").trim();
  const sort = String(req.query.sort || "latest").trim();
  const minScore = req.query.minScore === undefined || req.query.minScore === ""
    ? null
    : Number(req.query.minScore);
  const maxScore = req.query.maxScore === undefined || req.query.maxScore === ""
    ? null
    : Number(req.query.maxScore);
  const dateFrom = String(req.query.dateFrom || "").trim();
  const dateTo = String(req.query.dateTo || "").trim();

  const [attempts, users, exams] = await Promise.all([
    Attempt.find({ status: "submitted" }).lean(),
    User.find({ role: "student" }).lean(),
    Exam.find().lean()
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const examById = new Map(exams.map((exam) => [exam.id, exam]));

  const enriched = attempts.map((attempt) => {
    const user = userById.get(attempt.studentId);
    const exam = examById.get(attempt.examId);
    const start = attempt.startedAt ? new Date(attempt.startedAt).getTime() : null;
    const end = attempt.submittedAt ? new Date(attempt.submittedAt).getTime()
      : attempt.endAt ? new Date(attempt.endAt).getTime()
      : null;
    const timeTakenMs = start && end ? Math.max(0, end - start) : null;
    const score = Number(attempt.score || 0);

    return {
      ...attempt,
      studentName: user?.name || user?.email || "Unknown",
      studentEmail: user?.email || "",
      rollNumber: user?.mobileNumber
        ? user.mobileNumber
        : `STU-${String(attempt.studentId || user?.id || "").replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      examTitle: exam?.title || exam?.examName || attempt.examId,
      timeTakenMs,
      resultStatus: score >= 50 ? "Pass" : "Fail",
      createdAt: attempt.submittedAt || attempt.startedAt || ""
    };
  });

  let filtered = enriched;

  if (search) {
    filtered = filtered.filter((item) => [
      item.studentName,
      item.studentEmail,
      item.rollNumber
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }

  if (examFilter) {
    filtered = filtered.filter((item) => item.examId === examFilter || item.examTitle === examFilter);
  }

  if (statusFilter) {
    filtered = filtered.filter((item) => item.resultStatus === statusFilter);
  }

  if (Number.isFinite(minScore)) {
    filtered = filtered.filter((item) => Number(item.score || 0) >= minScore);
  }

  if (Number.isFinite(maxScore)) {
    filtered = filtered.filter((item) => Number(item.score || 0) <= maxScore);
  }

  if (dateFrom) {
    const fromTime = new Date(dateFrom).getTime();
    if (Number.isFinite(fromTime)) {
      filtered = filtered.filter((item) => {
        const itemTime = new Date(item.submittedAt || item.createdAt || 0).getTime();
        return Number.isFinite(itemTime) && itemTime >= fromTime;
      });
    }
  }

  if (dateTo) {
    const inclusiveToTime = new Date(`${dateTo}T23:59:59.999`).getTime();
    if (Number.isFinite(inclusiveToTime)) {
      filtered = filtered.filter((item) => {
        const itemTime = new Date(item.submittedAt || item.createdAt || 0).getTime();
        return Number.isFinite(itemTime) && itemTime <= inclusiveToTime;
      });
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.submittedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.submittedAt || b.createdAt || 0).getTime();
    if (sort === "oldest") return aTime - bTime;
    return bTime - aTime;
  });

  if (!hasQueryFilters) {
    return res.json(sorted);
  }

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginated = sorted.slice(skip, skip + limit);
  const examOptions = exams
    .map((exam) => ({ id: exam.id, title: exam.title || exam.examName || exam.id }))
    .sort((a, b) => a.title.localeCompare(b.title));

  res.json({
    results: paginated,
    total,
    page,
    totalPages,
    exams: examOptions
  });
});

router.get("/reports/:examId", (req, res) => {
  Promise.all([
    Exam.findOne({ id: req.params.examId }).lean(),
    Attempt.find({ examId: req.params.examId, status: "submitted" }).lean(),
    User.find().lean()
  ]).then(([exam, attempts, users]) => {
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const lines = ["studentEmail,score,submittedAt,attemptId"];
    for (const a of attempts) {
      const user = users.find((u) => u.id === a.studentId);
      lines.push(`${user?.email || "unknown"},${a.score || 0},${a.submittedAt || ""},${a.id}`);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=report-${exam.id}.csv`);
    res.send(lines.join("\n"));
  });
});

router.get("/students", (req, res) => {
  Promise.all([
    User.find({ role: "student" }).lean(),
    Attempt.find().lean()
  ]).then(([students, attempts]) => {
    const rows = students.map((s) => {
      const userAttempts = attempts.filter((a) => a.studentId === s.id);
      const submitted = userAttempts.filter((a) => a.status === "submitted" || a.submittedAt);
      const uniqueExams = new Set(userAttempts.map((a) => a.examId));
      const avgScore = submitted.length
        ? Math.round(submitted.reduce((sum, a) => sum + Number(a.score || 0), 0) / submitted.length)
        : 0;
      const lastAttempt = userAttempts
        .map((a) => a.submittedAt || a.startedAt || "")
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || null;

      return {
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        mobileNumber: s.mobileNumber || "",
        dob: s.dob || "",
        profilePhotoUrl: s.profilePhotoUrl || "",
        resumeUrl: s.resumeUrl || "",
        address: s.address || "",
        college: s.college || "",
        registeredAt: s.createdAt || "",
        examsTaken: uniqueExams.size,
        averageScore: avgScore,
        lastAttempt
      };
    });

    res.json(rows);
  });
});

router.post("/maintenance/cleanup-old-data", async (req, res) => {
  const months = Number(req.body?.months || getRetentionMonths());
  const report = await cleanupOldData(months);
  res.json({
    message: `Cleanup complete for data older than ${report.retentionMonths} months.`,
    ...report
  });
});

export default router;
