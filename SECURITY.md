# Security Policy

## Reporting A Vulnerability

If you believe you found a security vulnerability in Navet, do not open a public GitHub issue.

Report it privately to:

- `security@navet.app`

Please include:

- a description of the issue
- affected versions or deployment modes if known
- reproduction steps or proof of concept
- impact you believe the issue could have
- any suggested mitigation if you have one

We will try to acknowledge reports promptly and follow up as we validate and triage the issue.

## Scope

Security reports are especially relevant for:

- authentication and session handling
- provider proxies and resource rewriting
- imported dashboard data
- RSS, media, camera, and external URL handling
- Docker and Home Assistant add-on deployment behavior

For general public deployment hardening guidance, see
[docs/PUBLIC_LAUNCH_SECURITY.md](docs/PUBLIC_LAUNCH_SECURITY.md).

## Disclosure

Please give the maintainers reasonable time to investigate, fix, and coordinate disclosure before
sharing details publicly.

If a report is confirmed, the fix will be shipped through the normal Navet release process and the
relevant release notes.
