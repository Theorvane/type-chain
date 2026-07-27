# Agent Operating Guide

This directory is the single repository-owned source for agent instructions. Do **not** add `.github/agents/` or duplicate these rules elsewhere.

Read this file, then `.agents/architecture.md` and `.agents/release.md` when relevant. Work from an issue-numbered feature branch based on `dev`; write focused tests before behavior changes; run `npm run verify`, `npm run verify:publish`, and `git diff --check`; open one PR to `dev` with `Closes #<issue>`; require CI, resolved threads, and independent current-HEAD review.

GitHub cannot enforce branch rules while this repository is private on GitHub Free. Until public conversion, never direct-push or merge `dev`/`main`; manually capture issue scope, exact PR HEAD, passing CI, resolved threads, and independent review before every merge. Never publish, set secrets, alter branch rules, or weaken approvals without explicit authorization. Do not use `any`, `@ts-ignore`, secret values, unchecked side effects, or unsupported implementation claims.
