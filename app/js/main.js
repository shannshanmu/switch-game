import {
  generateQuestion, generateQuestionOfType, applyChain, permToString,
  unknownSteps, checkAnswer, nextTier, percentileBand, TIERS, QUESTION_TYPES,
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
  practiceMode: 'progressive',  // 'progressive' | 'random'
  practiceTypes: QUESTION_TYPES.map((t) => t.id),
  question: null,
  picks: [],            // option index (or null) per unknown row, in order
  qStart: 0,
  results: [],          // {tier, correct, ms, revealed}
  answered: false,
  timed: false,
  timerTotalMs: 0,
  timedEndsAt: 0,
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
  // The countdown only means something in a timed session (test, or practice
  // with a time limit set).
  $('clock').classList.toggle('hidden', !(inGame && state.timed));
  $('timerbar').classList.toggle('hidden', !(inGame && state.timed));
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
  state.tier = 1;
  state.sessionStart = Date.now();
  state.timed = false;
  if (mode === 'practice') {
    state.practiceMode = document.querySelector('input[name="pmode"]:checked').value;
    state.practiceTypes = [...document.querySelectorAll('#setup-types input:checked')]
      .map((el) => Number(el.value));
    if (!state.practiceTypes.length) state.practiceTypes = QUESTION_TYPES.map((t) => t.id);
    if (!$('p-infinite').checked) {
      const mins = Math.max(0, Math.min(60, Number($('p-min').value) || 0));
      const secs = Math.max(0, Math.min(59, Number($('p-sec').value) || 0));
      const total = (mins * 60 + secs) * 1000;
      if (total > 0) { state.timed = true; state.timerTotalMs = total; }
    }
    savePrefs();
  } else {
    state.timed = true;
    state.timerTotalMs = TEST_SECONDS * 1000;
  }
  if (state.timed) {
    state.timedEndsAt = Date.now() + state.timerTotalMs;
    state.timerId = setInterval(tickTimer, 250);
  }
  show('game');
  if (state.timed) tickTimer();
  nextQuestion();
}

function tickTimer() {
  const left = Math.max(0, state.timedEndsAt - Date.now());
  const s = Math.ceil(left / 1000);
  $('clock').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  setTimerBar(left / state.timerTotalMs);
  if (left <= 0) endSession();
}

function nextQuestion() {
  if (state.mode === 'practice' && state.practiceMode === 'random') {
    const typeId = state.practiceTypes[Math.floor(Math.random() * state.practiceTypes.length)];
    state.question = generateQuestionOfType(typeId);
    state.tier = state.question.tier;
  } else {
    state.question = generateQuestion(state.tier);
  }
  state.picks = unknownSteps(state.question).map(() => null);
  state.answered = false;
  state.qStart = Date.now();
  state.lastAdvanceAt = Date.now();
  $('level-num').textContent = String(state.tier);
  $('qcount').textContent = `Q${state.results.length + 1}`;
  $('feedback').classList.add('hidden');
  $('btn-next').classList.add('hidden');
  $('btn-show-answer').classList.toggle('hidden', state.mode !== 'practice');
  $('btn-confirm').classList.remove('hidden');
  renderPuzzle();
}

// The active row (keyboard target) is the first row without a pick.
function activeRow() {
  return state.picks.indexOf(null);
}

function renderPuzzle() {
  const q = state.question;
  let unknownIdx = 0;
  const active = activeRow();
  const stepsHtml = q.steps.map((step) => {
    if (step.given) {
      // Given codes are plaques inserted in-line on the central pipe (the
      // real UI). The tiny "fixed" tag is a practice-only training aid.
      return `<div class="pipe-plaque-wrap">
        <button class="op-card given" disabled>${permToString(step.given)}</button>
        ${state.mode === 'practice' ? '<span class="fixed-tag">fixed</span>' : ''}</div>`;
    }
    const rowIdx = unknownIdx++;
    const showKeys = rowIdx === active && !state.answered;
    const cards = step.options.map((opt, i) => {
      const picked = state.picks[rowIdx] === i;
      return `<button class="op-card${picked ? ' selected' : ''}"
        data-row="${rowIdx}" data-opt="${i}" ${state.answered ? 'disabled' : ''}>
        ${showKeys ? `<span class="key-hint">${i + 1}</span>` : ''}${permToString(opt)}</button>`;
    }).join('');
    return `<div class="ring" data-rowwrap="${rowIdx}">${cards}</div>`;
  }).join('');

  $('puzzle').innerHTML = `
    <div class="col-indices">${[1, 2, 3, 4].map((n) => `<span>${n}</span>`).join('')}</div>
    ${tileRow(q.symbols)}
    ${funnelSvg(false)}
    <div class="manifold">${stepsHtml}</div>
    ${funnelSvg(true)}
    ${tileRow(q.output)}`;

  for (const btn of $('puzzle').querySelectorAll('.op-card:not(.given)')) {
    btn.addEventListener('click', () => pickOption(Number(btn.dataset.row), Number(btn.dataset.opt)));
  }
  updateConfirm();
}

function updateConfirm() {
  const ready = !state.answered && state.picks.length > 0 && !state.picks.includes(null);
  $('btn-confirm').disabled = !ready;
}

function pickOption(row, opt) {
  if (state.answered) return;
  // In test mode the next question renders in the same tick as confirmation,
  // so the second half of a double-tap would land on a question the player
  // never saw. No human reads a puzzle in 300ms.
  if (Date.now() - state.lastAdvanceAt < 300) return;
  state.picks[row] = opt;
  renderPuzzle();
}

function undoPick() {
  if (state.answered) return;
  const filled = state.picks.map((p, i) => (p !== null ? i : -1)).filter((i) => i >= 0);
  if (!filled.length) return;
  state.picks[filled[filled.length - 1]] = null;
  renderPuzzle();
}

function confirmAnswer() {
  if (state.answered || state.picks.includes(null) || !state.picks.length) return;
  if (Date.now() - state.lastAdvanceAt < 300) return;
  submit(false);
}

function submit(revealed) {
  const q = state.question;
  const correct = !revealed && checkAnswer(q, state.picks);
  const ms = Date.now() - state.qStart;
  state.results.push({ tier: q.tier, correct, ms, revealed });
  state.answered = true;

  // The adaptive ladder drives Test mode and Progressive practice; Random
  // practice picks its own type per question instead.
  if (state.mode === 'test' || state.practiceMode === 'progressive') {
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
  $('btn-confirm').classList.add('hidden');
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
    ${s.weakest ? `<p class="muted">Focus suggestion: drill <strong>Level ${s.weakest.tier}</strong> — in Practice, pick "Random" and tick only that level's question types.</p>` : ''}`;
}

/* ---------------- practice settings panel ---------------- */

const PREFS_KEY = `switch-challenge-prefs-v1:${location.pathname}`;

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      mode: document.querySelector('input[name="pmode"]:checked').value,
      types: [...document.querySelectorAll('#setup-types input:checked')].map((el) => Number(el.value)),
      infinite: $('p-infinite').checked,
      min: Number($('p-min').value) || 0,
      sec: Number($('p-sec').value) || 0,
    }));
  } catch (e) { /* prefs just won't persist */ }
}

function initPracticeSetup() {
  $('setup-types').innerHTML = QUESTION_TYPES.map((t) => `
    <label><input type="checkbox" value="${t.id}" checked> ${t.label}</label>`).join('');

  let prefs = null;
  try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY)); } catch (e) { /* fresh */ }
  if (prefs && typeof prefs === 'object') {
    const mode = prefs.mode === 'random' ? 'random' : 'progressive';
    document.querySelector(`input[name="pmode"][value="${mode}"]`).checked = true;
    if (Array.isArray(prefs.types) && prefs.types.length) {
      for (const el of document.querySelectorAll('#setup-types input')) {
        el.checked = prefs.types.includes(Number(el.value));
      }
    }
    $('p-infinite').checked = prefs.infinite !== false;
    if (Number.isFinite(Number(prefs.min))) $('p-min').value = Math.max(0, Math.min(60, Number(prefs.min)));
    if (Number.isFinite(Number(prefs.sec))) $('p-sec').value = Math.max(0, Math.min(59, Number(prefs.sec)));
  }

  const syncPanels = () => {
    const random = document.querySelector('input[name="pmode"]:checked').value === 'random';
    $('setup-types').classList.toggle('disabled', !random);
    $('p-time-inputs').classList.toggle('disabled', $('p-infinite').checked);
  };
  document.querySelector('#practice-setup').addEventListener('change', () => { syncPanels(); savePrefs(); });
  syncPanels();
}

/* ---------------- wiring ---------------- */

initPracticeSetup();
$('btn-practice').addEventListener('click', () => startSession('practice'));
$('btn-confirm').addEventListener('click', confirmAnswer);
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
      const row = activeRow();
      const opt = Number(e.key) - 1;
      if (row >= 0 && opt < unknowns[row].options.length) {
        pickOption(row, opt);
        e.preventDefault();
      }
    } else if (e.key === 'Backspace') {
      undoPick();
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (state.answered) nextQuestion();
      else confirmAnswer();
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
