# switch-game

Practice clone of the **Switch Challenge** — an AON assessment (BNP Paribas, P&G). AON's smartPredict / gamified online assessments use this test across many employers; this repo is a training tool for it.

## Quick start

```bash
python3 -m http.server 8000 --directory app
```

Then open <http://localhost:8000> in your browser. No build step, no backend — plain HTML/CSS/JS with `localStorage` for stats.

## What's here

| Path | Purpose |
| --- | --- |
| `app/` | The single-page practice app (Practice mode, 6-minute Test mode, rules, stats, tips) |
| `MECHANICS.md` | Timestamped game mechanics extracted from the reference videos |
| `TIPS.md` | Solving strategies and tips from the videos (also viewable in-app) |
| `CLAUDE.md` | Architecture, invariants, and testing guide |
| `PROGRESS.md` | Running log of work done in this repo |
| `.github/workflows/deploy-pages.yml` | Deploys `app/` to GitHub Pages from `main` |
| `LICENSE` | MIT |
| `*.mp4` | Reference tutorial videos about the assessment |

## Modes

- **Practice** — untimed, immediate feedback with a visual explanation of the correct mapping on wrong answers.
- **Test** — 6-minute session, adaptive difficulty, no feedback until the end-of-session report (score, accuracy, avg time per question, estimated percentile band).

Keyboard controls: <kbd>1</kbd>–<kbd>3</kbd> pick a code · <kbd>Enter</kbd> next · <kbd>Backspace</kbd> undo a row pick · <kbd>Esc</kbd> end/menu.
