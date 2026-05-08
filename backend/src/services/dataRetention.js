import { Attempt } from "../models/Attempt.js";
import { Result } from "../models/Result.js";

function toPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getRetentionMonths() {
  return toPositiveInt(process.env.DATA_RETENTION_MONTHS, 6);
}

export function getCutoffIso(months = getRetentionMonths()) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff.toISOString();
}

export async function cleanupOldData(months = getRetentionMonths()) {
  const cutoffIso = getCutoffIso(months);

  const attemptsCleanup = await Attempt.deleteMany({
    $or: [
      { submittedAt: { $exists: true, $ne: null, $lt: cutoffIso } },
      { status: "in_progress", endAt: { $exists: true, $ne: null, $lt: cutoffIso } }
    ]
  });

  const resultsCleanup = await Result.deleteMany({
    submittedAt: { $exists: true, $ne: null, $lt: cutoffIso }
  });

  return {
    retentionMonths: months,
    cutoffIso,
    deletedAttempts: attemptsCleanup.deletedCount || 0,
    deletedResults: resultsCleanup.deletedCount || 0
  };
}

