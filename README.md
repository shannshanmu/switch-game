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
| `app/` | The single-page practice app (Practice mode, 6-minute Test mode, stats, tips) |
| `MECHANICS.md` | Timestamped game mechanics extracted from the reference videos |
| `TIPS.md` | Solving strategies and tips from the videos (also viewable in-app) |
| `PROGRESS.md` | Running log of work done in this repo |
| `*.mp4` | Reference videos of the real assessment (tutorials) |

## Modes

- **Practice** — untimed, immediate feedback with a visual explanation of the correct mapping on wrong answers.
- **Test** — 6-minute session, adaptive difficulty, no feedback until the end-of-session report (score, accuracy, avg time per question, estimated percentile band).

Keyboard controls: press <kbd>1</kbd>–<kbd>4</kbd> to pick an operator.
