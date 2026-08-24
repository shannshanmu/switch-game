// Tips distilled from the three reference videos (see TIPS.md for the
// timestamped source notes). Rendered on the in-app "How to solve it" page.
export const TIPS_HTML = `
<div class="tip-block">
  <h3>What the 4-digit code means</h3>
  <p>The code lists, left to right, <strong>where each output symbol comes from</strong>:
  digit <em>k</em> of the code names the top-row position that lands in output slot <em>k</em>.
  Example: top row ● ✚ ■ ▲ with code <span class="digit-demo">2413</span> gives
  ✚ ▲ ● ■ (slot 1 ← position 2, slot 2 ← position 4, slot 3 ← position 1, slot 4 ← position 3).</p>
  <p class="ts">Verified in all three videos — e.g. "Switch Challenge EXPLAINED" 05:00–06:30, "FASTEST Solving Method" 02:10–03:00.</p>
</div>

<div class="tip-block">
  <h3>The test at a glance</h3>
  <ul>
    <li><strong>6 minutes</strong>, solve as many as possible, <strong>adaptive</strong> difficulty.</li>
    <li>Always 4 symbols and always 3 codes per unsolved row; difficulty grows by <strong>stacking operators</strong> (up to 3 rows) and by which row is unknown.</li>
    <li>There are <strong>7 question types</strong>: single row; two rows with the given ("mandatory") operator on top or bottom; two rows with both unknown; three rows with the unknown first, middle ("sandwich") or last.</li>
    <li>At <strong>P&amp;G</strong> it appears alongside the Digit and Shape challenges (on-screen list in the P&amp;G video, 00:20). It's an AON (smartPredict / cut-e) test used by many employers — <strong>BNP Paribas</strong> among them per prep guides, though no video names it on screen.</li>
  </ul>
  <p class="ts">"FASTEST Solving Method" 01:20 (facts slide); type count from its study-guide page at 33:20 ("There are seven question types"), the seven-way breakdown from its taxonomy slides at 03:10–04:55.</p>
</div>

<div class="tip-block">
  <h3>Step 1 — always: find the Total Operator</h3>
  <p>Under each <strong>bottom</strong> symbol, write the position where that symbol sits in the
  <strong>top</strong> row. Reading those four digits left to right gives the <em>total operator</em> —
  the single code equivalent to the whole chain. From here on, work <strong>only with numbers</strong>,
  never the symbols ("Use ONLY the numbers to solve" — it is simple &amp; fast, reduces mental
  overload, and is methodical).</p>
  <p>On a <strong>single-row</strong> question the total operator IS the answer — just find it among the three options.</p>
  <p class="ts">"FASTEST Solving Method" 05:00–12:30; same idea as the "derive the code from the bottom row" trick in "Switch Challenge EXPLAINED" 07:40–09:55.</p>
</div>

<div class="tip-block">
  <h3>Composing two codes (given operator on top)</h3>
  <p>When the given operator comes <strong>first</strong>, you need the option that composes with it
  into the total. Digit-by-digit rule: <code>composite[k] = first code's digit at the position named
  by the second code's digit k</code>. Example: 2143 then 2314 compose to
  <span class="digit-demo">1423</span>.</p>
  <p>Faster: <strong>backtrack</strong> — for each digit of the total operator, find <em>where</em> that
  digit sits in the given code; those positions, in order, spell the missing code.</p>
  <p class="ts">"FASTEST Solving Method" 07:40–08:35 (composition), 14:30–15:50 (backtracking, Q1).</p>
</div>

<div class="tip-block">
  <h3>Given operator on the bottom — work backwards</h3>
  <p>Reconstruct the intermediate row from the bottom: bottom slot <em>k</em> came from intermediate
  position <code>given[k]</code>. Then solve top → intermediate as a single-row question.
  Equivalently, stay in digits and compose each option with the given code, comparing against the
  total operator.</p>
  <p class="ts">"How to Ace P&amp;G" Ex6, Ex7, Ex9, Ex10 (07:50–12:20); "FASTEST Solving Method" Q2 17:00–20:10.</p>
</div>

<div class="tip-block">
  <h3>Speed shortcut — "The Different Digit"</h3>
  <p>The three options usually differ at only <strong>one digit position</strong>. Find it, and compute
  only the composite digit that depends on it — one digit of arithmetic instead of twelve — then
  match against the total operator.</p>
  <p class="ts">"FASTEST Solving Method" 18:30–19:40 (Q2), 24:00–24:20 (Q3).</p>
</div>

<div class="tip-block">
  <h3>Three rows — compose the two givens first</h3>
  <p>With two mandatory codes, compose them into one code, then solve as a two-row question
  (backtrack if the unknown is on top, compose if it's at the bottom).</p>
  <p>For the hardest "<strong>sandwich</strong>" type (given – unknown – given), invert the two givens
  (inverse = "where in the code is digit <em>i</em>?") and plug into:
  <code>unknown = inverse(first) ∘ total ∘ inverse(last)</code> — i.e. run the total through the last
  code's inverse, then the first code's inverse.</p>
  <p class="ts">"FASTEST Solving Method" Q3/Q4 22:50–28:45, Q6 34:00–38:45; "How to Ace P&amp;G" Ex11–Ex12 12:20–13:45.</p>
</div>

<div class="tip-block">
  <h3>Both rows unknown — eliminate, then meet in the middle</h3>
  <ul>
    <li><strong>First-digit elimination:</strong> for each top candidate, backtrack only the FIRST digit
    of the partner code it would need; cross out every top candidate whose needed first digit
    doesn't start any bottom option. Usually one pair survives after one or two digits.</li>
    <li><strong>Meet in the middle:</strong> decode the top candidates forward and the bottom candidates
    backward from the output; the pair sharing the same middle row is the answer (max 6 decodes
    instead of brute-forcing all 9 pairings — up to 12 decode steps, as the V1 counters show).</li>
  </ul>
  <p class="ts">"FASTEST Solving Method" Q5 28:50–33:15; "Switch Challenge EXPLAINED" 21:50–31:45.</p>
</div>

<div class="tip-block">
  <h3>Habits that save the run</h3>
  <ul>
    <li><strong>Index the top row 1-2-3-4 first</strong> — the real test even prints the numbers above the tiles.</li>
    <li><strong>Re-check</strong> every answer by re-applying the digit strings to the symbols once — a few seconds against a costly adaptive drop.</li>
    <li>Work left to right, one output slot at a time; never track more than one row in your head — write intermediates down in practice until the digit habits stick.</li>
    <li>Accuracy beats raw speed on an adaptive test: a wrong answer drops you to easier, lower-scoring questions.</li>
  </ul>
  <p class="ts">"FASTEST Solving Method" 16:00/19:50/24:30/28:40 (re-checks); real-UI thumbnail 00:20 (printed indices).</p>
</div>
`;
