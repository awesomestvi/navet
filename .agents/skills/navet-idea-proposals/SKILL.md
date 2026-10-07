---
name: navet-idea-proposals
description: Develop requested Navet ideas into researched, decision-ready private GitHub Project proposals with plans, design prototypes and targeted feasibility POCs. Use for product ideas and UX improvement proposals before delivery approval.
---

# Idea proposals

An ideas request authorizes private proposal development, including proportionate prototypes
and isolated feasibility POCs. It does not authorize changing the product, public delivery or
publication. Default to three shortlisted ideas; do not fill the batch with weak suggestions.
Work on request, not recurring discovery.

Read `AGENTS.md` and the first routed guide needed for the proposed area. Ground recommendations
in the product constitution and current owning modules. Use the existing
`docs/engineering/templates/idea-proposal.md`; load design context and composition recipes when
the proposal is visual. Reuse the closest component family, with Home as the dashboard fallback.

## Research and develop

Use authenticated GitHub CLI or browser access to the navet-app organization's private **Navet
planning** Project. Verify organization, Project identity and private visibility; inspect active
and archived drafts and their history before creating proposals. Update a matching draft rather
than duplicating it. Keep proposal content private and publish only a separately approved delivery
brief in repository issues. If visibility is unverified, retain work privately and report the
missing check.

Verify what Navet already supports. Choose the ticket detail level from
`docs/engineering/templates/idea-proposal.md`. A small, understood bug needs the observed problem,
reproduction or source evidence, expected behavior, smallest repair and acceptance check. Research
external evidence, compare alternatives and develop a fuller plan only when uncertainty or a
material product decision calls for them. Link primary sources and distinguish observation from
hypothesis. Include relevant dependencies and provider/compatibility risks; omit empty or
irrelevant sections. Recommend priority with evidence; do not assign the maintainer's decision
or label an agent recommendation Approved.

Provide sketches or flows when an interaction decision needs them; use existing primitives for
higher-fidelity prototypes when visual judgment needs them. Build a private POC only to answer a named technical
uncertainty. Keep it outside public branches, tracked product files, public previews and CI logs.
Use synthetic/provider-free data. Explain the experiment, observed result, limitations and what
production integration would still require. Local callbacks or simulated state are not provider
routing, persistence or operational readiness. Do not restart stopped comparison experiments.

## Store and verify

Keep local work in `.cache/agent-planning/proposals/<task-id>/` with private filesystem permissions.
Retain `progress.json` containing request reference, Project item identifiers/revision, local artifacts,
completed steps, unknowns, blockers and next action. Use durable private storage for retained POCs;
do not call a cache or ignored directory a backup. Never put secrets in proposal files.

Create/update private Project drafts through authenticated GitHub UI/API within the verified destination.
Use Captured/Developing proposal while working. Link only authorized artifacts in verified access-controlled storage; verify their audience independently. Read back the complete draft body and artifact references from GitHub, then independently verify
artifact content and access before setting Ready for prioritization. Do not claim completion when an attachment
or ticket is missing. Mark inaccessible or unexercised prototype behavior explicitly.

For a material question, retain one concise question in the originating draft and ask the maintainer
in the active Codex conversation. Preserve the waiting state. Verify a human answer and resume the same task within scope; elapsed time and
agent comments are not answers. Finish with ticket links, recommendations and the decision needed.
Record observed duration, interventions, duplicates and review defects; unknowns stay unknown.

Product delivery requires the maintainer's selected option, approved proposal revision, permitted
changes, acceptance criteria and explicit public visibility. Use `navet-approved-delivery` once
that approval exists. A requested POC remains proposal evidence and grants no production scope.
