import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import questionRoutes from "./routes/questions.js";
import examRoutes from "./routes/exams.js";
import studentRouter from "./routes/student.js";
import moduleRoutes from "./routes/modules.js";
import topicRoutes from "./routes/topics.js";
import subTopicRoutes from "./routes/subtopics.js";
import { ensureAdmin, ensureReferenceQuestionBank } from "./seed.js";
import { gradeAttempt } from "./services/grading.js";
import { Attempt } from "./models/Attempt.js";
import { Exam } from "./models/Exam.js";
import { Question } from "./models/Question.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/student", studentRouter(io));
app.use("/api/modules", moduleRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/subtopics", subTopicRoutes);

function autoSubmitExpiredAttempts() {
  Attempt.find({ status: "in_progress" }).then(async (attempts) => {
    for (const attempt of attempts) {
      if (new Date(attempt.endAt).getTime() > Date.now()) continue;
      const exam = await Exam.findOne({ id: attempt.examId }).lean();
      const examQuestions = await Question.find({ id: { $in: exam?.questionIds || [] } }).lean();
      const graded = gradeAttempt(examQuestions, attempt.answers || {});

      await Attempt.updateOne(
        { id: attempt.id },
        {
          status: "submitted",
          submittedAt: new Date().toISOString(),
          score: graded.score,
          details: graded.details
        }
      );

      io.emit("result:submitted", {
        examId: attempt.examId,
        attemptId: attempt.id,
        studentId: attempt.studentId,
        score: graded.score,
        submittedAt: new Date().toISOString(),
        autoSubmitted: true
      });
    }
  });
}

io.on("connection", (socket) => {
  socket.emit("server:connected", { message: "Realtime channel connected" });
});

const PORT = process.env.PORT || 5000;
connectDB().then(async () => {
  await ensureAdmin();
  await ensureReferenceQuestionBank();
  setInterval(autoSubmitExpiredAttempts, 5000);

  server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log("Default admin: admin@exam.com / admin123");
  });
}).catch((err) => {
  console.error("Failed to start server:", err.message);
});
