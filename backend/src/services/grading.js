function normalize(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function asSortedNormalizedArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => normalize(v)).filter(Boolean).sort();
}

function isNumericEqual(a, b) {
  const n1 = Number(a);
  const n2 = Number(b);
  if (!Number.isFinite(n1) || !Number.isFinite(n2)) return false;
  return Math.abs(n1 - n2) < 1e-9;
}

function isMatrixEqual(expected, received) {
  const exp = expected || {};
  const rec = received || {};
  const rows = Object.keys(exp);
  if (rows.length === 0) return false;

  return rows.every((row) => {
    const left = asSortedNormalizedArray(exp[row]);
    const right = asSortedNormalizedArray(rec[row]);
    return left.length === right.length && left.every((v, i) => v === right[i]);
  });
}

export function gradeAttempt(questions, answersByQuestionId) {
  let score = 0;
  const details = [];

  for (const q of questions) {
    const answer = answersByQuestionId?.[q.id];
    let correct = false;

    if (q.type === "MCQ" || q.type === "TRUE_FALSE" || q.type === "PASSAGE" || q.type === "SINGLE_MCQ" || q.type === "PARAGRAPH_CASE" || q.type === "ASSERTION_REASON" || q.type === "FILL_BLANK") {
      correct = normalize(answer) === normalize(q.correctAnswer);
    }

    if (q.type === "MSQ") {
      const expected = asSortedNormalizedArray(q.correctAnswer);
      const received = asSortedNormalizedArray(answer);
      correct = expected.length > 0 && expected.length === received.length && expected.every((v, i) => v === received[i]);
    }

    if (q.type === "NAT") {
      correct = isNumericEqual(answer, q.correctAnswer);
    }

    if (q.type === "INTEGER_RANGE") {
      const min = Number(q.integerRange?.min);
      const max = Number(q.integerRange?.max);
      const given = Number(answer);
      correct = Number.isInteger(given) && Number.isFinite(min) && Number.isFinite(max) && given >= min && given <= max;
    }

    if (q.type === "INTEGER") {
      const given = Number(answer);
      const expected = Number(q.correctAnswer);
      correct = Number.isInteger(given) && Number.isFinite(expected) && given === expected;
    }

    if (q.type === "MATCH" || q.type === "DRAG_DROP") {
      const expected = q.correctAnswer || {};
      const received = answer || {};
      const keys = Object.keys(expected);
      correct = keys.length > 0 && keys.every((k) => normalize(received[k]) === normalize(expected[k]));
    }

    if (q.type === "MATRIX") {
      correct = isMatrixEqual(q.correctAnswer, answer);
    }

    if (correct) score += Number(q.marks || 1);

    details.push({
      questionId: q.id,
      type: q.type,
      correct,
      received: answer ?? null,
      expected: q.correctAnswer
    });
  }

  return { score, details };
}
