// Core game engine: permutations, question generation, difficulty tiers.
//
// Operator semantics (verified in all three reference videos, see MECHANICS.md):
// an operator is a 4-digit code d1 d2 d3 d4 where OUTPUT position k receives
// the symbol from INPUT position d_k. Example: [A,B,C,D] + 2413 -> [B,D,A,C].
//
// Difficulty (from the videos — option count is ALWAYS 3; difficulty comes
// from chain depth and where the unknown operator sits):
//   tier 1: single switch, pick 1 of 3 codes
//   tier 2: two chained switches, one operator given (before or after the
//           unknown), pick the unknown from 3 codes
//   tier 3: three chained switches, two operators given, unknown is last or
//           middle, pick from 3 codes
//   tier 4: two chained switches, BOTH unknown — two rows sharing one set of
//           3 codes, pick one code per row ("most difficult levels" video)

export const SYMBOL_POOL = [
  { id: 'circle', color: '#3e8e58', label: 'green circle' },
  { id: 'cross', color: '#3d78c9', label: 'blue cross' },
  { id: 'square', color: '#e2694e', label: 'red square' },
  { id: 'triangle', color: '#f0b400', label: 'yellow triangle' },
  { id: 'diamond', color: '#8e44ad', label: 'purple diamond' },
  { id: 'star', color: '#00acc1', label: 'teal star' },
];

// The classic AON set shown in the videos (always these four, varying order).
const CLASSIC_SET = ['circle', 'cross', 'square', 'triangle'];

export const OPTION_COUNT = 3;

export function applyOperator(perm, symbols) {
  return perm.map((src) => symbols[src - 1]);
}

// Run a full chain of operators over an input row.
export function applyChain(perms, symbols) {
  return perms.reduce((row, p) => applyOperator(p, row), symbols);
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

// compose(a, b) = "a then b" as a single permutation: out[k] = in[c[k]].
export function compose(a, b) {
  return b.map((src) => a[src - 1]);
}

// Near-miss distractors: transpositions of the correct code (differ in exactly
// two digits), topped up with 3-cycles (differ in exactly three). Mirrors the
// close option sets seen in the videos (e.g. 2341 / 2314 / 3241).
function nearMissDistractors(correct, count, rng, forbidden = new Set()) {
  const out = [];
  const seen = new Set([permToString(correct), '1234', ...forbidden]);
  const pairs = shuffled(
    [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
    rng,
  );
  for (const [i, j] of pairs) {
    if (out.length >= count) break;
    const p = correct.slice();
    [p[i], p[j]] = [p[j], p[i]];
    const key = permToString(p);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  let guard = 0;
  while (out.length < count && guard++ < 100) {
    const [i, j, k] = shuffled([0, 1, 2, 3], rng).slice(0, 3);
    const p = correct.slice();
    [p[i], p[j], p[k]] = [p[j], p[k], p[i]];
    const key = permToString(p);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function pickSymbols(rng) {
  // The real test always uses the classic four; ~80% of questions do too,
  // with occasional variety for extra working-memory training.
  const ids = rng() < 0.8 ? CLASSIC_SET : shuffled(SYMBOL_POOL.map((s) => s.id), rng).slice(0, 4);
  return shuffled(ids.map((id) => SYMBOL_POOL.find((s) => s.id === id)), rng);
}

export const TIERS = [
  { id: 1, kind: 'single', label: 'Single switch' },
  { id: 2, kind: 'chain2-given', label: 'Double switch · one given' },
  { id: 3, kind: 'chain3-given', label: 'Triple switch · two given' },
  { id: 4, kind: 'chain2-open', label: 'Double switch · both unknown' },
];

// A question is:
// { tier, kind, symbols, output, steps }
// where steps is an ordered array (top to bottom between the funnels) of:
//   { given: perm }                          — a fixed dark card
//   { options: [perm x3], answerIndex }      — a row of selectable cards
// tier 4 has two option steps sharing one option set; others exactly one.
export function generateQuestion(tierId, rng = Math.random) {
  const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[0];
  const symbols = pickSymbols(rng);

  if (tier.kind === 'chain2-open') {
    return generateChain2Open(tier, symbols, rng);
  }

  const chainLen = tier.kind === 'single' ? 1 : tier.kind === 'chain2-given' ? 2 : 3;
  // Position of the unknown operator within the chain. Together with tiers 1
  // and 4 this covers all "7 question types" named in the study-guide page
  // shown in the mqsoRw9PJ2M video (33:20).
  let unknownAt = 0;
  if (tier.kind === 'chain2-given') unknownAt = randInt(2, rng);
  if (tier.kind === 'chain3-given') unknownAt = randInt(3, rng);

  let perms;
  let guard = 0;
  do {
    perms = Array.from({ length: chainLen }, () => randomPermutation(rng));
    // Avoid a chain that composes to the identity (output identical to input
    // reads as a broken question).
  } while (chainLen > 1 && permToString(perms.reduce(compose)) === '1234' && guard++ < 50);

  const output = applyChain(perms, symbols);
  const correct = perms[unknownAt];
  const options = shuffled(
    [correct, ...nearMissDistractors(correct, OPTION_COUNT - 1, rng)],
    rng,
  );
  const steps = perms.map((p, i) => (
    i === unknownAt
      ? { options, answerIndex: options.findIndex((o) => permsEqual(o, correct)) }
      : { given: p }
  ));
  return { tier: tier.id, kind: tier.kind, symbols, output, steps };
}

// Tier 4: both operators unknown; the two rows share one set of 3 codes (as in
// the "most difficult levels" video). The player picks one code per row, and
// exactly one of the 9 ordered pairs must produce the output.
function generateChain2Open(tier, symbols, rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const a = randomPermutation(rng);
    const b = randomPermutation(rng);
    if (permToString(compose(a, b)) === '1234') continue;
    const extras = nearMissDistractors(rng() < 0.5 ? a : b, 1, rng,
      new Set([permToString(a), permToString(b)]));
    const set = shuffled([a, b, ...extras], rng);
    // Uniqueness across all ordered pairs from the shared set.
    const target = permToString(compose(a, b));
    let matches = 0;
    for (const p of set) {
      for (const q of set) {
        if (permToString(compose(p, q)) === target) matches++;
      }
    }
    if (matches !== 1) continue;
    const output = applyChain([a, b], symbols);
    const row1 = { options: set, answerIndex: set.findIndex((p) => permsEqual(p, a)) };
    const row2 = { options: set, answerIndex: set.findIndex((p) => permsEqual(p, b)) };
    return {
      tier: tier.id, kind: tier.kind, symbols, output, steps: [row1, row2],
    };
  }
  // Practically unreachable; fall back to a tier-2 question rather than loop.
  return generateQuestion(2, rng);
}

export function unknownSteps(question) {
  return question.steps.filter((s) => s.options);
}

// checkAnswer(question, picks) — picks is an array of option indexes, one per
// unknown step, in order.
export function checkAnswer(question, picks) {
  const unknowns = unknownSteps(question);
  return unknowns.every((step, i) => picks[i] === step.answerIndex);
}

// Adaptive difficulty for Test mode: two in a row correct moves up a tier,
// one wrong moves down a tier.
export function nextTier(current, streak, wasCorrect) {
  if (!wasCorrect) return { tier: Math.max(1, current - 1), streak: 0 };
  const s = streak + 1;
  if (s >= 2 && current < TIERS.length) return { tier: current + 1, streak: 0 };
  return { tier: current, streak: s };
}

// Rough percentile band from the 6-minute test, calibrated against
// prep-guide guidance (see MECHANICS.md — this is an estimate, not AON's
// real adaptive-theta scoring).
export function percentileBand(correct, attempted) {
  const accuracy = attempted ? correct / attempted : 0;
  if (correct >= 14 && accuracy >= 0.9) return { band: '90th+', label: 'Outstanding' };
  if (correct >= 11 && accuracy >= 0.85) return { band: '80th–90th', label: 'Excellent' };
  if (correct >= 8 && accuracy >= 0.75) return { band: '60th–80th', label: 'Good' };
  if (correct >= 5 && accuracy >= 0.6) return { band: '40th–60th', label: 'Average' };
  return { band: '<40th', label: 'Keep practicing' };
}
