---
name: navet-idea-proposals
description: Develop requested Navet ideas into researched, decision-ready private Linear proposals with plans, design prototypes and targeted feasibility POCs. Use for product ideas and UX improvement proposals before delivery approval.
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

Use the connected Linear tools to find the Navet team and the existing **Navet 1.0 readiness and
idea backlog** project. Verify its identity and visibility; inspect related tickets and comments
before creating new proposals. Update an existing matching proposal rather than duplicating it.
Keep proposal content and attachments private and unsynced to public GitHub. If visibility is
unverified, retain the proposal privately and report the missing check.

Verify what Navet already supports. Research current external evidence when it informs an idea,
linking primary sources and distinguishing observed need from a hypothesis. Compare the smallest
useful solution, credible alternatives and keeping current behavior. Include household benefit,
workflow states, recommended scope, effort range, dependencies, provider/compatibility risks,
acceptance criteria, verification and documentation impact. Recommend priority with evidence;
do not assign the maintainer's decision or label an agent recommendation Approved.

Provide sketches or flows for interaction proposals; use existing primitives for higher-fidelity
prototypes when visual judgment needs them. Build a private POC only to answer a named technical
uncertainty. Keep it outside public branches, tracked product files, public previews and CI logs.
Use synthetic/provider-free data. Explain the experiment, observed result, limitations and what
production integration would still require. Local callbacks or simulated state are not provider
routing, persistence or operational readiness. Do not restart stopped comparison experiments.

## Store and verify

Keep local work in `.cache/agent-planning/proposals/<task-id>/` with private filesystem permissions.
Retain `progress.json` containing request reference, Linear identifiers/revision, local artifacts,
completed steps, unknowns, blockers and next action. Use durable private storage for retained POCs;
do not call a cache or ignored directory a backup. Never put secrets in proposal files.

Create/update tickets through the connected Linear plugin within the verified destination.
Use Captured/Developing proposal while working. Upload only authorized private artifacts using
the installed attachment workflow. Read back ticket content and attachments from Linear and
verify access before setting Ready for prioritization. Do not claim completion when an attachment
or ticket is missing. Mark inaccessible or unexercised prototype behavior explicitly.

For a material question, leave one concise question on the originating ticket and retain the
waiting state. Verify a human answer and resume the same task within scope; elapsed time and
agent comments are not answers. Finish with ticket links, recommendations and the decision needed.
Record observed duration, interventions, duplicates and review defects; unknowns stay unknown.

Product delivery requires the maintainer's selected option, approved proposal revision, permitted
changes, acceptance criteria and explicit public visibility. Use `navet-approved-delivery` once
that approval exists. A requested POC remains proposal evidence and grants no production scope.
