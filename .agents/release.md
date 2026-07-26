# Agent Release Constraints

The repository is temporarily public for policy bootstrap and `type-chain` is not released. Switch the repository to private immediately before opening the first implementation PR. Do not run `npm publish`, tag, create GitHub Releases, configure trusted publishing, or set secrets without explicit user authorization and completed release readiness. Prefer GitHub Actions OIDC trusted publishing, never persistent repo tokens. Release lane is `dev` → `main` only; verify an installed tarball consumer before publication and registry readback before reporting success.
