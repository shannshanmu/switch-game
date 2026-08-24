<!-- state: 6db37d68dfde96859cd55e5aac316a69dcfa5ecb-da39a3ee5e6b4b0d3255bfef95601890afd80709 -->

# Progress

- No active feature/bugfix task in this repo right now — last work was housekeeping, not code.
- Claude GitHub App is installed on shannshanmu/switch-game (via `/install-github-app`, required `gh auth refresh -h github.com -s repo,workflow` first). No `.github/workflows/claude.yml` exists yet — install only granted app permissions, didn't scaffold a workflow file.
- Committed & pushed (6db37d6): 3 reference .mp4 videos (~58-60MB each, switch-challenge card-trick tutorials), `.claude/settings.json` (local config, intentionally committed per user), and this PROGRESS.md.
- GitHub warned the videos exceed its recommended 50MB/file limit — pushed anyway per user choice (no Git LFS). Worth revisiting if more/larger videos get added.
- Next step: none queued — waiting on user direction (possibly adding the Claude Actions workflow file next, if that's wanted).
