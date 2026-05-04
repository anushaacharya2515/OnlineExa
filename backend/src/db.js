import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "data.json");

const defaultData = {
  users: [],
  questions: [],
  exams: [],
  attempts: [],
  students: [],
  results: []
};

function load() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
    return structuredClone(defaultData);
  }
  const raw = fs.readFileSync(dbPath, "utf-8");
  const parsed = JSON.parse(raw || "{}");
  return { ...defaultData, ...parsed };
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export const db = {
  read: () => load(),
  write: (data) => save(data)
};
