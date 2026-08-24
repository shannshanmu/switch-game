# Switch Challenge — tips & solving methods from the videos

Also viewable inside the app: **menu → "How to solve it — tips from the videos"**.

Timestamps refer to the three videos in this repo:
- **V1** = "Switch Challenge EXPLAINED" (`tm8PiEKSbrc`)
- **V2** = "How to Ace P&G Interactive Online Test" (`voDiVF71RRA`)
- **V3** = "AON switchChallenge FASTEST Solving Method" (`mqsoRw9PJ2M`)

> Note: the videos have no captions and no transcript could be produced in this environment, so these are the **visually demonstrated** methods (slides, worked examples, annotations). Anything only spoken aloud is not captured.

## 0. The rule everything builds on

Digit *k* of a code = **which top-row position feeds output slot *k***.
`[● ✚ ■ ▲]` + `2413` → `[✚ ▲ ● ■]`. (V1 05:00–06:30, V3 02:10–03:00)

## 1. The universal first step — the Total Operator (V3 05:00–12:30)

Under each **bottom** symbol write the position where it sits in the **top** row. Those four digits, read left to right, are the *total operator* — the single code equivalent to the whole chain. On a single-row question it **is** the answer. V3's motto: **"Use ONLY the numbers to solve"** — it's "Simple & Fast", "Reduces Mental Overload", "Methodical". V1 teaches the same trick as "derive the code, then match" (07:40–09:55); V2 demonstrates it in its single-row examples by labeling the bottom row (e.g. labels `1 3 4 2` → answer `1342`, Ex1 at 03:30) — in V2's chained items the same labeling is applied against the intermediate row instead.

## 2. Two rows, given operator on TOP (V2 Ex4–5, V3 Q1 12:50–16:55)

- Forward route (V2): apply the given code to the top row, write the intermediate row down, then solve the remaining single switch.
- Digits-only route (V3, faster): **backtrack** — for each digit of the total operator, find *where* that digit sits inside the given code; those positions in order spell the answer. (V3 14:30–15:50: given `3142`, total `2413` → answer `4321`.)

## 3. Two rows, given operator on BOTTOM (V2 Ex6, Ex7, Ex9, Ex10, V3 Q2 17:00–20:10)

- Backward route (V2): reconstruct the intermediate row from the bottom (bottom slot *k* came from intermediate position `given[k]`), then solve top → intermediate.
- Digits-only route (V3): compose each option with the given code and compare to the total. Composition rule, digit by digit: `composite[k] = first code's digit at position (second code's digit k)`; e.g. `2143` then `2314` compose to `1423` (V3 08:00–08:30).

## 4. The "Different Digit" shortcut (V3 18:30–19:40, 24:00–24:20)

The three options usually differ at just **one digit position**. Find it and compute **only** the composite digit that depends on it — one digit of arithmetic instead of twelve — then match against the total operator. V3 even provides a paper drill template (Option 1/2/3, a "D" box for the differing position, Mandatory, Final — 20:20–22:45).

## 5. Three rows (V2 Ex11–12; V3 Q3 22:50–24:55, Q4 27:00–28:45, Q6 34:00–38:45)

- Two givens adjacent: **compose the two givens into one code first**, then treat it as a two-row question.
- **Sandwich** (given – unknown – given), the hardest type: compute the **inverses** of both givens (inverse = "where in the code is digit *i*?"), then
  `unknown = inverse(first) ∘ total ∘ inverse(last)` — run the total through the last code's inverse, then the first's. (V3 Q6: givens `4213`/`2341`, total `4321` → answer `3142`.)
- Symbol route for the sandwich (V2 Ex12): work forward through the first given AND backward through the last given, then read the code between the two intermediate rows.

## 6. Both rows unknown (V1 10:39–31:45, V3 Q5 28:50–33:15)

- **First-digit elimination** (V3): for each top candidate, backtrack only the *first* digit of the partner code it would need; cross out candidates whose required first digit doesn't start any bottom option; finish the survivor.
- **Meet in the middle** (V1 21:50–23:45): forward-decode the three top options, backward-decode the three bottom options; the pair sharing the same middle row is the answer — max 6 decodes instead of 12 (V1 shows the 12-step brute-force cost with counters at 21:28).

## 7. Habits (V1 & V3 throughout)

- **Index the top row 1-2-3-4 immediately** — the real AON screen prints these numbers above the tiles (V3 00:20).
- **Re-check** every answer by reapplying the digit strings to the symbols once (V3 16:00, 19:50, 24:30, 28:40).
- Work left → right, one output slot at a time; write intermediates down while practicing until the digit habits stick.
- On an adaptive test, **accuracy beats raw speed**: a wrong answer drops you to easier, lower-scoring questions.

## 8. Test facts worth knowing

- **6 minutes, solve as many as possible, adaptive** (V3 01:20).
- **Seven question types** (study-guide page, V3 33:20) — all implemented in this clone, see `MECHANICS.md` §2.
- At P&G the Switch Challenge appears alongside the **Digit** and **Shape** challenges (V2's on-screen list at 00:20); the same AON (cut-e / smartPredict) test is used by many employers — BNP Paribas among them per prep guides, though no video names it on screen.
- Prep guides treat ~80th percentile as the "excellent" bar — the clone's Test-mode report estimates a band for you after each 6-minute run.
