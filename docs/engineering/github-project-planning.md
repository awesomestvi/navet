# Private GitHub Project planning

Current planning and access contract. For interactive requests, use the matching
[request workflow](request-workflows.md); for coordinated execution, use the
[team workflow](agent-team-workflow.md). Product scope requires an authenticated maintainer decision.


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

Automatic Project approval intake, draft question/answer publication, remote withdrawal, worker
dispatch and completion require installed adapters and an authorized live pilot verifying human
provenance, exact revisions, reconciliation and recovery. The Project reader verifies scope; local
tests verify contracts. Task records retain their bound authority, request identity, revision and
receipt meaning across upgrades. See the [team acceptance gates](agent-team-workflow.md#infrastructure-acceptance-ledger).
