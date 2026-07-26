# Security Policy

## Supported versions

No version has been released yet. After first publication, the latest release line will be supported.

## Reporting a vulnerability

Do not create a public issue. Send a private report to **security@theorvane.tech** with impact, affected commit/version, reproduction steps, and mitigation ideas if known. We aim to acknowledge reports within 7 days and coordinate disclosure after a fix or mitigation.

## Security boundary

TypeChain may expose model-invocable tools. Decorator metadata is not a security boundary: authorization, approval, validation, redaction, rate limits, and auditing must be enforced at runtime. Never commit credentials, `.env` files, production traces, or private user data.
