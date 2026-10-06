# Navet Autonomous Builder Plan

Status: broader future programme. The [team workflow implementation plan](team-workflow-implementation-plan.md)
defines the current infrastructure scope and takes precedence when deciding what to implement.
Design-system expansion, context comparisons, recurring discovery, standing stewardship and the
product-readiness programme require separate authorization. The
[coordinated team workflow](agent-team-workflow.md) records implemented core contracts and their
remaining live gates. This plan establishes neither unattended operation nor Navet 1.0.0 readiness.

## Objective

Let the maintainer suggest an idea in ordinary language. The agent team researches the problem,
develops a plan and an appropriately scoped prototype, and posts the findings in the private Project for
prioritization. After the maintainer approves a ticket's selected option and scope, the team
implements it, verifies the result, and opens a reviewable PR with a working preview and coherent
documentation. Questions and decisions return to the originating private Project draft. The maintainer
owns priority, product direction, visual acceptance, merges, and production release dispatch.

Product opportunities and design findings enter one private planning backlog as developed proposals. The
maintainer prioritizes and approves them from a shared review surface. A dedicated UX quality
role continuously reduces the manual effort of finding layout and interaction defects.

Target outcome: a dependable team that develops proposals and delivers approved features and
products. Navet 1.0.0 is a product milestone supported by that team.
On-request release communication is defined in [request workflows](request-workflows.md).
Video production, advertising, recurring content and unattended publishing remain separate scopes.

## Workflow And Product Acceptance

Accept the team workflow against observable idea intake, private proposal development, human
approval, specialist coordination, implementation, ticket questions and answers, validation and
PR delivery. Accept each feature or product against its own approved criteria. Accept Navet 1.0.0
against the separate release-candidate criteria in Phase 6.

The six phases record future requirements and evidence obligations. They do not expand the
current team workflow scope. Their completion is distinct from verifying the core team workflow.
Household cohorts and production release dispatch belong
to product acceptance; they are not prerequisites for developing a requested idea in the private Project.
Recurring discovery, standing maintenance and comparative harness experiments require their own
accepted scope and resources. Comparative experiments are currently stopped; use the existing
design tools during delivery without claiming a measured context improvement.

## Starting Point And Constraints

Build on the existing operating model in [Agentic Development](agentic-development.md):

- The private Project provides the idea, prioritization and ticket approval surface for planning-bound work.
- GitHub issues retain their existing request intake; PRs provide public delivery and code review.
- Nisse intake handles authorized requests and qualifying replies.
- The private runner coordinates delivery and review continuations.
- Codex supplies independent review; deterministic checks remain authoritative.
- The maintainer accepts a current PR head by merging and separately dispatches production releases.

Use a private organization Project for proposals and prioritization, and public repository issues
and PRs for approved delivery. The Project README defines the review flow. Exact destination
bindings belong in private local configuration; confidential installation data stays in separately
protected evidence storage. Automatic approval intake and scheduled discovery require a live pilot.

The [design system](../design-system/README.md) already defines primitives, patterns, token
helpers, stable exports, and Storybook references. Most authoring remains app-owned; `@navet/ui`
is the target boundary for provider-neutral shared UI. Improve these surfaces incrementally.

The product constitution and architecture retain their existing authority. This plan does not
authorize agents to alter foundational contracts, access private installations, merge their own
work, or publish production releases.

## Operating Model

```text
maintainer idea or evidence-backed opportunity
  -> research, options, UX planning and scoped prototype
  -> findings and evidence in the private Project proposal lane
  -> maintainer prioritization and explicit ticket approval
  -> trusted approval, selected scope and acceptance criteria
  -> implementation using Navet primitives
  -> focused checks, rendered review, and independent review
  -> bounded repair loop
  -> PR and preview linked back to the private Project ticket
  -> maintainer review and acceptance
  -> merge and existing release process
  -> verified outcome and follow-up evidence
```

Use one coordinator with task-specific specialists. Select roles according to the task's needs;
each specialist has a concrete deliverable and shares the accepted brief and evidence. Developers,
UX designers, testers, security reviewers and architects collaborate through the coordinator.
Reuse the existing independent reviewer before adding another general-purpose reviewer. Each
delivery task owns its implementation branch and worktree; its related work uses one delivery PR.

| Role | Responsibility | Reviewable output |
| --- | --- | --- |
| Coordinator | Validate authority, select work, preserve task state, resume work, enforce limits | Accurate queue and approval inbox |
| Delivery agent | Investigate, implement, verify, repair review findings, update affected docs | PR, preview, and evidence |
| Product researcher | Investigate household friction and relevant ecosystem changes | Ranked opportunities with sources and experiments |
| UX designer | Define user journeys, options, interaction design and scoped prototypes | Design rationale, prototype and acceptance criteria in the private Project |
| Test specialist | Select meaningful checks, reproduce defects and verify user journeys | Test results, rendered evidence and remaining coverage |
| Security specialist | Assess relevant trust boundaries, authorization and data handling | Concrete risks, required mitigations and verified findings |
| Architect | Check provider ownership, contracts, persistence and integration choices | Scope-specific technical plan and contract decisions |
| UX quality auditor | Inspect rendered journeys, measure inconsistencies, reproduce defects, and retest fixes | Evidence-backed design findings and coverage ledger |
| Design-system steward | Maintain shared components, recipes, discovery metadata, and visual coverage | Focused design-system PRs |
| Documentation steward | Verify documentation against code and supported workflows | Documentation PRs and drift findings |
| Independent reviewer | Assess current-head correctness and evidence | Actionable findings or no remaining blockers |

## Private planning in GitHub Projects

Use the organization-owned **Navet planning** Project with private visibility. Organization
visibility and Project visibility are independent. Verify the exact owner, Project and private
setting before reading or writing proposal material. A draft belongs to the Project and needs no
repository. Linked repository issues retain their own visibility.

Create a draft from the [proposal template](templates/idea-proposal.md), using only sections the
problem needs. A small, understood defect needs evidence, expected behavior, the smallest repair
and an acceptance check. Research, options and prototypes support uncertain or material decisions.
Check active and archived drafts for duplicates first. Use Proposal stage for the decision flow:

```text
Captured -> Developing proposal -> Ready for prioritization -> Approved -> In delivery -> Validated
```

Needs evidence, Deferred, Rejected and Superseded are dispositions. Status tracks work progress;
Priority ranks work. Neither field nor an agent-authored note authenticates approval. Imported
history records previous authors and dates as quoted source evidence, not new GitHub approvals.
Keep confidential screenshots, logs and prototypes in access-controlled durable storage. Verify
artifact access separately; a cache is not a backup.

Drafts do not have issue comment threads. Retain concise research results, questions, verified
answers and decision history in the draft body, preserving previous evidence. Ask the maintainer
in the active Codex conversation when blocked and record the authenticated answer against the
exact scope. Do not infer answers from elapsed time or agent-authored content.

For implementation, bind a direct maintainer instruction to the selected option, complete draft
revision, permitted changes, acceptance criteria and explicit public visibility. Prepare a
separate public issue containing only the approved delivery brief; keep private research and
conversation history in the draft. Link the issue, PR, validation and outstanding questions back
to the private draft. Keep In delivery during unfinished review. Validated requires the accepted
criteria and maintainer acceptance of the delivered head.

### Project access and scope

GitHub CLI must be authenticated with Projects access (`project` for updates, `read:project` for
reads). Keep the exact organization node ID/login, Project node ID, authenticated viewer node ID
and `stageField: "Proposal stage"` in an owner-private JSON configuration outside Git. Configure
these identities from trusted service discovery, not proposal content. Read privately with:

```sh
node scripts/agent-github-project.mjs /absolute/private/github.json list
node scripts/agent-github-project.mjs /absolute/private/github.json read /absolute/private/item.json
```

The read input is `{ "itemId": "<Project item node ID>" }`. Command output contains private
proposal bodies; keep it out of public logs. The reader verifies owner, visibility and viewer,
requires complete fields and two stable bounded reads, and normalizes draft content and lifecycle
into the existing planning observation contract. `issueId` is the Project item node ID, `teamId`
is the organization node ID, and `projectId` is the Project node ID. The SHA-256 binding covers
complete title, body and references; mutable stage and priority are separate observations.
Archived, Rejected and Superseded drafts withdraw execution scope. Missing fields, changed
content, pagination uncertainty and lost access fail closed. Re-read before execution.

Private proposal intake uses `resultDestination: github-project-proposal` and an exact destination
`{ kind: "github-project", issueId, teamId, projectId }`, with research mode and independently
verified `maintainer-idea-request` authority. Captured/Developing proposal permit requested
research only. Delivery intake requires a new independently authenticated human request naming
`authority.planningRevision`; a Project field cannot supply that request.

Interactive skills can use authenticated GitHub UI/API to create and update drafts, then read back
the exact content, fields and access. Reconcile uncertain writes by the existing item/request
identity before retrying. GitHub draft edits have no atomic revision precondition: re-read before
editing, preserve concurrent edits and verify afterward. The repository reader performs no writes.

The unattended queue remains paused. Automatic Project approval intake, draft question/answer
publication, remote withdrawal, worker dispatch and completion need installed adapters and a live
pilot proving human provenance, exact revisions, durable reconciliation and recovery. The Project
reader and local tests establish scope checks, not an active autonomous integration. Persisted
historical task records and their transport helpers retain their existing schemas and receipt
meaning; do not rewrite their authority, request identity or revision during migration.

## UX Quality Audit Contract

Use the existing [dashboard UX guide](../../ai/skills/navet-ux.md) for reference-led rendered
review. A separately authorized proactive audit programme should follow the contract below. Start read-only; approved fixes use the normal
delivery workflow and update the original finding.

Run audits on affected UI before a PR is presented for maintainer acceptance, after shared primitive
changes across their direct consumers, and in a planned weekly rotation over essential journeys.
Begin rotating audits during the initial pilot rather than waiting for product discovery automation.
Schedule them only after the runner, resources, and authorized finding destination are configured.

Inspect both isolated stories and connected product journeys. Cover spacing and alignment, type
hierarchy, density, control geometry, surface consistency, accent/separator contrast, touch targets,
focus and keyboard navigation, scroll ownership, overlays, overflow, state clarity, and save/reopen
behavior. Shared spacing tokens and the closest component family supply the comparison reference.

Use deterministic browser measurements and accessibility checks for objective defects and rendered
inspection for visual and interaction quality. Keep screenshot baselines approved by the maintainer;
never accept a new baseline merely because it matches a new implementation. Triage environmental
noise and stable rendering before attributing screenshot differences to defects.

Maintain a coverage ledger by commit, journey/component, viewport, theme, input mode, and relevant
state. Record reviewed, failed, and unverified entries explicitly. Use a bounded risk-based matrix
for routine PRs and complete the agreed essential-journey matrix for release candidates. A passing
accessibility tool or screenshot comparison alone does not establish good UX.

Each finding needs reproducible steps, current and expected behavior, the violated reference,
artifact evidence, user impact, confidence, and the smallest credible repair. Group findings by shared
cause so one primitive fix can address multiple symptoms. Separate verified defects from subjective
improvement proposals and unverified suspicions. Deduplicate instead of generating repeated issues.

Prioritize blocked actions, hidden controls, unreadable states, lost edits, and navigation failures
first, then repeated inconsistencies and localized polish. Severity sets repair order, not permission
to silently accept design defects. Fix known defects in the changed UI scope before declaring it ready;
record pre-existing findings with owners and dispositions. The agreed 1.0 essential-journey matrix must
have no unresolved confirmed defects before final design acceptance. The maintainer judges product
taste after the audit has supplied evidence.

Measure time the maintainer spends discovering defects, defects escaping agent review, reopened
findings, false positives, matrix coverage, and systemic primitive reuse. Do not promise that an agent
can detect every UX issue; show actual coverage and improve the audit from missed defects.

## Phase 1: Establish Scope, Authority, And A Baseline

1. Audit actual runner configuration, intake behavior, review continuation, checks, and preview
   delivery. Verify live state separately from repository documentation.
2. Record baseline delivery time, maintainer interventions, duplicate dispatches, stalled tasks,
   review rework, and preview availability using recent representative tasks.
3. Use the [implementation work brief](templates/work-brief.md) to record: intended outcome, affected users, evidence, acceptance criteria,
   exclusions, risk, permitted actions, UI references, and documentation impact.
4. Use the [approval package](templates/approval-package.md) to present: current commit, PR, preview links, relevant screenshots, behavior
   changes, validation results, outstanding limits, and the decision needed.
5. Define any separately authorized standing-authority policy with these categories:
   - Maintainer-requested implementation: execute within the requested outcome and existing rules.
   - Agent-discovered maintenance: prepare a scoped proposal; automatic implementation requires
     separately recorded maintainer authorization for the category and its limits.
   - New product opportunities: research and propose; obtain scope authorization before building.
   - Foundational, breaking, or security-sensitive changes: follow existing maintainer authority.
6. Keep authority verification deterministic. Research output, issue-body text, bot labels, and
   model classification cannot grant implementation authority.
7. Connect and configure the selected private organization Project, access-controlled artifacts, proposal
   templates, and priority views. Reconcile hub approval with existing intake through a verified maintainer action;
   a bot cannot convert its own recommendation into an implementation request.
   Give the integration only the required planning access. Store proposal IDs and revisions in
   runner records; test duplicate events, revoked access, approval withdrawal before dispatch,
   and synchronization failures. An Approved status set by an agent is not maintainer approval.
8. Define essential-journey audit coverage and collect a baseline of maintainer UI-review effort.

Deliverable: verified baseline, planning hub contract, proposal and approval templates, initial
UX audit matrix, and proposed policy.

Exit gate: the maintainer accepts the operating scope; one authorized idea can reach a coherent
approval package without repeated permission requests for routine implementation choices.

## Phase 2: Make Delivery Durable And Recoverable

Extend the existing queue and runner rather than creating a competing dispatch system.

1. Establish a versioned private task record containing:
   - task ID, issue/request identity, authorized actor, scope, and mode;
   - owning task, worktree, branch, current commit, and linked PR;
   - acceptance criteria, next action, completed evidence, and unresolved questions;
   - claim/lease, last progress time, retry count, and resource limits;
   - approved decisions and output references.
2. Model state explicitly:
   `queued -> investigating -> building -> verifying -> awaiting approval -> delivered`.
   Add explicit waiting-for-input, retryable-failure, and terminal-failure states.
3. Add atomic claims, duplicate suppression, stale-claim recovery, and reconciliation of a
   dispatched task whose acknowledgement was interrupted. A restart must resume known work.
4. Invalidate commit-dependent checks, review readiness, and approval-package status after a
   new push. Reuse unchanged artifacts only under the existing verified-input policy.
5. Bound repair attempts, elapsed execution, active deliveries, and model/tool expenditure.
   Escalate repeated failures with evidence and a concrete next decision.
6. Keep one coordinator and begin with one active ticket. Coordinate scoped specialist work for
   maintainer-requested proposal development or approved implementation. Activate recurring
   independent research only after recovery behavior and its operating policy are demonstrated.
7. Notify the maintainer for reviewable results, material failures, or decisions. Preserve quiet
   operation while state is unchanged. Keep private prompts and orchestration logs private.
8. Reconcile planning proposal revisions, approval records, and delivery state with idempotent
   updates. Hub synchronization failures cannot imply approval or mark unfinished work complete.

Deliverable: tested lifecycle and recovery behavior integrated with existing intake.

Exit gate: interruption, duplicate input, stale claim, failed dispatch, and changed-head scenarios
recover without duplicate tasks, lost authority, or false completion.

## Phase 3: Make The Design System Discoverable To Agents

Treat the design system as a product for contributors and agents, grounded in the same components
users experience. Preserve a single ownership hierarchy for design decisions.

1. Inventory mature primitives and patterns and classify each as stable, experimental, or
   app-coupled. Identify gaps encountered by real delivery tasks.
2. Improve the existing `AI-DESIGN-CONTEXT.md` as the compact entry point. Link to authoritative
   guidance and examples rather than duplicating complete specifications.
3. Generate component discovery metadata from actual TypeScript exports and Storybook:
   import path, API, variants, dependencies, source ownership, story IDs, and stability.
4. Maintain concise usage guidance alongside components: purpose, selection criteria, composition
   recipe, states, accessibility, responsive behavior, and theme expectations.
5. Map existing tokens and theme helpers to DTCG 2025.10 JSON where representable. Initially generate
   exports from existing foundations. Explicitly retain dynamic recipes that cannot be represented
   faithfully; avoid a second independently edited token source.
6. Pilot Storybook MCP on representative React components. Verify metadata, discovery, focused
   testing, and previews against Navet's actual configuration. Retain direct repository and
   Storybook access as a fallback while the tooling is in preview.
7. Cover canonical compositions: card controls, overflow navigation, sheets, settings forms,
   summary bars, empty states, and unavailable states.
8. Extract provider-neutral UI into `@navet/ui` only when real reuse and dependencies justify it.

Deliverable: generated component catalog, documented recipes, token export, and a measured MCP pilot.

Exit gate: an agent can select an existing component, import it correctly, compose the intended
pattern, inspect supported states, and run relevant checks without inventing its contract.

## Phase 4: Enforce Primitive-Based UI And Measure Quality

1. Require every UI brief to name the reference family, primitives, recipe, primary action,
   information hierarchy, and responsive behavior before implementation.
2. Add focused static checks for known violations: duplicated shells, unauthorized imports,
   provider payloads in shared UI, and feature-local foundation styles where shared tokens exist.
   Structural HTML and legitimate layout composition remain valid.
3. Route missing reusable behavior into a shared primitive or pattern. Document a justified
   exception when generalization would create a misleading abstraction.
4. Verify relevant viewport sizes, touch and keyboard behavior, reduced motion, realistic data,
   and `glass`, `dark`, `light`, and `black` themes.
5. Audit the documented Storybook baseline failures, verify their current status, and repair valid
   assertions without weakening tests. Promote a lane to required only after its baseline is green.
6. Define a representative agent UI evaluation from real Navet sources before any separately
   authorized comparison. Cover a card dialog, settings flow, unavailable state, responsive
   dashboard composition and shared-component extension. Record controlled runs before claiming
   context improvements. Their completion is separate from team workflow acceptance.
7. Track invalid props/imports, duplicated primitives, token violations, accessibility failures,
   maintainer correction effort, runtime, and cost. Compare filesystem-only context with curated
   metadata and MCP using the same task set.
8. Apply the UX audit contract to changed surfaces and direct consumers of modified primitives.
   Attach a coverage summary and current-head evidence to every meaningful UI approval package.

Deliverable: enforceable UI checks and evidence that the agent context improves delivery.

Exit gate: representative tasks pass applicable checks and rendered review, with declining
maintainer rework and no recurring primitive-contract errors.

## Phase 5: Add Bounded Discovery And Documentation Stewardship

1. Run a weekly research cycle over authorized feedback, issues, observed household friction,
   provider release information, and relevant public developments.
2. Produce at most three opportunities per cycle. Each includes sources, observed problem,
   existing Navet coverage, confidence, estimated scope, and a measurable experiment. Develop them
   into ready planning proposals with workflows, implementation plans, and appropriate design evidence.
3. Deduplicate against open work and the roadmap. Prefer improvements to supported workflows
   over speculative feature expansion.
4. Keep opportunity selection separate from implementation authorization. Queue implementation
   through the approved policy and existing authority checks.
5. Include documentation-impact analysis in every delivery task. Update affected setup, behavior,
   capability, and troubleshooting guidance as a coherent whole.
6. Reuse the existing documentation-steward workflow for periodic drift detection. Verify claims
   against current code and evidence; escalate changes to foundational guidance.
7. Run the rotating UX audit independently of the three-opportunity limit. Capture all verified
   defects in the shared planning hub and consolidate the review digest by cause and impact.

Deliverable: a small evidence-backed opportunity queue and dependable documentation updates.

Exit gate: research recommendations are actionable and traceable, approved work reaches delivery,
and documentation matches the resulting supported workflows.

## Phase 6: Establish And Meet The 1.0.0 Readiness Gate

These are proposed acceptance criteria for maintainer agreement. Workflow automation alone does
not establish product maturity, and the roadmap is not a requirement to ship every listed feature.

1. Define the supported 1.0.0 scope: deployments, providers, capabilities, browser/device coverage,
   persisted-data guarantees, and known limitations.
2. Validate representative households, including non-maintainers, through setup, dashboard
   creation, daily controls, and chores where relevant. Observe follow-up use and resolve repeated
   blocking friction. Agree the cohort and observation period before evaluation.
3. Verify supported provider capabilities and owning-provider command routing. Unsupported
   capabilities must have understandable behavior. Record real-runtime evidence separately from
   fixtures, browser mocks, and CI.
4. Verify fresh installation and upgrade paths for standalone Docker, Home Assistant add-on, and
   custom panel, plus backup/restore and persisted-data compatibility.
5. Close release-blocking security, authorization, data-loss, and reliability findings. Agree an
   explicit severity policy and disposition remaining issues.
6. Complete responsive and accessible review of essential user journeys. Ensure stable shared
   components and truthful loading, unavailable, error, and permission states. Link the complete
   current-candidate audit ledger, resolve confirmed defects in the agreed matrix, and obtain
   maintainer design acceptance.
7. Confirm current-head required CI, resolved review conversations, working previews, coherent
   user documentation, and explicit known limitations.
8. Follow the existing release workflow: preparation, beta/RC artifacts, actual-image verification,
   maintainer installation testing, exact-tag stable dispatch, and distribution verification.

Deliverable: a 1.0.0 evidence matrix linking each criterion to results, owner, and remaining work.

Exit gate: the maintainer accepts the tested release candidate and dispatches 1.0.0 through the
existing protected release process.

## Rollout And Evaluation

Track each phase's remaining acceptance criteria in the configured private Project. Keep issue
IDs and links in the runner's private planning bindings rather than public repository documentation.

The [task lifecycle tools](agent-task-lifecycle.md) provide local state consistency and recovery
building blocks. The existing [AI design context](../design-system/AI-DESIGN-CONTEXT.md) supplies
reference-led UI guidance. These resources do not establish operational acceptance.

Use the [team workflow implementation plan](team-workflow-implementation-plan.md) to connect the
existing foundations into the core workflow. Respect each capability's authority, privacy,
recovery and validation dependencies. Reuse available design tooling on relevant tasks. Expand
recurring discovery and stewardship after their applicable delivery and operating gates pass.
Phase 6 remains the separate Navet 1.0.0 acceptance programme.

Keep coordinated implementation in one delivery PR. Use an explicitly ordered stack only when
separate review stages are accepted; the agent owns integration maintenance and conflicts.

Use an initial pilot of five representative authorized tasks. Include UI work, a reproduced bug,
documentation work, and an interrupted/recovered delivery. Exercise one planning proposal through
prioritization and approval, and one rendered UX finding through repair and independent retest.
Agree numerical budgets and targets
from the Phase 1 baseline rather than inventing delivery guarantees.

Expand autonomy when the pilot shows correct authority handling, reliable recovery, usable
approval packages, current-head verification, and acceptable maintainer correction effort.
Keep a maintainer-controlled pause mechanism and preserve unfinished task state when paused.

## Research References

- [Composable agent workflows](https://www.anthropic.com/engineering/building-effective-agents)
- [Long-running task state and verification](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Planner, builder and independent evaluator](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Agent development environments and feedback](https://openai.com/index/harness-engineering/)
- [Planner and worker coordination](https://cursor.com/blog/scaling-agents)
- [Relevant repository context](https://aider.chat/docs/repomap.html)
- [DTCG 2025.10 token format](https://www.designtokens.org/tr/2025.10/format/)
- [Storybook MCP](https://storybook.js.org/docs/ai/mcp/overview)
- [DESIGN.md visual-intent format](https://github.com/google-labs-code/design.md)
- [GitHub Project visibility and repository permissions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects)

These inform workflow design and evaluation. Navet's code, constitution and observed task outcomes
determine the implementation. No source establishes a universal model, context format or speedup.
