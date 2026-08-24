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
//   tier 3: three chained switches, two operators given, unknown is first,
//           middle or last (question types 6, 7, 5), pick from 3 codes
//   tier 4: two chained switches, BOTH unknown — two rows sharing one set of
//           3 codes, pick one code per row ("most difficult levels" video)

export const SYMBOL_POOL = [
  // The modern AON set (user-supplied screenshot of the current assessment).
  { id: 'star', color: '#4a9fd8', label: 'blue star' },
  { id: 'play', color: '#8e5bc6', label: 'purple triangle' },
  { id: 'hexagon', color: '#f2c11e', label: 'yellow hexagon' },
  { id: 'diamond', color: '#d64565', label: 'pink diamond' },
  // The older set shown throughout the tutorial videos.
  { id: 'circle', color: '#3e8e58', label: 'green circle' },
  { id: 'cross', color: '#3d78c9', label: 'blue cross' },
  { id: 'square', color: '#e2694e', label: 'red square' },
  { id: 'triangle', color: '#f0b400', label: 'yellow triangle' },
];

// The current test's set (screenshot evidence) and the videos' classic set.
const MODERN_SET = ['star', 'play', 'hexagon', 'diamond'];
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
  let guard = 0;
  do {
    p = shuffled(IDENTITY, rng);
  } while (!allowIdentity && permToString(p) === '1234' && guard++ < 50);
  // Degenerate-rng backstop: a constant rng >= 0.75 never shuffles, which
  // would otherwise loop forever here.
  if (!allowIdentity && permToString(p) === '1234') p = [2, 3, 4, 1];
  return p;
}

// All 24 permutations of 1-4, for exhaustion backstops.
function allPermutations() {
  const out = [];
  const rec = (rest, acc) => {
    if (!rest.length) { out.push(acc); return; }
    rest.forEach((v, i) => rec([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, v]));
  };
  rec([1, 2, 3, 4], []);
  return out;
}

// compose(a, b) = "a then b" as a single permutation: out[k] = in[c[k]].
export function compose(a, b) {
  return b.map((src) => a[src - 1]);
}

// Identity + all transpositions + all 3-cycles: the permutations that move at
// most three positions. Pairwise distances inside a cloud drawn from this
// pool are 2-4 digits, mirroring the close option sets in the videos
// (e.g. 2314 / 2341 / 3241).
const NEAR_POOL = allPermutations().filter(
  (p) => p.filter((v, i) => v !== i + 1).length <= 3,
);

// An exchangeable option set: three distinct near-miss codes forming a cloud
// around a hidden center. Crucially, WHICH member is the correct answer is
// decided uniformly at random afterwards — so no statistic of the set alone
// (parity, digit overlap, pairwise distances) can identify the answer. The
// pre-review generator failed this: its distractors were always
// transpositions of the correct code, making the answer the unique parity
// odd-one-out — a 100% shortcut. See the anti-heuristic regression tests.
function optionSet(rng) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const h = shuffled(IDENTITY, rng);
    const gs = shuffled(NEAR_POOL, rng).slice(0, OPTION_COUNT);
    const opts = gs.map((g) => compose(h, g));
    const keys = new Set(opts.map(permToString));
    if (keys.size === OPTION_COUNT && !keys.has('1234')) return opts;
  }
  // Degenerate-rng backstop.
  return [[2, 1, 3, 4], [2, 3, 1, 4], [2, 1, 4, 3]];
}

function pickSymbols(rng) {
  // Mostly the current test's set, sometimes the videos' classic set, with a
  // sprinkle of mixed sets for extra working-memory training. Mixed draws
  // avoid pairing the two yellow shapes (hexagon + triangle).
  const r = rng();
  let ids;
  if (r < 0.7) ids = MODERN_SET;
  else if (r < 0.85) ids = CLASSIC_SET;
  else {
    let guard = 0;
    do {
      ids = shuffled(SYMBOL_POOL.map((s) => s.id), rng).slice(0, 4);
    } while (ids.includes('hexagon') && ids.includes('triangle') && guard++ < 20);
    if (ids.includes('hexagon') && ids.includes('triangle')) ids = MODERN_SET;
  }
  return shuffled(ids.map((id) => SYMBOL_POOL.find((s) => s.id === id)), rng);
}

export const TIERS = [
  { id: 1, kind: 'single', label: 'Single switch' },
  { id: 2, kind: 'chain2-given', label: 'Double switch · one given' },
  { id: 3, kind: 'chain3-given', label: 'Triple switch · two given' },
  { id: 4, kind: 'chain2-open', label: 'Double switch · both unknown' },
];

// The 7 question types of the real test (MECHANICS.md §2), individually
// selectable in Practice's "random" mode. Labels follow the phrasing of the
// exercise-type panel the user supplied.
export const QUESTION_TYPES = [
  { id: 1, tier: 1, kind: 'single', unknownAt: 0, label: 'One row' },
  { id: 3, tier: 2, kind: 'chain2-given', unknownAt: 0, label: 'Two rows — options on first row' },
  { id: 2, tier: 2, kind: 'chain2-given', unknownAt: 1, label: 'Two rows — options on last row' },
  { id: 6, tier: 3, kind: 'chain3-given', unknownAt: 0, label: 'Three rows — options on first row' },
  { id: 7, tier: 3, kind: 'chain3-given', unknownAt: 1, label: 'Three rows — options on middle row' },
  { id: 5, tier: 3, kind: 'chain3-given', unknownAt: 2, label: 'Three rows — options on last row' },
  { id: 4, tier: 4, kind: 'chain2-open', unknownAt: null, label: 'Two rows — options on both rows' },
];

// A question is:
// { tier, kind, symbols, output, steps }
// where steps is an ordered array (top to bottom between the funnels) of:
//   { given: perm }                          — a fixed dark card
//   { options: [perm x3], answerIndex }      — a row of selectable cards
// tier 4 has two option steps sharing one option set; others exactly one.
export function generateQuestion(tierId, rng = Math.random) {
  const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[0];
  // Position of the unknown operator within the chain. Together with tiers 1
  // and 4 this covers all "7 question types" named in the study-guide page
  // shown in the mqsoRw9PJ2M video (33:20).
  let unknownAt = 0;
  if (tier.kind === 'chain2-given') unknownAt = randInt(2, rng);
  if (tier.kind === 'chain3-given') unknownAt = randInt(3, rng);
  return buildQuestion(tier.id, tier.kind, unknownAt, rng);
}

// Generate a question of one specific real-test type (Practice random mode).
export function generateQuestionOfType(typeId, rng = Math.random) {
  const spec = QUESTION_TYPES.find((t) => t.id === typeId) ?? QUESTION_TYPES[0];
  return buildQuestion(spec.tier, spec.kind, spec.unknownAt ?? 0, rng);
}

function buildQuestion(tierId, kind, unknownAt, rng) {
  const symbols = pickSymbols(rng);

  if (kind === 'chain2-open') {
    return generateChain2Open({ id: tierId, kind }, symbols, rng);
  }

  const chainLen = kind === 'single' ? 1 : kind === 'chain2-given' ? 2 : 3;

  // Options first, answer designated uniformly afterwards (see optionSet).
  const options = optionSet(rng);
  const answerIndex = randInt(OPTION_COUNT, rng);
  const correct = options[answerIndex];

  let perms;
  let guard = 0;
  do {
    perms = Array.from({ length: chainLen }, (v, i) => (
      i === unknownAt ? correct : randomPermutation(rng)
    ));
    // Avoid a chain that composes to the identity (output identical to input
    // reads as a broken question).
  } while (chainLen > 1 && permToString(perms.reduce(compose)) === '1234' && guard++ < 50);
  if (chainLen > 1 && permToString(perms.reduce(compose)) === '1234') {
    // Degenerate-rng backstop: altering one GIVEN operator necessarily
    // changes the total (composition is injective per argument) without
    // touching the correct option.
    const fixAt = unknownAt === 0 ? 1 : 0;
    const g = perms[fixAt].slice();
    [g[0], g[1]] = [g[1], g[0]];
    perms[fixAt] = permToString(g) === '1234' ? [2, 3, 4, 1] : g;
  }

  const output = applyChain(perms, symbols);
  const steps = perms.map((p, i) => (
    i === unknownAt ? { options, answerIndex } : { given: p }
  ));
  return { tier: tierId, kind, symbols, output, steps };
}

// Tier 4: both operators unknown; the two rows share one set of 3 codes (as in
// the "most difficult levels" video). The player picks one code per row, and
// exactly one of the 9 ordered pairs must produce the output. The answer pair
// is drawn uniformly from every well-posed pair of the set, so the set again
// carries no structural cue about the answer beyond the uniqueness the format
// requires.
function generateChain2Open(tier, symbols, rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const set = optionSet(rng);
    const comps = [];
    for (let i = 0; i < set.length; i++) {
      for (let j = 0; j < set.length; j++) {
        comps.push({ i, j, key: permToString(compose(set[i], set[j])) });
      }
    }
    const counts = {};
    for (const c of comps) counts[c.key] = (counts[c.key] || 0) + 1;
    const cands = comps.filter((c) => counts[c.key] === 1 && c.key !== '1234');
    if (!cands.length) continue;
    const pick = cands[randInt(cands.length, rng)];
    return {
      tier: tier.id,
      kind: tier.kind,
      symbols,
      output: applyChain([set[pick.i], set[pick.j]], symbols),
      steps: [
        { options: set, answerIndex: pick.i },
        { options: set, answerIndex: pick.j },
      ],
    };
  }
  // Degenerate-rng backstop: a fixed configuration verified to have a unique
  // answer pair (2314 then 1243 -> total 2341; all other 8 pairs miss).
  const a = [2, 3, 1, 4];
  const b = [1, 2, 4, 3];
  const set = [a, b, [3, 2, 1, 4]];
  return {
    tier: tier.id,
    kind: tier.kind,
    symbols,
    output: applyChain([a, b], symbols),
    steps: [
      { options: set, answerIndex: 0 },
      { options: set, answerIndex: 1 },
    ],
  };
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
// real adaptive-theta scoring). Each band has a count+accuracy gate plus a
// higher-count escape at moderate accuracy, so a strictly better session
// (more correct in the same 6 minutes) never reports a lower band.
export function percentileBand(correct, attempted) {
  const acc = attempted ? correct / attempted : 0;
  if ((correct >= 14 && acc >= 0.85) || (correct >= 18 && acc >= 0.7)) {
    return { band: '90th+', label: 'Outstanding' };
  }
  if ((correct >= 11 && acc >= 0.8) || (correct >= 14 && acc >= 0.65)) {
    return { band: '80th–90th', label: 'Excellent' };
  }
  if ((correct >= 8 && acc >= 0.7) || (correct >= 10 && acc >= 0.55)) {
    return { band: '60th–80th', label: 'Good' };
  }
  if ((correct >= 5 && acc >= 0.55) || correct >= 7) {
    return { band: '40th–60th', label: 'Average' };
  }
  return { band: '<40th', label: 'Keep practicing' };
}
