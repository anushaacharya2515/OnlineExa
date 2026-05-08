import express from "express";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/auth.js";
import { gradeAttempt } from "../services/grading.js";
import { buildRetakeQuestionSetMongo } from "../services/retakeQuestions.js";
import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";
import { Attempt } from "../models/Attempt.js";
import { User } from "../models/User.js";

export default function studentRouter(io) {
  const router = express.Router();
  router.use(auth("student"));

  function formatAnswer(answer) {
    if (Array.isArray(answer)) return answer.join(", ");
    if (answer && typeof answer === "object") return JSON.stringify(answer);
    return String(answer ?? "");
  }

  function resolveAttemptDurationMs(exam, now) {
    const configuredDurationMinutes = Number(
      exam.durationMinutes ?? exam.duration ?? exam.duration_minutes ?? 0
    );
    const configuredDurationMs = Number.isFinite(configuredDurationMinutes) && configuredDurationMinutes > 0
      ? configuredDurationMinutes * 60 * 1000
      : 0;

    if (!exam.endDate) return configuredDurationMs;

    const examEndMs = new Date(exam.endDate).getTime();
    if (!Number.isFinite(examEndMs)) return configuredDurationMs;

    const remainingWindowMs = examEndMs - now;
    if (configuredDurationMs <= 0) return Math.max(0, remainingWindowMs);

    return Math.max(0, Math.min(configuredDurationMs, remainingWindowMs));
  }

  router.get("/exams", async (req, res) => {
    const now = Date.now();
    const [exams, attempts] = await Promise.all([
      Exam.find({ published: true }).lean(),
      Attempt.find({ studentId: req.user.userId }, { examId: 1, status: 1 }).lean()
    ]);

    const attemptedExamIds = new Set(
      attempts
        .filter(a => ["in_progress", "submitted"].includes(a.status))
        .map(a => a.examId)
    );

    // Only return exams within their date window
    const available = exams.filter(e => {
      const now2 = Date.now();
      if (e.startDate) {
        const start = new Date(e.startDate).getTime();
        if (Number.isFinite(start) && now2 < start) return false;
      }
      if (e.endDate) {
        const end = new Date(e.endDate).getTime();
        if (Number.isFinite(end) && now2 > end) return false;
      }
      return true;
    });

    res.json(available.map(e => ({
      id: e.id,
      title: e.title,
      examName: e.examName,
      subject: e.subject,
      durationMinutes: e.durationMinutes,
      totalQuestions: (e.questionIds || []).length,
      totalMarks: Number(e.totalMarks || 0),
      negativeMarking: Boolean(e.negativeMarking),
      negativeMarkValue: Number(e.negativeMarkValue || 0.25),
      startDate: e.startDate,
      endDate: e.endDate,
      attempted: attemptedExamIds.has(e.id)
    })));
  });

  router.get("/exams/:examId", async (req, res) => {
    const exam = await Exam.findOne({ id: req.params.examId, published: true }).lean();
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const now = Date.now();
    if (exam.startDate && now < new Date(exam.startDate).getTime()) {
      return res.status(403).json({ message: "Exam has not started yet" });
    }
    if (exam.endDate && now > new Date(exam.endDate).getTime()) {
      return res.status(403).json({ message: "Exam has ended" });
    }

    const alreadyAttempted = await Attempt.findOne({
      examId: exam.id,
      studentId: req.user.userId,
      status: { $in: ["in_progress", "submitted"] }
    }).lean();

    const totalQuestions = Array.isArray(exam.questionIds) ? exam.questionIds.length : 0;
    const totalMarks = Number(exam.totalMarks || 0);

    res.json({
      id: exam.id,
      title: exam.title,
      examName: exam.examName,
      subject: exam.subject,
      durationMinutes: Number(exam.durationMinutes || 0),
      totalQuestions,
      totalMarks,
      negativeMarking: Boolean(exam.negativeMarking),
      negativeMarkValue: Number(exam.negativeMarkValue || 0.25),
      startDate: exam.startDate || null,
      endDate: exam.endDate || null,
      attempted: Boolean(alreadyAttempted)
    });
  });

  router.get("/question-bank", (req, res) => {
    Promise.all([
      Exam.find({ published: true }, { questionIds: 1 }).lean(),
      Question.find().lean()
    ]).then(([exams, questions]) => {
      const publishedExamIds = new Set(exams.flatMap((e) => e.questionIds || []));
      const source = questions.filter((q) => publishedExamIds.size === 0 || publishedExamIds.has(q.id));
      const bank = source.slice(0, 50).map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        passage: q.passage || "",
        imageUrl: q.imageUrl || "",
        audioUrl: q.audioUrl || "",
        assertion: q.assertion || "",
        reason: q.reason || "",
        options: q.options || [],
        answer: formatAnswer(q.correctAnswer)
      }));
      res.json(bank);
    });
  });

  router.post("/exams/:examId/start", async (req, res) => {
    const exam = await Exam.findOne({ id: req.params.examId, published: true }).lean();
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    const now = Date.now();
    if (exam.startDate && now < new Date(exam.startDate).getTime()) {
      return res.status(403).json({ message: "Exam has not started yet" });
    }
    if (exam.endDate && now > new Date(exam.endDate).getTime()) {
      return res.status(403).json({ message: "Exam has ended" });
    }

    const alreadyAttempted = await Attempt.findOne({
      examId: req.params.examId,
      studentId: req.user.userId,
      status: { $in: ["in_progress", "submitted"] }
    }).lean();
    if (alreadyAttempted) {
      return res.status(403).json({
        message: "You have already attempted this exam."
      });
    }

    const retakePlan = await buildRetakeQuestionSetMongo(exam, req.user.userId);
    const attemptDurationMs = resolveAttemptDurationMs(exam, now);
    if (attemptDurationMs <= 0) {
      return res.status(403).json({ message: "No time remaining for this exam" });
    }
    const endAt = now + attemptDurationMs;

    const attempt = {
      id: uuidv4(),
      examId: exam.id,
      studentId: req.user.userId,
      questionIds: retakePlan.questionIds,
      answers: {},
      status: "in_progress",
      startedAt: new Date(now).toISOString(),
      endAt: new Date(endAt).toISOString(),
      score: null,
      details: [],
      aiGeneratedCount: retakePlan.generatedCount || 0,
      isRetake: retakePlan.isRetake || false
    };

    await Attempt.create(attempt);
    res.status(201).json(attempt);
  });

  router.get("/attempts/:attemptId", async (req, res) => {
    const attempt = await Attempt.findOne({ id: req.params.attemptId, studentId: req.user.userId }).lean();
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const exam = await Exam.findOne({ id: attempt.examId }).lean();
    const questionIds = Array.isArray(attempt.questionIds) && attempt.questionIds.length > 0
      ? attempt.questionIds
      : exam.questionIds;

    const questions = await Question.find({ id: { $in: questionIds } }).lean();
    const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
    const ordered = questionIds
      .map((id) => byId[id])
      .filter(Boolean)
      .map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        passage: q.passage,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        pairs: q.pairs,
        matrixRows: q.matrixRows,
        matrixCols: q.matrixCols,
        integerRange: q.integerRange,
        assertion: q.assertion,
        reason: q.reason,
        marks: q.marks
      }));

    const remainingMs = Math.max(0, new Date(attempt.endAt).getTime() - Date.now());
    res.json({ attempt, exam, questions: ordered, remainingMs });
  });

  router.patch("/attempts/:attemptId/answers", async (req, res) => {
    const { answers } = req.body;
    const attempt = await Attempt.findOne({ id: req.params.attemptId, studentId: req.user.userId }).lean();
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Attempt already submitted" });
    }

    await Attempt.updateOne(
      { id: req.params.attemptId },
      { $set: { answers: { ...attempt.answers, ...(answers || {}) } } }
    );
    res.json({ message: "Saved" });
  });

  router.post("/attempts/:attemptId/submit", async (req, res) => {
    const attempt = await Attempt.findOne({ id: req.params.attemptId, studentId: req.user.userId }).lean();
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    if (attempt.status === "submitted") {
      return res.json(attempt);
    }

    const exam = await Exam.findOne({ id: attempt.examId }).lean();
    const questionIds = Array.isArray(attempt.questionIds) && attempt.questionIds.length > 0
      ? attempt.questionIds
      : exam.questionIds;
    const examQuestions = await Question.find({ id: { $in: questionIds } }).lean();
    const graded = gradeAttempt(examQuestions, attempt.answers || {}, {
      negativeMarking: exam?.negativeMarking || false,
      negativeMarkValue: exam?.negativeMarkValue || 0.25
    });

    const submitted = {
      ...attempt,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      score: graded.score,
      details: graded.details
    };

    await Attempt.updateOne({ id: attempt.id }, submitted);

    io.emit("result:submitted", {
      examId: submitted.examId,
      attemptId: submitted.id,
      studentId: submitted.studentId,
      score: submitted.score,
      submittedAt: submitted.submittedAt
    });

    res.json(submitted);
  });

  router.get("/results", async (req, res) => {
    const mine = await Attempt.find({ studentId: req.user.userId, status: "submitted" }).lean();
    res.json(mine);
  });

  router.get("/profile", async (req, res) => {
    const user = await User.findOne({ id: req.user.userId }).lean();
    if (!user) return res.status(404).json({ message: "Student not found" });
    res.json({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      mobileNumber: user.mobileNumber || "",
      dob: user.dob || "",
      profilePhotoUrl: user.profilePhotoUrl || "",
      resumeUrl: user.resumeUrl || "",
      address: user.address || "",
      college: user.college || ""
    });
  });

  router.put("/profile", async (req, res) => {
    const payload = {
      name: String(req.body.name || "").trim(),
      mobileNumber: String(req.body.mobileNumber || "").trim(),
      dob: String(req.body.dob || "").trim(),
      profilePhotoUrl: String(req.body.profilePhotoUrl || "").trim(),
      resumeUrl: String(req.body.resumeUrl || "").trim(),
      address: String(req.body.address || "").trim(),
      college: String(req.body.college || "").trim()
    };

    if (!payload.name) return res.status(400).json({ message: "Name is required" });

    const updated = await User.findOneAndUpdate(
      { id: req.user.userId },
      { ...payload, updatedAt: new Date().toISOString() },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Student not found" });

    res.json({
      id: updated.id,
      name: updated.name || "",
      email: updated.email || "",
      mobileNumber: updated.mobileNumber || "",
      dob: updated.dob || "",
      profilePhotoUrl: updated.profilePhotoUrl || "",
      resumeUrl: updated.resumeUrl || "",
      address: updated.address || "",
      college: updated.college || ""
    });
  });

  return router;
}
