# Security Policy

avatar-gateway is a security-focused project. We take reports seriously and appreciate responsible disclosure.

## Supported versions

The project is pre-alpha; only the latest `main` branch is supported. No release is production-ready yet.

## Reporting a vulnerability

**Please do not open public GitHub issues, discussions, or PRs for security problems.**

1. Use GitHub's **private vulnerability reporting** ("Security" tab → "Report a vulnerability") on the repository, or
2. Email the maintainer at **hello@ebubeimoh.com**, subject `[avatar-gateway security]`.

Please include:

- A description of the issue and its impact (e.g. token replay, scope escalation, sandbox escape, prompt-injection data leak).
- Steps to reproduce / proof of concept, affected component and commit.
- Any suggested fix.

## What to expect

| Step | Target |
|------|--------|
| Acknowledgement | within 3 business days |
| Initial assessment & severity (CVSS) | within 10 business days |
| Fix or mitigation for critical/high | as soon as possible, target 30 days |
| Public disclosure | coordinated with the reporter, after a fix is available (default 90 days max) |

We will credit reporters in release notes unless you prefer to remain anonymous.

## Scope

In scope: `packages/sdk`, `packages/plugin-api`, `packages/gateway`, `packages/sdk-web`, `packages/avatar-runtime`, `packages/social`, the protocol in `SPEC.md`, and official
example configs. Of particular interest: identity spoofing, token theft/replay, mTLS bypass, scope escalation,
sandbox escapes, cross-avatar or DM prompt injection leading to data exfiltration, owner-channel exposure, private-knowledge leakage, social spam/impersonation, DoS amplification, and audit-log tampering.

Out of scope: third-party sites using the toolkit, LLM providers' own services, social engineering, and volumetric DoS
against hosted demo infrastructure.

## Safe harbour

Good-faith research that follows this policy, avoids privacy violations and service disruption, and does not access
other people's data will not be pursued legally by the maintainers.
