# Switch Challenge — mechanics extracted from the reference videos

Sources (the three `.mp4` files in this repo):

| # | Video | YouTube id | Length | Nature |
| --- | --- | --- | --- | --- |
| V1 | "Switch Challenge EXPLAINED — new tricks" | `tm8PiEKSbrc` | 33:35 | YouTuber slide deck mimicking the AON art style; no real-test recording |
| V2 | "How to Ace P&G Interactive Online Test" | `voDiVF71RRA` | 13:56 | Talking head + 12 worked examples screen-recorded from an example/practice screen of unidentified provenance (possibly AON's own example mode); **one real P&G assessment screenshot at 01:02** |
| V3 | "AON switchChallenge FASTEST Solving Method" | `mqsoRw9PJ2M` | 39:04 | YouTuber slide deck; **real AON UI thumbnail at 00:20**; JobTestPrep guide pages at 33:20–33:36 |

Analysis method: no video plugin was available in this environment and the sandbox network policy blocks all speech-to-text model downloads, so the videos were analyzed **visually** — 44 timestamped contact sheets (1 frame / 10 s over all 86 minutes) plus ~60 full-resolution frames at points of interest. All spoken-only content is lost; everything below is read off the frames and verified arithmetically. Full per-video reports were produced during analysis; their substance is consolidated here.

---

## 1. Core mechanic

- A **top row of 4 symbol tiles** falls through a **funnel** into one or more **operator stages**, then out through a second (inverted) funnel to a **bottom row of 4 tiles** (V1 01:00, V2 01:02+02:40, V3 01:20).
- Each operator is a **4-digit permutation code** displayed on a card. Unsolved stages show **3 candidate cards**; in multi-stage puzzles, "mandatory" (given) operators appear as single differently-colored cards (dark navy in V2, purple in V3).
- **The player picks, per unsolved stage, the code that makes the whole chain transform the top row into the bottom row.**
- Classic symbol set everywhere: **green circle, blue cross, red/orange square, yellow triangle** (V3's slides substitute a blue star for the cross; the real-UI thumbnail at V3 00:20 shows cross/triangle/square/circle).
- The **real AON UI prints the position numbers 1 2 3 4 above the top row** (V3 00:20).

### Code semantics — verified, this is the load-bearing rule

> **Digit *k* of the code names the top-row position whose symbol lands in output slot *k*:** `out[k] = in[digit_k]`.

Verified against 9+ worked decodes across all three videos; the rival reading ("input *k* goes to output position digit *k*") is falsified by every one of them:

- V1 05:00–06:30 — top `[circle, cross, square, triangle]`, code `2413` → `[cross, triangle, circle, square]` ✔ (answer to V1's example 1).
- V2 02:40–03:20 — top `[square, triangle, cross, circle]`, code `3241` → `[cross, triangle, circle, square]` ✔.
- V2 01:02 (real P&G screen) — top `[cross, circle, triangle, square]`, options `1432/4123/2413`, bottom `[cross, square, triangle, circle]` → only `1432` works ✔.
- V3 02:10–03:00 — top `[square, triangle, circle, star]`, code `2314` → `[triangle, circle, square, star]` ✔.

Chaining: the first operator's output (an intermediate row the game never displays) feeds the second operator, and so on (V1 19:58 shows the intermediate explicitly; V2 Ex4 05:55; V3 Q1 re-check 16:20).

## 2. Question types & difficulty ramp

The study-guide page flashed in V3 (33:20) states: **"There are seven question types on the switchChallenge test."** The taxonomy slides (V3 03:10–04:55) plus the worked examples across all videos cover exactly seven:

| Type | Layout (top→bottom between the funnels) | Seen in |
| --- | --- | --- |
| 1 | Single row — 3 options | V1 ex1, V2 Ex1–3, V3 10:50 |
| 2 | Two rows — **given** then options | V2 Ex4–5, V3 Q1 |
| 3 | Two rows — options then **given** | V2 Ex6, Ex7, Ex9, Ex10, V3 Q2 |
| 4 | Two rows — options in **both** rows (no given) | V1 ex2–3, V3 Q5 |
| 5 | Three rows — given, given, options | V2 Ex8, Ex11, V3 Q4 |
| 6 | Three rows — options, given, given | V3 Q3 |
| 7 | Three rows — given, **options**, given ("sandwich") | V2 Ex12, V3 Q6 |

Constants across every example in every video:

- Symbol count is **always 4**; option count per unsolved row is **always 3**.
- Difficulty ramps **only** by chain depth (1 → 2 → 3 stages) and by which stage is unknown; the "both unknown" type (V1's "most difficult levels") and the sandwich are the top end.
- In both V1 chained examples and the V3 real-UI thumbnail, the two option rows of type-4 questions contain **the same 3 codes** (possibly a simplification — flagged under ambiguities).

## 3. Timer, flow, adaptivity

- V3 facts slide (01:20): "**6 minutes** — Solve as many questions as possible — Identify sequence of operators — **Adaptive test**". No further adaptivity detail is shown in any video.
- The real P&G screenshot (V2 01:02) shows a green header with the P&G logo, breadcrumb `// switchChallenge - Example`, a **star + "Level 2" badge** (could read "Level 3"), and a **bar-style progress/timer** under the header.
- The example-screen recordings (V2 03:25–13:45, provenance unidentified) show a thin yellow elapsed bar with a numeric clock (digits cropped/unreadable).
- **Not shown anywhere:** per-question time limits, question counts, wrong/skip behavior, feedback animations, scoring or percentiles.

## 4. UI reference (for the clone's styling)

- Near-white background with pastel diamond/triangle decorations (V1, V3 real-UI thumbnail).
- White symbol tiles with soft drop shadows; teal funnels (≈ `#1d7484`); pale-teal rounded frame around the operator stages (V1).
- White option cards with large letter-spaced digits; given/mandatory operators on dark cards (navy in V2, purple in V3).
- Green header bar with level badge and progress bar (V2 real screenshot).
- Symbol colors ≈ circle `#3e8e58`, cross `#3d78c9`, square `#e2694e`, triangle `#f0b400` (sampled from V1 frames).

## 5. Companies & context

- V2: P&G logo in the real assessment header; the P&G test lists **Digit Challenge / Switch Challenge / Shape Challenge** (on-screen list at 00:20; "Grid Challenge" is JobTestPrep's name for a similar task, seen only in V3's simulator screenshots at 25:00–26:55).
- V3: test is named "AON switchChallenge" throughout; guide author is an "Aon / cut-e Assessments Expert" (33:36) — the same AON smartPredict test is used by many employers, including **BNP Paribas** (per the user's context; BNP is not named on-screen in any of the three videos).

## 6. Solving methods taught (full write-up in `TIPS.md` and in-app)

- Number the top row 1–4; **derive the "total operator"** by writing under each bottom symbol its top-row position (V3's universal "Step 1", V2's labeling in its single-row examples Ex1–3, V1's "method 2"; in V2's chained items the same labeling trick is applied against the intermediate row instead).
- Digit-only **composition** (`composite[k] = first[second[k]]`), **backtracking**, **inverses**, and the **"Different Digit"** shortcut (V3 07:40–24:20).
- **Meet in the middle** for double-unknown questions (V1 21:50–31:45); **first-digit elimination** (V3 Q5 30:00–32:50).
- Sandwich formula: `unknown = inverse(first) ∘ total ∘ inverse(last)` (V3 Q6 35:10–38:45).
- **Re-check** each answer by reapplying the digits to the symbols (V3, four times).

---

## 7. Video vs. the written spec (video wins)

| Written spec | Video evidence | Clone follows |
| --- | --- | --- |
| "More operator options are added as the test progresses" | Option count is always 3; difficulty ramps by **chaining operators** and moving the unknown | Video: always 3 options, ramp by chain depth |
| "~12–20 questions" | "Solve as many questions as possible" in 6 minutes (V3 01:20) | Video: unlimited pool, 6-minute cap |
| "4 symbols in a row" | Confirmed everywhere | Same |
| "adaptive difficulty (harder after correct streaks)" | "Adaptive test" confirmed (V3 01:20), mechanism unspecified | Spec's streak model (2 correct → up, 1 wrong → down) |
| 6-minute session timer | Confirmed (V3 01:20) | Same |

## 8. Ambiguities and the defaults the clone chose

None of these blocked a faithful build; each has a reasonable default, flagged here for review:

1. **Adaptive rule** — videos only say "adaptive". Default: start at Level 1; two consecutive correct → level up, any wrong → level down (streak model from the written spec).
2. **Wrong/skip behavior** — never shown in any video. Default: no skipping; a pick is required to advance; no feedback during Test mode (an assumption — real assessments generally withhold feedback, but no video shows post-answer behavior), instant feedback in Practice mode.
3. **Shared option set in double-unknown questions** — V1 and the V3 thumbnail both show identical code sets in the two rows, so the clone does the same (with a guaranteed-unique answer pair among the 9 combinations).
4. **Timer style** — real UI shows a bar plus (cropped) clock. Clone shows a green header bar + mm:ss countdown of the global 6:00.
5. **Level count** — real "Level N" badge values beyond 2/3 unknown. Clone uses 4 levels mapping the 7 question types: L1 = type 1, L2 = types 2–3, L3 = types 5–7, L4 = type 4. Ranking type 4 on top is a **clone design choice**: V1 devotes its "Solving the most difficult levels" deck to the both-unknown type, but that phrase is the video's title card, and V2/V3 both call the three-row sandwich their hardest worked example.
6. **Scoring/percentile** — nothing on-screen. Clone reports raw correct count and an **estimated** percentile band from prep-guide conventions (80th+ ≈ "excellent"). Each band has a count+accuracy gate plus a higher-count escape at moderate accuracy so more-correct never ranks lower: 90th+ at ≥14 correct & ≥85% accuracy (or ≥18 & ≥70%), 80th–90th at ≥11 & ≥80% (or ≥14 & ≥65%), 60th–80th at ≥8 & ≥70% (or ≥10 & ≥55%), 40th–60th at ≥5 & ≥55% (or ≥7 at any accuracy). These bands are calibration guesses, not AON data.
7. **Symbol variety** — real test appears to always use the classic four; the clone uses them ~80% of the time and occasionally swaps in other shapes for variety (configurable by editing `SYMBOL_POOL` in `app/js/engine.js`).
