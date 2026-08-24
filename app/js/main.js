import {
  generateQuestion, applyChain, permToString, unknownSteps, checkAnswer,
  nextTier, percentileBand, TIERS,
} from './engine.js';
import { recordSession, summary, clearStats } from './stats.js';
import { TIPS_HTML } from './tips.js';

const TEST_SECONDS = 6 * 60;

const $ = (id) => document.getElementById(id);
const screens = ['menu', 'game', 'report', 'stats', 'tips'];

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
};

/* ---------------- svg helpers ---------------- */

function symbolSvg(sym) {
  const c = sym.color;
  const shapes = {
    circle: `<circle cx="18" cy="18" r="14" fill="${c}"/>`,
    cross: `<path d="M13 4h10v9h9v10h-9v9H13v-9H4V13h9z" fill="${c}"/>`,
    square: `<rect x="5" y="5" width="26" height="26" fill="${c}"/>`,
    triangle: `<path d="M18 4 33 32H3z" fill="${c}"/>`,
    diamond: `<path d="M18 3 33 18 18 33 3 18z" fill="${c}"/>`,
    star: `<path d="M18 3l4.4 9.4 10.3 1.2-7.6 7 2 10.1L18 25.6l-9.1 5.1 2-10.1-7.6-7 10.3-1.2z" fill="${c}"/>`,
  };
  return `<svg viewBox="0 0 36 36" role="img" aria-label="${sym.label}">${shapes[sym.id]}</svg>`;
}

function funnelSvg(flip = false) {
  const pts = flip ? '30,0 190,0 220,26 0,26' : '0,0 220,0 190,26 30,26';
  return `<svg class="funnel" width="220" height="26" viewBox="0 0 220 26" aria-hidden="true">
    <polygon points="${pts}" fill="#1d7484" opacity=".88"/></svg>`;
}

function tileRow(symbols, small = false) {
  return `<div class="symbol-row${small ? ' small' : ''}">${
    symbols.map((s) => `<div class="tile">${symbolSvg(s)}</div>`).join('')}</div>`;
}

/* ---------------- screen switching ---------------- */

function show(name) {
  state.screen = name;
  for (const s of screens) $(`screen-${s}`).classList.toggle('hidden', s !== name);
  const inGame = name === 'game';
  $('level-badge').classList.toggle('hidden', !inGame);
  $('qcount').classList.toggle('hidden', !inGame);
  $('clock').classList.toggle('hidden', !(inGame && state.mode === 'test'));
  if (!inGame) setTimerBar(1);
}

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
    const cards = step.options.map((opt, i) => {
      const picked = state.picks[rowIdx] === i;
      const showKeys = isActive;
      return `<button class="op-card${picked ? ' selected' : ''}" data-row="${rowIdx}" data-opt="${i}">
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
  recordSession(session);
  renderReport(session);
  show('report');
}

function renderReport(session) {
  const acc = session.attempted ? Math.round((session.correct / session.attempted) * 100) : 0;
  const band = percentileBand(session.correct, session.attempted);
  const prevBest = summary().best;
  const cards = [
    { num: session.score, lbl: 'score (correct answers)' },
    { num: `${session.correct}/${session.attempted}`, lbl: 'correct / attempted' },
    { num: `${acc}%`, lbl: 'accuracy' },
    { num: `${(session.avgMs / 1000).toFixed(1)}s`, lbl: 'avg time per question' },
    { num: session.maxTier, lbl: 'highest level reached' },
  ];
  const tierRows = Object.entries(session.perTier).map(([t, agg]) => {
    const tl = TIERS.find((x) => x.id === Number(t))?.label ?? t;
    return `<tr><td>L${t} · ${tl}</td><td>${agg.correct}/${agg.attempted}</td></tr>`;
  }).join('');
  const bandHtml = state.mode === 'test'
    ? `<div class="stat-card"><div class="num band">${band.band}</div>
       <div class="lbl">estimated percentile — ${band.label}${band.band === '80th–90th' || band.band === '90th+' ? ' 🎯' : ''}</div></div>`
    : '';
  const bestNote = state.mode === 'test' && prevBest
    ? `<p class="muted">Best test score so far: <strong>${prevBest.score}</strong>${session.score >= prevBest.score ? ' — new best! 🏆' : ''}</p>`
    : '';
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
  const trendBars = s.trend.map((t) => {
    const h = Math.max(6, Math.round(t.accuracy * 66));
    return `<div class="bar${t.mode === 'practice' ? ' practice' : ''}" style="height:${h}px"
      title="${new Date(t.date).toLocaleDateString()} — ${Math.round(t.accuracy * 100)}% (${t.mode})"></div>`;
  }).join('');
  const tierRows = Object.entries(s.tierAgg).map(([t, agg]) => {
    const tl = TIERS.find((x) => x.id === Number(t))?.label ?? t;
    const pct = agg.attempted ? Math.round((agg.correct / agg.attempted) * 100) : 0;
    const weak = s.weakest && s.weakest.tier === Number(t) ? ' ⚠️ weakest' : '';
    return `<tr><td>L${t} · ${tl}</td><td>${agg.correct}/${agg.attempted}</td><td>${pct}%${weak}</td></tr>`;
  }).join('');
  $('stats-body').innerHTML = `
    <div class="report-grid">
      <div class="stat-card"><div class="num">${s.totalSessions}</div><div class="lbl">sessions played</div></div>
      <div class="stat-card"><div class="num">${best ? best.score : '—'}</div><div class="lbl">best test score</div></div>
      <div class="stat-card"><div class="num">${best ? `${Math.round((best.correct / best.attempted) * 100)}%` : '—'}</div><div class="lbl">accuracy on best test</div></div>
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
    } else if (e.key === 'Escape') {
      endSession();
    }
  } else if (state.screen !== 'menu' && e.key === 'Escape') {
    show('menu');
  }
});

show('menu');
