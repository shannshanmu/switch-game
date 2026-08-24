// Persistent stats across sessions via localStorage. The key is namespaced by
// path because GitHub Pages project sites share one origin (username.github.io)
// across every repo — an un-namespaced key would collide between apps.
const KEY = `switch-challenge-stats-v1:${typeof location !== 'undefined' ? location.pathname : ''}`;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Shape-validate: corrupt-but-parseable payloads (null, {}, wrong types)
      // must not brick every consumer downstream.
      if (data && Array.isArray(data.sessions)) return data;
    }
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
  const trend = sessions.slice(-10).map((s) => {
    const c = Number(s?.correct);
    const a = Number(s?.attempted);
    return {
      date: s?.date,
      mode: s?.mode === 'test' ? 'test' : 'practice',
      accuracy: Number.isFinite(c) && Number.isFinite(a) && a > 0 ? c / a : 0,
    };
  });

  // Weakest tier: lowest accuracy across all sessions, min 5 attempts.
  // Tier keys and counts come from storage, so whitelist and coerce them.
  const tierAgg = {};
  for (const s of sessions) {
    for (const [tier, agg] of Object.entries(s?.perTier ?? {})) {
      const t = Number(tier);
      const c = Number(agg?.correct);
      const a = Number(agg?.attempted);
      if (!Number.isInteger(t) || t < 1 || t > 8) continue;
      if (!Number.isFinite(c) || !Number.isFinite(a)) continue;
      tierAgg[t] = tierAgg[t] || { correct: 0, attempted: 0 };
      tierAgg[t].correct += c;
      tierAgg[t].attempted += a;
    }
  }
  let weakest = null;
  for (const [tier, agg] of Object.entries(tierAgg)) {
    if (agg.attempted < 5) continue;
    const acc = agg.correct / agg.attempted;
    if (!Number.isFinite(acc)) continue;
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
