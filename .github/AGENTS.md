# GitHub Automation Rules

These rules apply to workflows, issue forms, pull-request automation, and repository metadata.

- Give every workflow the smallest explicit `permissions` block it needs.
- Never execute pull-request code, scripts, or actions from the head branch in
  `pull_request_target` or another privileged context.
- Treat issue bodies, comments, branch names, PR titles, and changed files as untrusted input.
- Keep production publishing behind a named GitHub environment with required reviewers.
- Pull-request workflows may create preview artifacts and comments. They must not receive
  production, HACS, private-network, or Home Assistant credentials.
- Do not let an implementing agent satisfy its own product, foundation, security, or production
  approval gate.
- New commits invalidate human approval of the previous PR head.
- Prefer a small workflow with one responsibility over a single workflow that mutates issues,
  reviews code, deploys, and publishes.
