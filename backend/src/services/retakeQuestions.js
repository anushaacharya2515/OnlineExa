import { v4 as uuidv4 } from "uuid";
import { Attempt } from "../models/Attempt.js";
import { Question } from "../models/Question.js";

const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;

function cloneQuestionWithAiVariant(seed, variantNo) {
  return {
    ...seed,
    id: uuidv4(),
    text: `${seed.text} [AI Variant ${variantNo}]`,
    generatedByAI: true,
    createdAt: new Date().toISOString()
  };
}

export function buildRetakeQuestionSet(data, exam, studentId) {
  const attempts = data.attempts
    .filter((a) => a.studentId === studentId && a.examId === exam.id && a.status === "submitted")
    .sort((a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());

  if (attempts.length === 0) {
    return { questionIds: [...exam.questionIds], generatedCount: 0, isRetake: false };
  }

  const latest = attempts[0];
  const lastSubmittedAt = new Date(latest.submittedAt || latest.startedAt).getTime();
  const nextEligibleAt = new Date(lastSubmittedAt + SIX_WEEKS_MS).toISOString();

  const seenQuestionIds = new Set(
    attempts.flatMap((a) => {
      if (Array.isArray(a.questionIds) && a.questionIds.length > 0) return a.questionIds;
      if (Array.isArray(a.details) && a.details.length > 0) return a.details.map((d) => d.questionId).filter(Boolean);
      return Object.keys(a.answers || {});
    })
  );

  const unseenOriginalIds = exam.questionIds.filter((id) => !seenQuestionIds.has(id));
  const selectedIds = [...unseenOriginalIds];
  const required = exam.questionIds.length;
  const originalQuestions = data.questions.filter((q) => exam.questionIds.includes(q.id));

  let generatedCount = 0;
  while (selectedIds.length < required && originalQuestions.length > 0) {
    const seed = originalQuestions[generatedCount % originalQuestions.length];
    const variant = cloneQuestionWithAiVariant(seed, generatedCount + 1);
    data.questions.push(variant);
    selectedIds.push(variant.id);
    generatedCount += 1;
  }

  return {
    questionIds: selectedIds.slice(0, required),
    generatedCount,
    isRetake: true,
    suggestedRetakeAt: nextEligibleAt
  };
}

export async function buildRetakeQuestionSetMongo(exam, studentId) {
  const attempts = await Attempt.find({
    studentId,
    examId: exam.id,
    status: "submitted"
  }).sort({ submittedAt: -1, startedAt: -1 }).lean();

  if (attempts.length === 0) {
    return { questionIds: [...exam.questionIds], generatedCount: 0, isRetake: false };
  }

  const latest = attempts[0];
  const lastSubmittedAt = new Date(latest.submittedAt || latest.startedAt).getTime();
  const nextEligibleAt = new Date(lastSubmittedAt + SIX_WEEKS_MS).toISOString();

  const seenQuestionIds = new Set(
    attempts.flatMap((a) => {
      if (Array.isArray(a.questionIds) && a.questionIds.length > 0) return a.questionIds;
      if (Array.isArray(a.details) && a.details.length > 0) return a.details.map((d) => d.questionId).filter(Boolean);
      return Object.keys(a.answers || {});
    })
  );

  const unseenOriginalIds = exam.questionIds.filter((id) => !seenQuestionIds.has(id));
  const selectedIds = [...unseenOriginalIds];
  const required = exam.questionIds.length;
  const originalQuestions = await Question.find({ id: { $in: exam.questionIds } }).lean();

  let generatedCount = 0;
  while (selectedIds.length < required && originalQuestions.length > 0) {
    const seed = originalQuestions[generatedCount % originalQuestions.length];
    const variant = cloneQuestionWithAiVariant(seed, generatedCount + 1);
    await Question.create(variant);
    selectedIds.push(variant.id);
    generatedCount += 1;
  }

  return {
    questionIds: selectedIds.slice(0, required),
    generatedCount,
    isRetake: true,
    suggestedRetakeAt: nextEligibleAt
  };
}
