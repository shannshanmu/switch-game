// Core game engine: permutations, question generation, difficulty tiers.
// Operator semantics (verified against the reference videos): an operator is a
// 4-digit code d1 d2 d3 d4 where OUTPUT position k receives the symbol from
// INPUT position d_k. Example: input [A,B,C,D] + operator 2413 -> [B,D,A,C].

export const SYMBOL_POOL = [
  { id: 'circle', color: '#34a853', label: 'green circle' },
  { id: 'cross', color: '#4285f4', label: 'blue cross' },
  { id: 'square', color: '#ea4335', label: 'red square' },
  { id: 'triangle', color: '#f9ab00', label: 'yellow triangle' },
  { id: 'diamond', color: '#9c27b0', label: 'purple diamond' },
  { id: 'star', color: '#00acc1', label: 'teal star' },
  { id: 'heart', color: '#e91e63', label: 'pink heart' },
  { id: 'hexagon', color: '#795548', label: 'brown hexagon' },
];

// The classic AON set shown in the videos; used with high probability so the
// practice screen looks like the real thing, with occasional variety.
const CLASSIC_SET = ['circle', 'cross', 'square', 'triangle'];

export function applyOperator(perm, symbols) {
  return perm.map((src) => symbols[src - 1]);
}

export function permToString(perm) {
  return perm.join('');
}

function randInt(n, rng) {
  return Math.floor(rng() * n);
}

function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const IDENTITY = [1, 2, 3, 4];

function randomPermutation(rng, { allowIdentity = false } = {}) {
  let p;
  do {
    p = shuffled(IDENTITY, rng);
  } while (!allowIdentity && permToString(p) === '1234');
  return p;
}

function permsEqual(a, b) {
  return a.every((v, i) => v === b[i]);
}

// Near-miss distractors: permutations that differ from the correct one in
// exactly two positions (one transposition away), or three positions when we
// need more variety. Plausible because most digits match the correct code.
function nearMissDistractors(correct, count, rng) {
  const out = [];
  const seen = new Set([permToString(correct)]);
  const pairs = shuffled(
    [
      [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
    ],
    rng,
  );
  // Transpositions of the correct code (differ in exactly 2 positions).
  for (const [i, j] of pairs) {
    if (out.length >= count) break;
    const p = correct.slice();
    [p[i], p[j]] = [p[j], p[i]];
    const key = permToString(p);
    if (!seen.has(key) && key !== '1234') {
      seen.add(key);
      out.push(p);
    }
  }
  // 3-cycles of the correct code (differ in exactly 3 positions) as backup.
  while (out.length < count) {
    const [i, j, k] = shuffled([0, 1, 2, 3], rng).slice(0, 3);
    const p = correct.slice();
    [p[i], p[j], p[k]] = [p[j], p[k], p[i]];
    const key = permToString(p);
    if (!seen.has(key) && key !== '1234') {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function pickSymbols(rng) {
  // ~70% of questions use the classic green/blue/red/yellow set.
  if (rng() < 0.7) {
    return CLASSIC_SET.map((id) => SYMBOL_POOL.find((s) => s.id === id));
  }
  return shuffled(SYMBOL_POOL, rng).slice(0, 4);
}

// Difficulty tiers, matching the ramp seen in the videos:
//  1: single operator, 3 options
//  2: single operator, 4 options (near-miss distractors throughout)
//  3: chained (two stacked funnels), find the MISSING second operator, 3 options
//  4: chained, find the missing operator (first or second), 4 options
export const TIERS = [
  { id: 1, chain: false, options: 3, label: 'Single · 3 options' },
  { id: 2, chain: false, options: 4, label: 'Single · 4 options' },
  { id: 3, chain: true, options: 3, label: 'Chained · 3 options' },
  { id: 4, chain: true, options: 4, label: 'Chained · 4 options' },
];

export function generateQuestion(tierId, rng = Math.random) {
  const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[0];
  const symbols = pickSymbols(rng);

  if (!tier.chain) {
    const correct = randomPermutation(rng);
    const output = applyOperator(correct, symbols);
    const options = shuffled(
      [correct, ...nearMissDistractors(correct, tier.options - 1, rng)],
      rng,
    );
    return {
      tier: tier.id,
      chain: false,
      symbols,
      output,
      options,
      answerIndex: options.findIndex((p) => permsEqual(p, correct)),
      correct,
    };
  }

  // Chained question: input -> knownOp -> mid -> unknownOp -> output (or the
  // unknown first). The player picks the code for the "?" funnel.
  const known = randomPermutation(rng, { allowIdentity: false });
  const correct = randomPermutation(rng);
  const unknownFirst = tier.id >= 4 && rng() < 0.5;
  let output;
  if (unknownFirst) {
    output = applyOperator(known, applyOperator(correct, symbols));
  } else {
    output = applyOperator(correct, applyOperator(known, symbols));
  }
  // Distractors must not accidentally solve the chain: with 4 distinct
  // symbols, distinct permutations in the "?" slot always give distinct
  // outputs, so near-misses are safe.
  const options = shuffled(
    [correct, ...nearMissDistractors(correct, tier.options - 1, rng)],
    rng,
  );
  return {
    tier: tier.id,
    chain: true,
    unknownFirst,
    known,
    symbols,
    output,
    options,
    answerIndex: options.findIndex((p) => permsEqual(p, correct)),
    correct,
  };
}

// Adaptive difficulty for Test mode: two in a row correct moves up a tier,
// one wrong moves down a tier.
export function nextTier(current, streak, wasCorrect) {
  if (!wasCorrect) return { tier: Math.max(1, current - 1), streak: 0 };
  const s = streak + 1;
  if (s >= 2 && current < TIERS.length) return { tier: current + 1, streak: 0 };
  return { tier: current, streak: s };
}

// Rough percentile band from accuracy and number of correct answers in the
// 6-minute test, calibrated against prep-guide guidance (see MECHANICS.md).
export function percentileBand(correct, attempted) {
  const accuracy = attempted ? correct / attempted : 0;
  if (correct >= 14 && accuracy >= 0.9) return { band: '90th+', label: 'Outstanding' };
  if (correct >= 11 && accuracy >= 0.85) return { band: '80th–90th', label: 'Excellent' };
  if (correct >= 8 && accuracy >= 0.75) return { band: '60th–80th', label: 'Good' };
  if (correct >= 5 && accuracy >= 0.6) return { band: '40th–60th', label: 'Average' };
  return { band: '<40th', label: 'Keep practicing' };
}
