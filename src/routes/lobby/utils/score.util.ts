// Simple scoring utility roughly similar to Kahoot feel
// - base points per question: 1000
// - speed bonus up to 500 depending on time remaining
// - multiplier from question.pointsMultiplier
export function computePoints(params: {
  isCorrect: boolean;
  timeTakenMs: number;
  timeLimitSec: number;
  pointsMultiplier: number;
}) {
  const { isCorrect, timeTakenMs, timeLimitSec, pointsMultiplier } = params;
  if (!isCorrect) return 0;
  const base = 1000;
  const maxBonus = 500;
  const limitMs = Math.max(1, timeLimitSec) * 1000;
  const remaining = Math.max(0, limitMs - timeTakenMs);
  const speedRatio = Math.min(1, remaining / limitMs);
  const bonus = Math.round(maxBonus * speedRatio);
  return Math.round((base + bonus) * (pointsMultiplier || 1));
}
