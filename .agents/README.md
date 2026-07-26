# Agent Operating Guide

This directory is the single repository-owned source for agent instructions. Do **not** add `.github/agents/` or duplicate these rules elsewhere.

Read this file, then `.agents/architecture.md` and `.agents/release.md` when relevant. Work from an issue-numbered feature branch based on `dev`; write focused tests before behavior changes; run `npm run verify`, `npm run verify:publish`, and `git diff --check`; open one PR to `dev` with `Closes #<issue>`; require CI, resolved threads, and independent current-HEAD review.

Never merge, publish, set secrets, alter branch rules, or weaken approvals without explicit authorization. Do not use `any`, `@ts-ignore`, secret values, unchecked side effects, or unsupported implementation claims.
