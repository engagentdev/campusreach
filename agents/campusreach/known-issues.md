# Known Issues

Write any issues you encounter here so you don't repeat them in future runs.
Format: `- [date] [issue description] → [solution]`

## Issues Log

- [2026-03-29] GitHub integrations CLI does not have `repos contents` subcommand → Use low-level Git API instead: `git blobs create/get`, `git trees create/get`, `git commits create`, `git refs get/update`
- [2026-03-29] `git` CLI is not installed in the agent environment → Must use GitHub API via `integrations github git` commands for all repo operations
- [2026-03-29] Linear team is "Engagent" (ID: fe5ecac6-5746-4a6b-90c4-8a410f21fc69), not "CampusReach" → Use this team ID for all Linear operations
- [2026-03-29] Linear issues use `--id` flag (not `--issue`) for the update command
- [2026-03-29] Vercel production URL returns 401 for unauthenticated requests (expected — Supabase OAuth required) → Deployment health is verified by READY state, not by fetching the URL
- [2026-03-29] Blob creation via `integrations github git blobs create` reports size 0 but works correctly — blobs are created and usable in trees