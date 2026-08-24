import {
  generateQuestion, applyChain, permToString, unknownSteps, checkAnswer,
  nextTier, percentileBand, TIERS,
} from './engine.js';
import { recordSession, summary, clearStats } from './stats.js';
import { TIPS_HTML } from './tips.js';
import { symbolSvg, funnelSvg, tileRow } from './render.js';
import { rulesHtml } from './rules.js';

const TEST_SECONDS = 6 * 60;

const $ = (id) => document.getElementById(id);
const screens = ['menu', 'game', 'report', 'stats', 'tips', 'rules'];

// Escape anything interpolated into innerHTML that ever passed through
// localStorage — on GitHub Pages all of a user's project sites share one
// origin, so stored data is not trustworthy.
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const state = {
  screen: 'menu',
  mode: null,           // 'practice' | 'test'
  tier: 1,
  streak: 0,
  fixedTier: null,      // practice with a fixed tier, else null (auto-ramp)
  question: null,
  picks: [],            // option index per unknown row, in order
  qStart: 0,
  results: [],          // {tier, correct, ms, revealed}
  answered: false,
  testEndsAt: 0,
  timerId: null,
  sessionStart: 0,
  lastAdvanceAt: 0,   // guards against double-taps answering the next question
  screenShownAt: 0,   // guards against Escapes leaking across screen swaps
  lastClickAt: 0,     // with the three below: same-spot tap-through guard
  lastClickX: 0,
  lastClickY: 0,
  tapGuardUntil: 0,
};

/* ---------------- screen switching ---------------- */

function show(name) {
  state.screen = name;
  state.screenShownAt = Date.now();
  // A double-tap on one spot must not activate whatever the next screen
  // renders there (e.g. "End session" -> a report button). If a click caused
  // this swap, swallow follow-up clicks near the same coordinates briefly;
  // clicks elsewhere (a deliberate next action) pass through untouched.
  if (Date.now() - state.lastClickAt < 350) {
    state.tapGuardUntil = Date.now() + 350;
    state.tapGuardX = state.lastClickX;
    state.tapGuardY = state.lastClickY;
  }
  for (const s of screens) $(`screen-${s}`).classList.toggle('hidden', s !== name);
  const inGame = name === 'game';
  $('level-badge').classList.toggle('hidden', !inGame);
  $('qcount').classList.toggle('hidden', !inGame);
  $('clock').classList.toggle('hidden', !(inGame && state.mode === 'test'));
  // The countdown bar only means something in a timed test.
  $('timerbar').classList.toggle('hidden', !(inGame && state.mode === 'test'));
  if (!inGame) setTimerBar(1);
}

document.addEventListener('click', (e) => {
  const now = Date.now();
  if (now < state.tapGuardUntil
      && Math.abs(e.clientX - state.tapGuardX) < 24
      && Math.abs(e.clientY - state.tapGuardY) < 24) {
    e.stopPropagation();
    e.preventDefault();
    return;
  }
  state.lastClickAt = now;
  state.lastClickX = e.clientX;
  state.lastClickY = e.clientY;
}, true);

function setTimerBar(frac) {
  const fill = $('timerbar-fill');
  fill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  fill.style.background = frac < 0.15 ? '#e53935' : frac < 0.4 ? '#fb8c00' : '#43a047';
}

/* ---------------- game flow ---------------- */

function startSession(mode) {
  state.mode = mode;
  document.querySelector('.brand-sub').textContent = `— ${mode}`;
  state.results = [];
  state.streak = 0;
  state.sessionStart = Date.now();
  if (mode === 'practice') {
    const v = document.querySelector('input[name="ptier"]:checked').value;
    state.fixedTier = v === 'auto' ? null : Number(v);
    state.tier = state.fixedTier ?? 1;
  } else {
    state.fixedTier = null;
    state.tier = 1;
    state.testEndsAt = Date.now() + TEST_SECONDS * 1000;
    state.timerId = setInterval(tickTimer, 250);
    tickTimer();
  }
  show('game');
  nextQuestion();
}

function tickTimer() {
  const left = Math.max(0, state.testEndsAt - Date.now());
  const s = Math.ceil(left / 1000);
  $('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  setTimerBar(left / (TEST_SECONDS * 1000));
  if (left <= 0) endSession();
}

function nextQuestion() {
  state.question = generateQuestion(state.tier);
  state.picks = [];
  state.answered = false;
  state.qStart = Date.now();
  state.lastAdvanceAt = Date.now();
  $('level-num').textContent = String(state.tier);
  $('qcount').textContent = `Q${state.results.length + 1}`;
  $('feedback').classList.add('hidden');
  $('btn-next').classList.add('hidden');
  $('btn-show-answer').classList.toggle('hidden', state.mode !== 'practice');
  renderPuzzle();
}

function renderPuzzle() {
  const q = state.question;
  const unknowns = unknownSteps(q);
  let unknownIdx = 0;
  const stepsHtml = q.steps.map((step) => {
    if (step.given) {
      return `<div class="step-row"><span class="row-label">given</span>
        <button class="op-card given" disabled>${permToString(step.given)}</button><span class="row-label"></span></div>`;
    }
    const rowIdx = unknownIdx++;
    const isActive = rowIdx === state.picks.length && !state.answered;
    // Rows beyond the active one are visibly locked (tier 4): a silent dead
    // tap on a phone reads as a broken app.
    const isLocked = rowIdx > state.picks.length && !state.answered;
    const cards = step.options.map((opt, i) => {
      const picked = state.picks[rowIdx] === i;
      const showKeys = isActive;
      return `<button class="op-card${picked ? ' selected' : ''}${isLocked ? ' locked' : ''}"
        data-row="${rowIdx}" data-opt="${i}" ${isLocked ? 'disabled' : ''}>
        ${showKeys ? `<span class="key-hint">${i + 1}</span>` : ''}${permToString(opt)}</button>`;
    }).join('');
    const label = unknowns.length > 1 ? `<span class="row-label">row ${rowIdx + 1}</span>` : '<span class="row-label"></span>';
    return `<div class="step-row${isActive ? ' active-row' : ''}" data-rowwrap="${rowIdx}">${label}${cards}<span class="row-label"></span></div>`;
  }).join('<div class="pipe-joint"></div>');

  $('puzzle').innerHTML = `
    <div class="col-indices">${[1, 2, 3, 4].map((n) => `<span>${n}</span>`).join('')}</div>
    ${tileRow(q.symbols)}
    ${funnelSvg(false)}
    <div class="steps">${stepsHtml}</div>
    ${funnelSvg(true)}
    ${tileRow(q.output)}`;

  for (const btn of $('puzzle').querySelectorAll('.op-card:not(.given)')) {
    btn.addEventListener('click', () => pickOption(Number(btn.dataset.row), Number(btn.dataset.opt)));
  }
}

function pickOption(row, opt) {
  if (state.answered) return;
  // In test mode the next question renders in the same tick as the answer, so
  // the second half of a double-tap would land on a question the player never
  // saw. No human reads a puzzle in 300ms.
  if (Date.now() - state.lastAdvanceAt < 300) return;
  const unknowns = unknownSteps(state.question);
  if (row !== state.picks.length) {
    // Allow re-picking an earlier row before submission: truncate and retake.
    if (row < state.picks.length) state.picks = state.picks.slice(0, row);
    else return;
  }
  state.picks.push(opt);
  if (state.picks.length === unknowns.length) submit(false);
  else renderPuzzle();
}

function undoPick() {
  if (state.answered || state.picks.length === 0) return;
  state.picks.pop();
  renderPuzzle();
}

function submit(revealed) {
  const q = state.question;
  const correct = !revealed && checkAnswer(q, state.picks);
  const ms = Date.now() - state.qStart;
  state.results.push({ tier: q.tier, correct, ms, revealed });
  state.answered = true;

  if (state.fixedTier === null) {
    const adv = nextTier(state.tier, state.streak, correct);
    state.tier = adv.tier;
    state.streak = adv.streak;
  }

  if (state.mode === 'test') {
    // Real test shows no feedback — straight to the next question.
    nextQuestion();
    return;
  }
  showFeedback(correct, revealed, ms);
}

function showFeedback(correct, revealed, ms) {
  const q = state.question;
  markCards();
  const fb = $('feedback');
  fb.classList.remove('hidden', 'good', 'bad');
  fb.classList.add(correct ? 'good' : 'bad');
  const secs = (ms / 1000).toFixed(1);
  const title = correct ? `Correct — ${secs}s` : revealed ? 'Answer revealed' : `Not quite — ${secs}s`;
  fb.innerHTML = `<h3>${title}</h3>${correct ? '' : explanationHtml(q)}`;
  $('btn-next').classList.remove('hidden');
  $('btn-show-answer').classList.add('hidden');
  $('btn-next').focus();
}

function markCards() {
  const q = state.question;
  let rowIdx = -1;
  for (const step of q.steps) {
    if (!step.options) continue;
    rowIdx++;
    const wrap = $('puzzle').querySelector(`[data-rowwrap="${rowIdx}"]`);
    wrap.classList.remove('active-row');
    for (const btn of wrap.querySelectorAll('.op-card')) {
      const i = Number(btn.dataset.opt);
      btn.querySelector('.key-hint')?.remove();
      if (i === step.answerIndex) btn.classList.add('correct');
      else if (state.picks[rowIdx] === i) btn.classList.add('wrong');
      btn.disabled = true;
    }
  }
}

// Visual explanation: every row of symbols the chain passes through, with the
// correct code between rows.
function explanationHtml(q) {
  const perms = q.steps.map((s) => (s.given ? s.given : s.options[s.answerIndex]));
  let row = q.symbols;
  const parts = [tileRow(row, true)];
  q.steps.forEach((step, i) => {
    parts.push(`<span class="op-mini${step.given ? ' was-given' : ''}">${permToString(perms[i])}</span>`);
    row = applyChain([perms[i]], row);
    parts.push(tileRow(row, true));
  });
  return `<div class="explain">${parts.join('')}</div>
    <p class="explain-note">Digit <em>k</em> of a code says which position of the row above lands in
    slot <em>k</em> of the row below. Correct code${perms.length > 1 ? 's' : ''} shown in green above.</p>`;
}

function endSession() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  if (state.results.length === 0) { show('menu'); return; }

  const results = state.results;
  const correct = results.filter((r) => r.correct).length;
  const totalMs = results.reduce((a, r) => a + r.ms, 0);
  const perTier = {};
  for (const r of results) {
    perTier[r.tier] = perTier[r.tier] || { correct: 0, attempted: 0 };
    perTier[r.tier].attempted++;
    if (r.correct) perTier[r.tier].correct++;
  }
  const session = {
    date: new Date().toISOString(),
    mode: state.mode,
    score: correct,
    correct,
    attempted: results.length,
    avgMs: results.length ? Math.round(totalMs / results.length) : 0,
    maxTier: Math.max(...results.map((r) => r.tier)),
    perTier,
  };
  // Read the previous best BEFORE recording, or "best so far" always includes
  // the session being reported.
  const prevBest = state.mode === 'test' ? summary().best : null;
  recordSession(session);
  renderReport(session, prevBest);
  show('report');
}

function renderReport(session, prevBest) {
  const acc = session.attempted ? Math.round((session.correct / session.attempted) * 100) : 0;
  const band = percentileBand(session.correct, session.attempted);
  const cards = [
    { num: session.score, lbl: 'score (correct answers)' },
    { num: `${session.correct}/${session.attempted}`, lbl: 'correct / attempted' },
    { num: `${acc}%`, lbl: 'accuracy' },
    { num: `${(session.avgMs / 1000).toFixed(1)}s`, lbl: 'avg time per question' },
    { num: session.maxTier, lbl: 'highest level reached' },
  ];
  const tierRows = Object.entries(session.perTier).map(([t, agg]) => {
    const tl = TIERS.find((x) => x.id === Number(t))?.label ?? '';
    return `<tr><td>L${esc(t)} · ${esc(tl)}</td><td>${esc(agg.correct)}/${esc(agg.attempted)}</td></tr>`;
  }).join('');
  const bandHtml = state.mode === 'test'
    ? `<div class="stat-card"><div class="num band">${band.band}</div>
       <div class="lbl">estimated percentile — ${band.label}${band.band === '80th–90th' || band.band === '90th+' ? ' 🎯' : ''}</div></div>`
    : '';
  const prevScore = Number(prevBest?.score);
  let bestNote = '';
  if (state.mode === 'test') {
    if (!Number.isFinite(prevScore)) bestNote = '<p class="muted">First recorded test — this is your baseline. 🏁</p>';
    else if (session.score > prevScore) bestNote = `<p class="muted">Beats your previous best of <strong>${esc(prevScore)}</strong> — new best! 🏆</p>`;
    else if (session.score === prevScore) bestNote = `<p class="muted">Ties your best score of <strong>${esc(prevScore)}</strong>.</p>`;
    else bestNote = `<p class="muted">Best test score so far: <strong>${esc(prevScore)}</strong>.</p>`;
  }
  $('report-body').innerHTML = `
    <div class="report-grid">${cards.map((c) => `<div class="stat-card"><div class="num">${c.num}</div><div class="lbl">${c.lbl}</div></div>`).join('')}${bandHtml}</div>
    <table class="tier-table"><tr><th>Level</th><th>Correct</th></tr>${tierRows}</table>
    ${bestNote}
    ${state.mode === 'test' ? '<p class="muted">Percentile is an estimate from prep-guide bands, not AON\'s real adaptive scoring.</p>' : ''}`;
}

function renderStats() {
  const s = summary();
  if (s.totalSessions === 0) {
    $('stats-body').innerHTML = '<p class="muted">No sessions yet — play a round first!</p>';
    return;
  }
  const best = s.best;
  const bestScore = Number(best?.score);
  const bestAcc = Number(best?.correct) / Number(best?.attempted);
  const trendBars = s.trend.map((t) => {
    const h = Math.max(6, Math.round(t.accuracy * 66));
    const when = new Date(t.date);
    const dateLabel = Number.isNaN(when.getTime()) ? '?' : when.toLocaleDateString();
    return `<div class="bar${t.mode === 'practice' ? ' practice' : ''}" style="height:${h}px"
      title="${esc(dateLabel)} — ${Math.round(t.accuracy * 100)}% (${esc(t.mode)})"></div>`;
  }).join('');
  const tierRows = Object.entries(s.tierAgg).map(([t, agg]) => {
    const tl = TIERS.find((x) => x.id === Number(t))?.label ?? '';
    const pct = agg.attempted ? Math.round((agg.correct / agg.attempted) * 100) : 0;
    const weak = s.weakest && s.weakest.tier === Number(t) ? ' ⚠️ weakest' : '';
    return `<tr><td>L${esc(t)} · ${esc(tl)}</td><td>${esc(agg.correct)}/${esc(agg.attempted)}</td><td>${pct}%${weak}</td></tr>`;
  }).join('');
  $('stats-body').innerHTML = `
    <div class="report-grid">
      <div class="stat-card"><div class="num">${s.totalSessions}</div><div class="lbl">sessions played</div></div>
      <div class="stat-card"><div class="num">${Number.isFinite(bestScore) ? esc(bestScore) : '—'}</div><div class="lbl">best test score</div></div>
      <div class="stat-card"><div class="num">${Number.isFinite(bestAcc) ? `${Math.round(bestAcc * 100)}%` : '—'}</div><div class="lbl">accuracy on best test</div></div>
    </div>
    <h3 style="color:#1d7484;margin:8px 0 2px">Accuracy — last ${s.trend.length} sessions</h3>
    <div class="trend">${trendBars}</div>
    <p class="muted">teal = test, light = practice</p>
    <table class="tier-table"><tr><th>Level</th><th>Correct</th><th>Accuracy</th></tr>${tierRows}</table>
    ${s.weakest ? `<p class="muted">Focus suggestion: drill <strong>Level ${s.weakest.tier}</strong> in practice mode (fixed difficulty).</p>` : ''}`;
}

/* ---------------- wiring ---------------- */

$('btn-practice').addEventListener('click', () => startSession('practice'));
$('btn-test').addEventListener('click', () => startSession('test'));
$('btn-stats').addEventListener('click', () => { renderStats(); show('stats'); });
$('btn-tips').addEventListener('click', () => { $('tips-body').innerHTML = TIPS_HTML; show('tips'); });
$('btn-rules').addEventListener('click', () => { $('rules-body').innerHTML = rulesHtml(); show('rules'); });
$('btn-rules-menu').addEventListener('click', () => show('menu'));
$('btn-quit').addEventListener('click', endSession);
$('btn-next').addEventListener('click', nextQuestion);
$('btn-show-answer').addEventListener('click', () => { if (!state.answered) submit(true); });
$('btn-again').addEventListener('click', () => startSession(state.mode));
$('btn-report-menu').addEventListener('click', () => show('menu'));
$('btn-stats-menu').addEventListener('click', () => show('menu'));
$('btn-tips-menu').addEventListener('click', () => show('menu'));
$('btn-clear-stats').addEventListener('click', () => {
  if (window.confirm('Delete all saved stats?')) { clearStats(); renderStats(); }
});

document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd/Alt combos are browser shortcuts (e.g. Cmd+1 = first tab), not
  // answers.
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (state.screen === 'game') {
    if (e.key >= '1' && e.key <= '3' && !state.answered) {
      const unknowns = unknownSteps(state.question);
      const row = state.picks.length;
      const opt = Number(e.key) - 1;
      if (row < unknowns.length && opt < unknowns[row].options.length) {
        pickOption(row, opt);
        e.preventDefault();
      }
    } else if (e.key === 'Backspace') {
      undoPick();
      e.preventDefault();
    } else if ((e.key === 'Enter' || e.key === ' ') && state.answered) {
      nextQuestion();
      e.preventDefault();
    } else if (e.key === 'Escape' && !e.repeat) {
      endSession();
    }
  } else if (state.screen !== 'menu' && e.key === 'Escape' && !e.repeat
      && Date.now() - state.screenShownAt > 400) {
    // The second Escape of a quick double-press must not blow past the report.
    show('menu');
  }
});

show('menu');
