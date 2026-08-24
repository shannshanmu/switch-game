# Progress

## 2026-08-24 — Switch Challenge clone built (branch `claude/switch-challenge-clone-opphct`)

- **Analyzed all three reference videos** (~86 min total) frame-by-frame: 44 timestamped contact sheets + ~60 full-res extractions via ffmpeg. No transcription was possible (sandbox network policy blocks all speech-to-text model hosts), so analysis is visual-only — the tutorials show everything on screen, so coverage is good; spoken-only remarks are lost. Findings consolidated in `MECHANICS.md`; solving methods in `TIPS.md`.
- **Key findings**: operator digit semantics verified (`out[k] = in[digit_k]`); always 4 symbols and 3 options; difficulty ramps via chaining (the "7 question types"); 6-minute adaptive test; real UI has level badge + progress bar and prints 1-4 above the top row. Written-spec points overridden by video: option count never grows; no fixed question count.
- **Built the app** (`app/`, vanilla JS, no build step): Practice mode (untimed, visual chain explanation on wrong answers, show-answer), Test mode (6:00 countdown, adaptive 4-level ladder, no feedback until report), question generator with near-miss distractors and exhaustively verified unique answers, end report with estimated percentile band, localStorage stats (best score, accuracy trend, weakest level), full keyboard controls, in-app tips page.
- **Verified**: node engine test (8k questions/tiers, exactly-one-answer proof) + Playwright smoke test (all flows, zero console errors) — all green. Screenshots shared in session.
- **Docs**: README reworded to "AON assessment (BNP Paribas, P&G)"; CLAUDE.md created (run command, invariants, testing notes); this file updated.
- Run with: `python3 -m http.server 8000 --directory app`
- **Next step**: none queued — possible follow-ups: calibrate percentile bands against real attempt data; optional sounds; deploy to GitHub Pages if wanted.

## Earlier

- Claude GitHub App installed on shannshanmu/switch-game (via `/install-github-app`; needed `gh auth refresh -h github.com -s repo,workflow` first). No `.github/workflows/claude.yml` yet — install only granted app permissions.
- Committed & pushed (6db37d6): 3 reference .mp4 videos (~58–60 MB each), `.claude/settings.json` (intentionally committed), initial PROGRESS.md.
- GitHub warned the videos exceed its recommended 50 MB/file limit — pushed anyway per user choice (no Git LFS). Revisit if more/larger videos get added.
