// Persistent stats across sessions via localStorage.
const KEY = 'switch-challenge-stats-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Corrupt or unavailable storage: start fresh.
  }
  return { sessions: [] };
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // Storage full/unavailable — stats just won't persist.
  }
}

export function recordSession(session) {
  const data = load();
  data.sessions.push(session);
  // Keep the most recent 200 sessions.
  if (data.sessions.length > 200) data.sessions = data.sessions.slice(-200);
  save(data);
}

export function getSessions() {
  return load().sessions;
}

export function summary() {
  const sessions = load().sessions;
  const tests = sessions.filter((s) => s.mode === 'test');
  const best = tests.reduce((b, s) => (s.score > (b?.score ?? -1) ? s : b), null);

  // Accuracy trend: last 10 sessions (any mode), oldest first.
  const trend = sessions.slice(-10).map((s) => ({
    date: s.date,
    mode: s.mode,
    accuracy: s.attempted ? s.correct / s.attempted : 0,
  }));

  // Weakest tier: lowest accuracy across all sessions, min 5 attempts.
  const tierAgg = {};
  for (const s of sessions) {
    for (const [tier, agg] of Object.entries(s.perTier ?? {})) {
      tierAgg[tier] = tierAgg[tier] || { correct: 0, attempted: 0 };
      tierAgg[tier].correct += agg.correct;
      tierAgg[tier].attempted += agg.attempted;
    }
  }
  let weakest = null;
  for (const [tier, agg] of Object.entries(tierAgg)) {
    if (agg.attempted < 5) continue;
    const acc = agg.correct / agg.attempted;
    if (!weakest || acc < weakest.accuracy) {
      weakest = { tier: Number(tier), accuracy: acc, ...agg };
    }
  }

  return { totalSessions: sessions.length, best, trend, weakest, tierAgg };
}

export function clearStats() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // Nothing to do.
  }
}
