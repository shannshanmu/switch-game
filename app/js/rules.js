// The Rules screen: worked, visual explanations of every level, with extra
// depth on Level 2 (the "given" operator trips most people up).
import { SYMBOL_POOL, applyOperator, applyChain, permToString } from './engine.js';
import { tileRow, chip } from './render.js';

const S = Object.fromEntries(SYMBOL_POOL.map((s) => [s.id, s]));
const row = (ids) => ids.map((id) => S[id]);

const codeCard = (perm, given = false) => `<span class="op-mini${given ? ' was-given' : ''}">${permToString(perm)}</span>`;

// A compact vertical chain: row, code, row, [code, row ...]
function chain(parts) {
  return `<div class="explain rules-chain">${parts.map((p) => (
    Array.isArray(p) ? tileRow(p, true) : p
  )).join('')}</div>`;
}

function slotLines(perm, input) {
  return `<ol class="slot-list">${perm.map((src, k) => `
    <li>Slot ${k + 1} of the new row ← position <strong>${src}</strong> of the row above ${chip(input[src - 1])}</li>`).join('')}</ol>`;
}

export function rulesHtml() {
  // ---- The one rule ----
  const top1 = row(['circle', 'cross', 'square', 'triangle']);
  const code1 = [2, 4, 1, 3];
  const out1 = applyOperator(code1, top1);

  // ---- Level 1 worked example (the exact puzzle from the user's screenshot
  // of the current assessment: options 3421 / 3412 / 3124, answer 3412) ----
  const topL1 = row(['star', 'play', 'hexagon', 'diamond']);
  const codeL1 = [3, 4, 1, 2];
  const outL1 = applyOperator(codeL1, topL1);

  // ---- Level 2, given on TOP ----
  const topA = row(['circle', 'cross', 'square', 'triangle']);
  const givenA = [2, 3, 4, 1];
  const ansA = [2, 4, 1, 3];
  const midA = applyOperator(givenA, topA);
  const outA = applyOperator(ansA, midA);

  // ---- Level 2, given on BOTTOM ----
  const topB = row(['triangle', 'square', 'cross', 'circle']);
  const ansB = [3, 2, 4, 1];
  const givenB = [2, 1, 4, 3];
  const midB = applyOperator(ansB, topB);
  const outB = applyOperator(givenB, midB);

  // ---- Level 4 ----
  const topD = row(['cross', 'triangle', 'square', 'circle']);
  const d1 = [3, 2, 4, 1];
  const d2 = [2, 3, 4, 1];
  const outD = applyChain([d1, d2], topD);

  return `
<div class="tip-block">
  <h3>The one rule everything runs on</h3>
  <p>A switch is a 4-digit code. Reading the code left to right tells you how to build the next row:
  <strong>digit <em>k</em> says which position of the row above lands in slot <em>k</em> of the row below.</strong></p>
  ${chain([top1, codeCard(code1), out1])}
  <p>Why? Decode ${codeCard(code1)} digit by digit:</p>
  ${slotLines(code1, top1)}
  <p>That's the whole game: the top row and bottom row are shown, and you pick the code (or codes) that make the journey work.</p>
</div>

<div class="tip-block">
  <h3>Level 1 — single switch</h3>
  <p>Three codes sit on a <strong>pipe ring</strong> around the centre pipe (in the real test: e.g. 3421, 3412, 3124).
  Pick the one that turns the top row into the bottom row, then press the green padlock button to lock it in.</p>
  ${chain([topL1, codeCard(codeL1), outL1])}
  <p><strong>Fastest way</strong> — don't test the options. Build the code yourself, then find it:</p>
  <ol class="slot-list">
    <li>Look at the <em>bottom</em> row's first symbol ${chip(outL1[0])}. Where does it sit in the <em>top</em> row? Position <strong>3</strong>. Write 3.</li>
    <li>Next bottom symbol ${chip(outL1[1])} → top position <strong>4</strong>. Write 4.</li>
    <li>${chip(outL1[2])} → position <strong>1</strong>. ${chip(outL1[3])} → position <strong>2</strong>.</li>
    <li>You wrote <strong>3-4-1-2</strong> → pick <strong>3412</strong> from the ring. Done.</li>
  </ol>
</div>

<div class="tip-block rules-key">
  <h3>Level 2 — double switch, one given (read this twice)</h3>
  <p>Now there are <strong>two switches stacked</strong>: your <strong>ring of three options</strong>, plus an extra code plaque
  <strong>inserted directly on the centre pipe</strong> — above or below the ring (in the real test it slots in at the pipe junctions).</p>
  <ul>
    <li>A plaque sitting <strong>on the centre pipe</strong> is <strong>not a choice</strong> — that switch is <em>always applied</em>, exactly as printed. Only ring codes are clickable.</li>
    <li>The symbols pass through <strong>both</strong> switches in top-to-bottom order: top row → first switch → a <strong>hidden middle row</strong> → second switch → bottom row.</li>
    <li>The middle row is never shown. You reconstruct it. The most common mistake is applying the second code to the <em>top</em> row — it applies to the <em>middle</em> row.</li>
    <li>Your answer is always one of the three <strong>ring</strong> codes; lock it in with the green padlock button.</li>
  </ul>

  <h4>Case A — fixed code above the ring (work downwards)</h4>
  <p>Question: top ${chip(topA[0])}${chip(topA[1])}${chip(topA[2])}${chip(topA[3])}, pipe plaque ${codeCard(givenA, true)} above the ring, bottom ${chip(outA[0])}${chip(outA[1])}${chip(outA[2])}${chip(outA[3])}.</p>
  <ol class="slot-list">
    <li>Apply the fixed code ${codeCard(givenA, true)} to the top row and <em>write the middle row down</em>:</li>
  </ol>
  ${chain([topA, codeCard(givenA, true), midA])}
  <ol class="slot-list" start="2">
    <li>Forget the top row. It's now a Level-1 puzzle: middle row → bottom row.</li>
    <li>Build the code from the bottom row: ${chip(outA[0])} sits at middle position <strong>2</strong>, ${chip(outA[1])} at <strong>4</strong>, ${chip(outA[2])} at <strong>1</strong>, ${chip(outA[3])} at <strong>3</strong> → <strong>2413</strong>. Pick it.</li>
  </ol>
  ${chain([topA, codeCard(givenA, true), midA, codeCard(ansA), outA])}

  <h4>Case B — fixed code below the ring (work upwards)</h4>
  <p>Question: top ${chip(topB[0])}${chip(topB[1])}${chip(topB[2])}${chip(topB[3])}, the ring first, then pipe plaque ${codeCard(givenB, true)}, bottom ${chip(outB[0])}${chip(outB[1])}${chip(outB[2])}${chip(outB[3])}.</p>
  <ol class="slot-list">
    <li><strong>Undo</strong> the fixed code to recover the middle row. Its digit <em>k</em> says where bottom slot <em>k</em> CAME FROM — so put the bottom's slot-<em>k</em> symbol back at middle position <em>digit k</em>. Fixed code ${codeCard(givenB, true)}: put ${chip(outB[0])} at position 2, ${chip(outB[1])} at position 1, ${chip(outB[2])} at position 4, ${chip(outB[3])} at position 3:</li>
  </ol>
  ${chain([midB, codeCard(givenB, true), outB])}
  <ol class="slot-list" start="2">
    <li>The middle row is ${chip(midB[0])}${chip(midB[1])}${chip(midB[2])}${chip(midB[3])}. Now solve top → middle as a Level-1 puzzle: ${chip(midB[0])} is top position <strong>3</strong>, ${chip(midB[1])} is <strong>2</strong>, ${chip(midB[2])} is <strong>4</strong>, ${chip(midB[3])} is <strong>1</strong> → <strong>3241</strong>. Pick it.</li>
  </ol>
  ${chain([topB, codeCard(ansB), midB, codeCard(givenB, true), outB])}
</div>

<div class="tip-block">
  <h3>Level 3 — triple switch, two fixed codes</h3>
  <p>Same idea, three switches: top → switch 1 → middle row 1 → switch 2 → middle row 2 → switch 3 → bottom. Two plaques sit on the centre pipe (always applied); you pick the third from the ring.</p>
  <ul>
    <li>Fixed codes <em>above</em> the ring: walk downwards through them, writing each middle row, then finish like Level 1.</li>
    <li>Fixed codes <em>below</em>: undo them upwards from the bottom (Case B, twice).</li>
    <li>Ring in the <em>middle</em> ("sandwich"): walk down through the first fixed code AND up through the last one — the answer is the code linking the two middle rows you wrote.</li>
    <li>When two fixed codes sit next to each other you can merge them into one code first — see the Tips page ("compose the two givens").</li>
  </ul>
</div>

<div class="tip-block">
  <h3>Level 4 — two switches, both unknown</h3>
  <p>Two rings stacked on the pipe, sharing the same three codes, and no fixed plaque. Pick <strong>one code per ring</strong> (keys fill the top ring first; Backspace un-picks; click any card to change it), then confirm. Exactly one combination works.</p>
  ${chain([topD, codeCard(d1), applyOperator(d1, topD), codeCard(d2), outD])}
  <p>Don't brute-force all nine pairs — decode the top options downwards, decode the bottom options upwards, and match the middle rows ("meet in the middle", on the Tips page).</p>
</div>

<div class="tip-block">
  <h3>How the levels, settings and the test work</h3>
  <ul>
    <li><strong>Answering</strong>: pick your ring code(s), then lock in with the green padlock button or <kbd>Enter</kbd> — nothing submits until you confirm, so you can change your mind.</li>
    <li><strong>Practice settings</strong> (on the menu): <em>Progressive</em> ramps up as you get questions right; <em>Random</em> draws from whichever of the 7 question types you tick — perfect for drilling one type. Optionally set a practice time limit, or leave it infinite.</li>
    <li><strong>Test</strong>: fixed 6 minutes, as many questions as you can. Two right in a row moves you up a level; one wrong drops you down — exactly why accuracy beats speed.</li>
    <li>The ★ Level badge in the header shows where you are on the ladder (L1 single → L2 one given → L3 two given → L4 both unknown).</li>
  </ul>
</div>`;
}
