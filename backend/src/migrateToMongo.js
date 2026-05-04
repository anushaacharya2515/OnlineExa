import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { User } from "./models/User.js";
import { Question } from "./models/Question.js";
import { Exam } from "./models/Exam.js";
import { Attempt } from "./models/Attempt.js";
import { Result } from "./models/Result.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "..", "data.json");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/online-exam";

async function run() {
  if (!fs.existsSync(dataPath)) {
    console.error("data.json not found at", dataPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw || "{}");

  await mongoose.connect(MONGO_URI);

  const users = data.users || [];
  const questions = data.questions || [];
  const exams = data.exams || [];
  const attempts = data.attempts || [];
  const results = data.results || [];

  if (users.length) await User.insertMany(users, { ordered: false }).catch(() => {});
  if (questions.length) await Question.insertMany(questions, { ordered: false }).catch(() => {});
  if (exams.length) await Exam.insertMany(exams, { ordered: false }).catch(() => {});
  if (attempts.length) await Attempt.insertMany(attempts, { ordered: false }).catch(() => {});
  if (results.length) await Result.insertMany(results, { ordered: false }).catch(() => {});

  console.log("Migration complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
