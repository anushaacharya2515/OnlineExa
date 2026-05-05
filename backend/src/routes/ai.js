import express from "express";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/auth.js";
import { Question } from "../models/Question.js";

const router = express.Router();
router.use(auth("admin"));

// POST /api/ai/generate-questions
router.post("/generate-questions", async (req, res) => {
  const {
    topic,
    subtopic,
    questionType = "MCQ",
    difficulty = "Medium",
    count = 5,
    subject = ""
  } = req.body;

  if (!topic) return res.status(400).json({ message: "topic is required" });
  if (count < 1 || count > 20) return res.status(400).json({ message: "count must be between 1 and 20" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return res.status(503).json({ message: "OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file." });
  }

  const typeInstructions = {
    MCQ: "Multiple choice with 4 options (a, b, c, d). One correct answer.",
    MSQ: "Multiple select with 4 options. One or more correct answers.",
    TRUE_FALSE: "True or False question. Answer is either 'True' or 'False'.",
    FILL_BLANK: "Fill in the blank. Provide the correct word/phrase as answer.",
    INTEGER: "Numerical answer question. Answer is an integer.",
  };

  const prompt = `Generate exactly ${count} ${difficulty} difficulty ${questionType} questions about "${topic}"${subtopic ? ` specifically on "${subtopic}"` : ""}${subject ? ` for the subject "${subject}"` : ""}.

${typeInstructions[questionType] || typeInstructions.MCQ}

Return ONLY a valid JSON array. Each object must have:
- "text": question text (string)
- "options": array of strings (for MCQ/MSQ/TRUE_FALSE, else empty array)
- "correctAnswer": string or array of strings
- "explanation": brief explanation of the answer
- "difficulty": "${difficulty}"
- "type": "${questionType}"

Example for MCQ:
[{"text":"What is...?","options":["A","B","C","D"],"correctAnswer":"A","explanation":"Because...","difficulty":"${difficulty}","type":"MCQ"}]

Return ONLY the JSON array, no markdown, no extra text.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are an expert exam question generator. Always return valid JSON arrays only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ message: err.error?.message || "OpenAI API error" });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "[]";

    // Parse JSON — strip markdown if present
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ message: "AI returned invalid JSON. Please try again." });
    }

    if (!Array.isArray(questions)) {
      return res.status(502).json({ message: "AI response was not an array. Please try again." });
    }

    // Validate and normalize each question
    const normalized = questions.slice(0, count).map(q => ({
      text: String(q.text || "").trim(),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswer: q.correctAnswer,
      explanation: String(q.explanation || ""),
      difficulty: q.difficulty || difficulty,
      type: q.type || questionType,
      topic: topic,
      subtopic: subtopic || "",
      subject: subject || topic,
      marks: 1,
      source: "ai",
      isApproved: false
    })).filter(q => q.text.length > 0);

    res.json({ questions: normalized, count: normalized.length });

  } catch (err) {
    console.error("AI generation error:", err.message);
    res.status(500).json({ message: "Failed to generate questions: " + err.message });
  }
});

// POST /api/ai/approve — save approved questions to Question Bank
router.post("/approve", async (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: "questions array is required" });
  }

  const saved = [];
  const duplicates = [];

  for (const q of questions) {
    if (!q.text?.trim()) continue;

    // Duplicate detection — check if similar question exists
    const existing = await Question.findOne({
      text: { $regex: q.text.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    }).lean();

    if (existing) {
      duplicates.push(q.text.slice(0, 60));
      continue;
    }

    const question = {
      id: uuidv4(),
      type: q.type || "MCQ",
      text: q.text.trim(),
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      difficulty: q.difficulty || "Medium",
      subject: q.subject || q.topic || "",
      topic: q.topic || "",
      marks: Number(q.marks || 1),
      source: "ai",
      isApproved: true,
      generatedByAI: true,
      createdAt: new Date().toISOString()
    };

    await Question.create(question);
    saved.push(question.id);
  }

  res.json({
    saved: saved.length,
    duplicatesSkipped: duplicates.length,
    duplicates,
    message: `${saved.length} question${saved.length !== 1 ? "s" : ""} saved to Question Bank.${duplicates.length > 0 ? ` ${duplicates.length} duplicate(s) skipped.` : ""}`
  });
});

export default router;
