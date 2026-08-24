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
| `app/index.html` | All screens (menu / game / report / stats / tips) as toggled `<section>`s |
| `app/style.css` | Styling modeled on the real AON UI (see `MECHANICS.md` §4) |
| `app/js/engine.js` | Pure game logic: permutations, question generation, tiers, adaptive ladder, percentile bands |
| `app/js/main.js` | App controller: rendering, modes, keyboard, timer, report/stats screens |
| `app/js/stats.js` | localStorage persistence (`switch-challenge-stats-v1`) |
| `app/js/tips.js` | In-app tips content (source notes in `TIPS.md`) |
| `MECHANICS.md` | Timestamped mechanics extracted from the videos — **source of truth for behavior** |
| `TIPS.md` | Solving methods from the videos, with timestamps |
| `PROGRESS.md` | Running log of work done in this repo |
| `*.mp4` | The three reference videos (tutorials of the real test) |

## Invariants — do not change without re-reading MECHANICS.md

- **Operator semantics**: `out[k] = in[digit_k]` (digit *k* of a code names the top-row position that feeds output slot *k*). Verified against 9+ on-screen decodes across all three videos.
- **Always 4 symbols, always 3 options per unsolved row.** Difficulty ramps only by chain depth and unknown position (the 7 question types, `MECHANICS.md` §2).
- Tier 4 (both rows unknown) uses **one shared option set** for both rows, with a guaranteed-unique answer pair among the 9 combinations.
- Every generated question has **exactly one** valid answer combination (distinct symbols make distinct permutations produce distinct outputs; tier 4 checks all 9 pairs explicitly).
- Test mode: global 6:00 countdown, adaptive (2 consecutive correct → level up, wrong → level down), **no feedback until the end report**. Practice mode: untimed, instant feedback with the visual chain explanation on wrong answers.

## Testing

No test framework in the repo; tests live outside the app to keep it dependency-free. During development they were run as:

- Engine: a node script importing `app/js/engine.js` that generates thousands of questions per tier and exhaustively verifies exactly-one-valid-answer, option counts, near-miss distractor distances (2–3 digit differences), and the adaptive ladder.
- UI: a Playwright smoke test (Chromium) driving menu → practice (keyboard answers, feedback, show-answer) → test (clock, no feedback, report with percentile) → stats persistence across reload → tier-4 two-row picks + Backspace undo.

If you change `engine.js` or `main.js`, re-create equivalents of those checks (or ask for the scripts) before pushing.

## Conventions

- Vanilla ES modules, no framework, no build. Keep it that way — "runs with one command" is a requirement.
- The percentile band in the report is an **estimate from prep-guide conventions**, not AON data; keep it labeled as such in the UI.
- Keyboard support matters (speed training): 1–3 pick, Backspace undo, Enter next, Esc end/menu.
- Videos are large (~60 MB each, over GitHub's 50 MB warning threshold, committed without LFS deliberately) — don't add more binaries without asking.
