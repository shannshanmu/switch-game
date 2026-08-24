# Progress

## 2026-08-24 (later) — Adversarial review consolidation, Rules screen, Pages deploy

- **Four-agent adversarial review** (engine math, UI/mobile, docs-vs-evidence, deployment) + consolidation. Key fixes, all verified by extended regression tests:
  - **Engine**: option sets rebuilt as exchangeable clouds — the old transposition-only distractors made the correct code the parity odd-one-out (a 100% no-look shortcut; the worst possible defect in a training tool). Also: degenerate-rng hang/identity-chain/tier-4-fallback backstops; percentile bands made monotone in correct-count.
  - **UI/mobile**: double-tap could answer the next unseen question (300ms guard); double-Escape destroyed the end-of-test report; tap-through on screen swaps hit report buttons; horizontal overflow on ≤390px phones; stored-XSS via stats `innerHTML` (esc() + storage validation — Pages project sites share one origin); Ctrl/Cmd+1 answered while switching tabs; tier-4 row 2 now visibly locked; 44px+ touch targets; timer bar hidden in untimed practice.
  - **Docs**: 15 precision fixes (mis-filed V2 Ex8, over-claimed video attributions for BNP/company facts, V2 provenance, keyboard contract, stale comments).
- **Rules screen added** (user request): worked visual examples for every level, deepest on Level 2's given-operator flow, reusing the game's own tile/funnel renderers (`app/js/rules.js`, `render.js`).
- **GitHub Pages**: workflow deploys `app/` from `main` only (github-pages environment rejects other branches); probes that Pages is enabled with the Actions source and fails loudly on anything but the one legitimate skip case; sparse-checkout so deploys don't clone ~170MB of videos. Pages was enabled by the user; site goes live when PR #1 merges to main.
- App also published as a Claude artifact for phone practice (works regardless of Pages).

## 2026-08-24 — Switch Challenge clone built (branch `claude/switch-challenge-clone-opphct`)

- **Analyzed all three reference videos** (~86 min total) frame-by-frame: 44 timestamped contact sheets + ~60 full-res extractions via ffmpeg. No transcription was possible (sandbox network policy blocks all speech-to-text model hosts), so analysis is visual-only — the tutorials show everything on screen, so coverage is good; spoken-only remarks are lost. Findings consolidated in `MECHANICS.md`; solving methods in `TIPS.md`.
- **Key findings**: operator digit semantics verified (`out[k] = in[digit_k]`); always 4 symbols and 3 options; difficulty ramps via chaining (the "7 question types"); 6-minute adaptive test; real UI has level badge + progress bar and prints 1-4 above the top row. Written-spec points overridden by video: option count never grows; no fixed question count.
- **Built the app** (`app/`, vanilla JS, no build step): Practice mode (untimed, visual chain explanation on wrong answers, show-answer), Test mode (6:00 countdown, adaptive 4-level ladder, no feedback until report), question generator with near-miss distractors and exhaustively verified unique answers, end report with estimated percentile band, localStorage stats (best score, accuracy trend, weakest level), full keyboard controls, in-app tips page.
- **Verified**: node engine test (8k questions/tiers, exactly-one-answer proof) + Playwright smoke test (all flows, zero console errors) — all green. Screenshots shared in session.
- **Docs**: README reworded to "AON assessment (BNP Paribas, P&G)"; CLAUDE.md created (run command, invariants, testing notes); this file updated.
- Run with: `python3 -m http.server 8000 --directory app`
- **Next step**: none queued — possible follow-ups: calibrate percentile bands against real attempt data; optional sounds.

## Earlier

- Claude GitHub App installed on shannshanmu/switch-game (via `/install-github-app`; needed `gh auth refresh -h github.com -s repo,workflow` first). No `.github/workflows/claude.yml` yet — install only granted app permissions.
- Committed & pushed (6db37d6): 3 reference .mp4 videos (~58–60 MB each), `.claude/settings.json` (intentionally committed), initial PROGRESS.md.
- GitHub warned the videos exceed its recommended 50 MB/file limit — pushed anyway per user choice (no Git LFS). Revisit if more/larger videos get added.
