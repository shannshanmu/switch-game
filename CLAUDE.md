# CLAUDE.md

Practice clone of the **Switch Challenge**, an AON assessment (BNP Paribas, P&G). Single-page web app, no backend, no build step, no dependencies.

## Run

```bash
python3 -m http.server 8000 --directory app
```

Open http://localhost:8000. (Any static server works; ES modules mean `file://` won't.)

## Layout

| Path | What |
| --- | --- |
| `app/index.html` | All screens (menu / game / report / stats / rules / tips) as toggled `<section>`s |
| `app/style.css` | Styling modeled on the real AON UI (see `MECHANICS.md` §4) |
| `app/js/engine.js` | Pure game logic: permutations, question generation, tiers, adaptive ladder, percentile bands |
| `app/js/main.js` | App controller: modes, keyboard/touch guards, timer, report/stats screens |
| `app/js/render.js` | Shared SVG/HTML renderers (symbols, funnels, tile rows, chips) |
| `app/js/rules.js` | The Rules screen: worked visual examples per level |
| `app/js/stats.js` | localStorage persistence (`switch-challenge-stats-v1:<pathname>`) |
| `app/js/tips.js` | In-app tips content (source notes in `TIPS.md`) |
| `.github/workflows/deploy-pages.yml` | Pages deploy from `main` (probes that Pages is enabled with the Actions source) |
| `MECHANICS.md` | Timestamped mechanics extracted from the videos — **source of truth for behavior** |
| `TIPS.md` | Solving methods from the videos, with timestamps |
| `PROGRESS.md` | Running log of work done in this repo |
| `*.mp4` | The three reference videos (tutorials about the real test) |

## Invariants — do not change without re-reading MECHANICS.md

- **Operator semantics**: `out[k] = in[digit_k]` (digit *k* of a code names the top-row position that feeds output slot *k*). Verified against 9+ on-screen decodes across all three videos.
- **Always 4 symbols, always 3 options per unsolved row.** Difficulty ramps only by chain depth and unknown position (the 7 question types, `MECHANICS.md` §2).
- **Option sets are exchangeable clouds** (`optionSet` in engine.js): the set is generated first and the correct member designated uniformly afterwards, so no set-level statistic — parity, digit overlap, pairwise distances — identifies the answer. An adversarial review found the previous transposition-only distractors made the correct code the parity odd-one-out, a 100% shortcut that would train a reflex useless on the real test. Any change to option generation must keep the anti-heuristic regression tests at ~chance.
- Tier 4 (both rows unknown) uses **one shared option set** for both rows; the answer pair is drawn uniformly from every pair whose composition is unique among the 9.
- Every generated question has **exactly one** valid answer combination, including under degenerate/constant `rng` inputs (backstops in engine.js).
- **Layout follows the current real UI** (user screenshots, `MECHANICS.md` §6b): options on a pipe ring, given plaques in-line on the central pipe, and answers submit only via the **green padlock confirm bar** (or Enter) — never on pick.
- Test mode: global 6:00 countdown, adaptive (2 consecutive correct → level up, wrong → level down), **no feedback until the end report**. Practice mode: instant feedback with the visual chain explanation; configurable via the setup panel (Progressive/Random over the 7 question types, optional time limit, persisted in `switch-challenge-prefs-v1:<pathname>`).
- Mobile guards in main.js are load-bearing (found by adversarial review): the 300ms `lastAdvanceAt` window (double-tap would answer the next, unseen question), the same-spot tap-through guard on screen swaps, the Escape `repeat`/timing guards, and `esc()` on everything localStorage-derived that reaches `innerHTML` (Pages project sites share the `username.github.io` origin).

## Testing

No test framework in the repo; tests live outside the app to keep it dependency-free. During development they were run as:

- Engine: a node script importing `app/js/engine.js` that generates thousands of questions per tier and exhaustively verifies exactly-one-valid-answer, option counts, and the adaptive ladder; anti-heuristic regressions (parity odd-one-out solvers and a min-distance solver must score ~chance, not 100%); degenerate constant-rng inputs (no hangs, no identity chains, tier labels intact); percentile-band monotonicity; stats corruption resistance against corrupt-but-parseable localStorage payloads.
- UI: a Playwright smoke test (Chromium, desktop + 390px/360px touch viewports) driving rules → practice (pick-then-confirm flow, feedback, show-answer, Ctrl+1 ignored) → random mode with single-type drilling + prefs persistence → timed practice expiry → test (clock, no feedback, report with percentile) → stats persistence + stored-XSS non-execution → tier-4 free pick order/undo/confirm gating → double-tap on confirm answering exactly one question, double-Escape keeping the report, zero horizontal overflow, ≥44px touch targets.

If you change `engine.js` or `main.js`, re-create equivalents of those checks (or ask for the scripts) before pushing.

## Conventions

- Vanilla ES modules, no framework, no build. Keep it that way — "runs with one command" is a requirement.
- The percentile band in the report is an **estimate from prep-guide conventions**, not AON data; keep it labeled as such in the UI.
- Keyboard support matters (speed training): 1–3 pick, Backspace undo, Enter next, Esc end/menu.
- Videos are large (~60 MB each, over GitHub's 50 MB warning threshold, committed without LFS deliberately) — don't add more binaries without asking.
