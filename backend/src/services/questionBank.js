import { v4 as uuidv4 } from "uuid";

export function buildQuestion(body) {
  const normalized = {
    ...body,
    text: body.text ?? body.question_text,
    correctAnswer: body.correctAnswer ?? body.correct_answer,
    subject: body.subject ?? body.subject_name,
    topic: body.topic ?? body.topic_name,
    difficulty: body.difficulty ?? body.level,
    moduleId: body.moduleId ?? body.module_id ?? null,
    topicId: body.topicId ?? body.topic_id ?? null,
    subTopicId: body.subTopicId ?? body.subtopic_id ?? body.subTopic_id ?? null,
    imageUrl: body.imageUrl ?? body.image_url ?? "",
    audioUrl: body.audioUrl ?? body.audio_url ?? "",
    explanation: body.explanation ?? ""
  };

  const {
    type,
    text,
    options = [],
    correctAnswer,
    passage = "",
    pairs = [],
    matrixRows = [],
    matrixCols = [],
    integerRange = null,
    assertion = "",
    reason = "",
    imageUrl = "",
    audioUrl = "",
    explanation = "",
    moduleId = null,
    topicId = null,
    subTopicId = null,
    subject = "",
    difficulty = "",
    topic = "",
    marks = 1
  } = normalized;

  if (!type || !text || correctAnswer === undefined) {
    return { error: "type, text, correctAnswer are required" };
  }

  if ((!moduleId || !topicId) && (!subject || !difficulty || !topic)) {
    return { error: "moduleId & topicId or subject, topic, difficulty are required" };
  }

  if (!difficulty) {
    return { error: "difficulty is required" };
  }

  const optionTypes = ["MCQ", "SINGLE_MCQ", "MSQ", "PARAGRAPH_CASE", "ASSERTION_REASON", "TRUE_FALSE", "LOGICAL_REASONING"];
  const cleanedOptions = Array.isArray(options) ? options.filter((o) => String(o || "").trim()) : [];
  if (optionTypes.includes(type) && cleanedOptions.length < 2) {
    return { error: "options are required for this question type" };
  }

  if (type === "MCQ" || type === "SINGLE_MCQ" || type === "PARAGRAPH_CASE" || type === "ASSERTION_REASON" || type === "TRUE_FALSE" || type === "LOGICAL_REASONING") {
    if (correctAnswer === undefined || correctAnswer === "") {
      return { error: "correctAnswer is required" };
    }
  }

  if (type === "MSQ" && (!Array.isArray(correctAnswer) || correctAnswer.length === 0)) {
    return { error: "correctAnswer must be a non-empty array for MSQ" };
  }

  return {
    id: uuidv4(),
    type,
    text,
    options: cleanedOptions,
    correctAnswer,
    passage,
    pairs,
    matrixRows,
    matrixCols,
    integerRange,
    assertion,
    reason,
    imageUrl,
    audioUrl,
    explanation,
    moduleId,
    topicId,
    subTopicId,
    subject,
    difficulty,
    topic,
    marks,
    createdAt: new Date().toISOString()
  };
}
