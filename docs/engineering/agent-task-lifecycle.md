# Agent Task Lifecycle

The task store records execution and recovery observations in a private local directory. It is
an integration building block; the existing queue remains the coordinator. The
[queue state protocol](agent-queue-state-protocol.md) defines its integration. Automatic intake
and Linear approval reconciliation need an integration pilot before operational exit gates pass.

## Use The Store

Run commands from the repository root:

```sh
pnpm agent:tasks .cache/agent-tasks list
pnpm agent:tasks .cache/agent-tasks enqueue /private/tmp/task-request.json
pnpm agent:tasks .cache/agent-tasks mutate /private/tmp/task-action.json
```

Inputs and command output can contain non-public proposal contents. Keep them in local private
storage and private task logs. The store creates its directory with mode 0700 and state files
with mode 0600. Choose a dedicated state directory; its permissions are restricted on access.

An enqueue input contains `source`, `requestId`, `mode`, `revision`, an `authority` observation
with `actor`, `reference`, and `observedAt`, a `brief` with `acceptanceCriteria`, and `requiredGates`.
Modes are `research`, `implement`, `audit`, and `steward`. The `output` gate is always required.
Source and request identity determine the task ID. Repeated intake returns the existing task;
changing its mode or revision requires a new request identity.

A mutation input contains `id`, `action`, and an `input` object. The CLI requires `input.owner`
to match the current coordinator's `CODEX_THREAD_ID` environment variable for every mutation.
Claim a task with that `owner` and `durationMs`, then include the owner in subsequent mutations.
Lease duration is bounded to one hour and the default active-task limit is one. Ownership must
refer to a real coordinator handle that can be observed during recovery.

## Dispatch And Recovery

Save `dispatch-intent` before calling the task-creation tool, with a fresh `authority` observation
matching the recorded actor, reference and `revision`. Its `nextDispatchAction` is `create` for
the initial intent and `reconcile` for an existing intent. Persist its returned token, then
use `bind` with that token and the returned `clientThreadId` or confirmed `threadId`. An uncertain
creation result needs reconciliation against existing tasks before another creation attempt.
Pending worktree setup is distinct from a confirmed delivery handle.

`preparePlanningDispatch` in `scripts/agent-planning-dispatch.mjs` connects this procedure to
planning-bound records under an existing coordinator lease. Supply `store`, `owner`, `taskId`,
complete fresh `readIssue` observations and the independently authenticated `readRequest` adapter.
The proposal reader can use the connected Linear integration in an interactive session or the
scoped read-only app in an installed runner. Both readers must preserve complete identity,
attachments, labels and lifecycle fields; neither can establish a human decision from a stage.

For a first intent, the handoff verifies the exact stored human scope, reads and records current
planning state, then rechecks the human request before committing dispatch. Selected option,
permitted changes, acceptance criteria, visibility, required gates, numerical limits and decision
identity must match the accepted record. Failed, malformed, cached or canceled proposal reads
record unavailable planning evidence under the same lease. Scope changes and withdrawal latch
through the existing store. An independently verified human-request withdrawal records
`request-revocation` with the exact source, request ID, accepted decision reference and fresh
observation time. This durable latch blocks new execution, follow-ups and allocations even if
the source later presents the old approval again. Accept changed work as a new authorized request;
do not clear the original latch. Unavailable source reads do not establish withdrawal. The
installed reader remains the authentication boundary; the store validates agreement and freshness,
not source provenance. A bounded task requires its already-reserved `resourceToken`.

`status: 'prepared'` returns the durable dispatch token for the coordinator's first worker
creation. `status: 'reconcile'` returns an existing intent without renewing execution authority;
inspect the saved task identity/token and bind its actual handle rather than creating a replacement.
Already-started local commits are awaited. If cancellation occurs during the intent commit,
the result is `blocked` with the retained dispatch receipt; it grants no creation permission.
Remote adapters receive cancellation and are bounded by `maxRunMs`, at most 60 seconds.

This operation neither claims leases nor starts workers, renews resource allocations or activates
the queue. The installed coordinator owns worker calls, acknowledgement readback, checkpointing
and release. Live source provenance, withdrawal/interruption and dispatch recovery still require
the operational pilot.

### Worker creation handoff

`dispatchPlanningDelivery` in `scripts/agent-planning-delivery-dispatch.mjs` connects the planning
handoff to the installed coordinator's `createDelivery` and `findDelivery` adapters. The caller
owns an existing lease and resource allocation. The operation neither claims ownership nor
changes capacity, starts a scheduler or installs a worker runtime.

New intents opt into `dispatchProtocol: 'attempt-receipt-v1'`. Immediately before creation, the
handoff verifies the complete human request again and commits `dispatch-attempt` with the exact
intent token and fresh authority after the current planning read. Only the returned
`dispatchDecision.action: 'send'` permits creation. The attempt receipt is durable before the
external call. Repeated attempts return `reconcile`. Legacy intents cannot be upgraded by replaying
`dispatch-intent`; absent attempt evidence remains uncertain.

An opted-in intent without an attempt or handle can resume after fresh scope and authority checks.
`preparePlanningDispatch` uses `resumeUnattempted: true` for that operation; its existing-intent
result still grants no creation permission on its own. Attempted, bound or legacy intents go
directly to service reconciliation, including after approval withdrawal. A canceled local attempt
acknowledgement, malformed response, failed call or expired observation never permits replacement.

`createDelivery({ taskId, dispatchToken, mode, revision, brief }, { signal })` must use the accepted
public-safe brief to create the intended worker. It returns `threadId`, `clientThreadId` or both.
The handoff passes no proposal body, private planning IDs, attachments, source request or human
decision record. The installed adapter owns runtime/tool scope and prompt construction; this
payload boundary does not certify those runtime permissions.

`findDelivery({ taskId, dispatchToken }, { signal })` inspects the owning task service. A matching
fresh result contains `status: 'found'`, the same task ID and token, a service `reference`,
`observedAt` and the actual handle. It must verify the stored dispatch identity in that task's
history. Missing, stale, mismatched or unavailable observations remain `pending`. They do not
establish that an earlier creation failed. The store rejects conflicting handles.

Confirmed handles are bound immediately; pending worktree setup retains its client handle until
the service confirms the thread. `status: 'bound'` reports durable acknowledgement, not worker
completion or renewed execution permission. An acknowledgement committed during cancellation is
retained with `canceled: true`. Already-started local commits finish before return. Remote work is
bounded by `maxRunMs`, at most 60 seconds, and receives cancellation. The result contains compact
receipt metadata rather than the approved brief. A late or never-settling external call requires
service reconciliation; cancellation does not prove that worker creation stopped remotely.

Synthetic integration tests verify the store, scope reads, first-send reservation and worker
adapters together. Installed tool availability, actual worker identity/isolation, live interruption,
usage enforcement and successful recovery remain operational pilot gates. Private-only research
and audit dispatch remain blocked by the existing shared-queue visibility contract.

### Follow-ups and ownership recovery

`reserve-followup` takes a batch of stable event IDs and returns a `followupDecision`: send only
new events, reconcile an uncertain earlier send, or skip confirmed events. Include its token in
the follow-up and confirm the receipt only after observing that message in the bound delivery task.
Overlapping batches share event receipts so changing a batch does not resend an earlier event.

An expired lease alone does not prove its owner stopped. Reclaiming another owner's lease requires
a fresh observation naming that owner, status `missing` or `terminal`, and an `observedAt` timestamp
within the preceding minute. The coordinator supplies this from the owning task service. A retained
claim or unfinished dispatch occupies capacity after its coordinator lease expires. Recover an
expired claim with the required owner observation, then release it when no work remains.

For a deliberate handoff, the current owner calls `release` with a concrete `reason` after saving
its checkpoint and observations. This clears record ownership so the next coordinator can claim
it while the delivery remains live. It preserves the dispatch binding, occupied capacity, execution
clock, reservations and evidence. The released owner must stop writing until it acquires a new
lease. An expired or foreign owner cannot release the record; use observation-based recovery.

Transactions use an exclusive SQLite write lock and atomic JSON state replacement. A live lock is
preserved; the operating system releases it on process exit. Corrupt or unknown state fails closed;
inspect and preserve it before repair. Node's built-in SQLite file is coordination metadata; task
records remain in `tasks.json`. Do not delete the SQLite file to unlock a live transaction. Use Node
22.16 or later. Stop coordinators running an older implementation before upgrading; inspect any
legacy `tasks.lock.recovery` file separately before removing it.

Repeated intake must preserve the entire brief, acceptance criteria, required gates and original
authority actor/reference as well as mode and revision. Changed scope needs a new authorized
request identity. Object key order, duplicate/reordered gate names and fresh observation timestamps
do not change scope.

## Delivery Records

Use the [implementation work brief](templates/work-brief.md) for the accepted outcome and the
[approval package](templates/approval-package.md) for current-head maintainer review. Keep these
records in their existing planning/delivery home and link them from private task context. The
[standing-authority proposal](templates/standing-authority-policy.md) records proposed categories
and limits; completing it does not activate authority or replace the trusted request path.

## Evidence And Acceptance

Use `head` to record the current implementation commit. Use `evidence` to record each required
gate with `result` (`pass`, `fail`, or `unverified`), proposal `revision`, current `head`, artifact
reference, and observation time. The latest result for that gate and head controls readiness;
history retains failures. Observations cannot move backwards. A failure takes precedence over a
pass at the same timestamp; other conflicting timestamp ties are rejected, while identical
receipt retries remain idempotent. A changed head invalidates readiness until fresh evidence is recorded.

### Linear result receipts

Planning-bound research and audits can record `brief.resultDestination: linear-planning` in the
accepted request. Other tasks use the existing public GitHub result path; `public-github` is also
an explicit destination value. Changing the destination requires a new authorized request.

1. At a verified worker checkpoint, call `planning-result-intent` with the exact worker `head`, expected `bodyHash`,
   `writerAppUserId` and freshly rechecked authority. A confirmed delivery handle, current planning
   scope and `verifying` or `awaiting-approval` state are required. Bounded tasks also need an unused
   resource reservation for the `planning-result` operation.
2. The initial `planningResultDecision.action: create` reserves one comment UUID before a service
   write. Use that UUID as Linear's `CommentCreateInput.id`; retain the proposal ID, content hash,
   writer identity, head and accepted revisions. Store result Markdown in private worker storage,
   separately from the receipt. Verify destination access and publication channels before writing.
   The writer's `beginWrite` callback records the fresh planning observation, then calls
   `planning-result-attempt` with the comment ID and freshly checked authority under the current
   coordinator lease. Only its initial `send` decision permits a mutation. The saved `attemptedAt`
   survives restarts; another attempt returns `reconcile`. Paused checkpoints cannot receive a
   first send permission. Inspect actual ownership before recovering an expired coordinator.
3. An existing pending or unverified intent returns `reconcile`. Inspect the reserved comment
   through the [Linear result reader](autonomous-builder-plan.md#private-result-readback), using its
   `intentAt` as `notBefore`. An unavailable read cannot establish that creation failed or authorize
   a replacement comment. A pending or unverified reserved intent with no `attemptedAt` can obtain
   its first send permit using the same comment ID through the controlled writer after the current
   source and ownership checks pass. This requires every writer to use the durable attempt protocol; an imported or unknown writer outcome requires
   investigation. A confirmed intent returns `skip` for creation; completion still needs
   fresh readback. Changed content or head requires a new scoped request.
4. Record the owning-service result using `planning-result-observation`. The reader and store allow
   at most 30 seconds of Linear/runner clock skew for service creation and update timestamps.
   Local observations must remain fresh, and Linear update time cannot precede creation time.
   Available observations must match the reserved comment, destination, writer and content, with a fresh service reference.
   For an unavailable read, include the reserved `commentId`; the receipt becomes `unverified` and
   blocks readiness even when earlier output evidence passed. History retains prior observations.
   Conflicting observations cannot restore a pass at the same timestamp as an unavailable result.
5. Verify result quality and the task's other required gates separately. Record `output` evidence
   with the exact readback reference and observation time. Readiness and delivery require matching
   current-head, current-scope evidence and a confirmed result read within the preceding minute.
   Include human authority rechecked after that readback in the readiness or delivery transition.

These actions preserve local intent and observations; they do not write to Linear or authenticate
caller-supplied evidence. The shared queue still requires public visibility approval at execution
gates. The dedicated private worker, installed writer identity, coordinator integration and observed
live pilot remain activation requirements for private research and audits.

### Coordinator result handoff

[`deliverPlanningResult`](../../scripts/agent-planning-result-delivery.mjs) joins the result adapters
to these store actions under a current coordinator lease. Supply the verified worker's exact `head`
(`null` for research with no commit), private result Markdown, expected writer app identity and the
trusted proposal, request and result readers. Supply a `createWriter` factory that constructs the
bounded app writer with the helper's readers, cancellation signal and durable `beginWrite` callback.
Caller-owned app sessions must close when the coordinator run ends.

The helper checks the current owner and scope, refreshes the proposal and human request, reserves
the result and records readback. A head changed while services are read cannot adopt the earlier
worker output. Bounded tasks require the caller's resource reservation and fresh measured usage.
Readback of an attempted or confirmed result can proceed without a new publication request;
it uses the recorded content hash and does not need the worker Markdown or another writer session.
An unavailable or malformed fresh probe invalidates the prior readback pass.

`verified` means the result artifact was observed, not that the task passed quality review or was
accepted. The helper neither records output/quality evidence nor transitions the task to delivered.
`pending` preserves uncertain write or readback receipts for investigation; `blocked` preserves a
checkpoint whose scope or send permission could not be verified. Neither disposition authorizes a
replacement task, comment or retry of an attempted send.

Remote operations share a run deadline of up to one minute. Cancellation stops further operations;
started local atomic transactions finish before the helper returns. A timeout does not establish
that the owning worker stopped. Recovery still requires actual ownership observations. This helper
is not connected to the paused queue automation; live credentials, the human-request source,
destination policy and an observed private-worker pilot remain activation gates.

### Authenticated result run

If token transport or its body outlives cancellation, the run returns blocked with
`linear-session-revocation-unverified` and a redacted `cleanup` promise. The same observation handle
is returned by an authenticated refresh run. Keep the runner alive to observe late token revocation;
do not treat a pending promise, process exit or never-settling transport as verified cleanup.
An acknowledged late revocation neither resumes the canceled run nor changes its durable receipts.

[`runLinearPlanningResult`](../../scripts/agent-linear-result-run.mjs) assembles the installed
app authentication, proposal/result readers, writer and coordinator handoff for one operation.
Supply the same leased task, exact worker head, result Markdown and resource reservation described
above. Supply the independently authenticated `readRequest` adapter and credential-manager
callbacks `readReaderCredentials` and `readWriterCredentials`; the owner-private file fallback can
implement those callbacks after credential setup is authorized.

Configure `readerPolicy` with workspace, reader app, writer app, team and project IDs. Configure
`writerPolicy` with the same workspace/team/project and its distinct writer app ID. The policies
must agree on that writer identity. Tokens are acquired lazily: reads request only `read`, while
an authorized first send requests exactly `read,comments:create` through the separate writer app.
An attempted or confirmed receipt needs only a fresh reader session; reconciliation may omit
`readWriterCredentials` and the worker Markdown. A reserved result with no attempt still requires
the writer and current publication authority for its first send.

Authentication and delivery share a deadline of at most one minute and the caller's cancellation
signal. Proposal reads, result reads and writes combine that signal with their request deadline.
Transport waits race cancellation even when the transport ignores its signal. Cancellation does
not prove that a remote mutation failed; an attempted send remains pending for receipt reconciliation.
Every started app session closes in the run's `finally` path, including sessions acquired while a
bounded reader was interrupted. Closing clears local access immediately and requests server
revocation with a separate five-second deadline per token; acquired sessions close in parallel.
Unacknowledged revocation returns `blocked` with reason `linear-session-revocation-unverified`,
preserving the artifact-verification result in the nested `result` field and the durable receipt.
Recovery must reconcile that receipt before attempting another write. Credentials, tokens and
confidential Markdown are not part of the returned status. The helper grants neither quality
acceptance nor a delivered transition.

The request adapter remains an authentication boundary. Connecting this operation to live queue
checkpoints requires installed app identities, authorized credential setup, a trusted human-request
source, verified destination policy and an observed pilot. This helper does not activate the paused
queue or remove the private-worker execution gate.

Transitions follow `queued -> investigating -> building -> verifying -> awaiting-approval ->
delivered`, with explicit waiting and failure states. Each transition requires a reason. Returning
from `retryable-failure` requires `maxRetries`; the first retry fixes that limit and retries are
counted. Terminal failure remains available when that budget is exhausted. Use `context` to
preserve the worktree, branch, PR/proposal URL, next action and unresolved questions across runs.
Confirmed output and passing
current-revision gates are required before readiness or delivery. Implementation delivery also
requires an acceptance observation matching its head and revision, with actor and reference.

The store validates record consistency. It cannot verify remote actor permissions, approval
withdrawal, merge state, artifact availability, or the truth of supplied observations. Verify these
through the owning service immediately before dispatch and completion. The Linear connector can
write as the maintainer account, so an account ID or Approved label alone is insufficient evidence
of a human decision. Preserve the existing explicit maintainer request path during integration.

## Planning Proposal Scope

For a delivery selected from the planning hub, include `planningBinding` in the enqueue input.
`createPlanningBinding(issue)` produces the issue/team/project identity and a SHA-256 revision
from the full title, description and complete attachment references. Linear private-storage
URLs in attachments and Markdown descriptions bind to the file address with temporary `signature` access parameters removed.
Other query parameters, fragments, hosts and file paths remain part of scope. This normalization
establishes neither file access nor human approval; verify artifact permissions separately. Linear
explains signed links in
[File storage authentication](https://linear.app/developers/file-storage-authentication). Use a
complete fresh issue read; missing attachment data cannot be treated as an empty list. Priority and proposal-stage
changes do not change the scope fingerprint. Record the selected option, acceptance criteria and
visibility decision in the proposal before the maintainer accepts its revision.

The trusted request's `authority.planningRevision` must name that exact fingerprint. Repeated
intake cannot change or remove the binding. A revised proposal needs a new authorized request.
The fingerprint and an Approved label verify neither human authorship nor implementation
permission. The existing trusted maintainer request and permission checks remain required;
connector-attributed account IDs cannot establish a human decision.

After claiming the existing task, use the `planning-observation` mutation with `observation`:
`status` (`available` or `unavailable`), `observedAt`, service `reference`, and, when available,
the freshly fetched complete `issue`. The issue supplies its ID/UUID, team, project, title,
description, attachments, complete label names and archival/cancellation state. Re-fetch through
the owning service immediately before new execution. Record access or synchronization failure
as unavailable, rather than retaining an earlier successful read as current evidence.

A matching scope in exactly one Approved or In delivery stage supplies a planning-scope pass.
Changes to content, references or identity, withdrawal, or archival revoke this request for new
execution. A later Approved label cannot revive it; resumption requires a new trusted request.
Ambiguous/missing stages and lost access are unverified. Observations expire after one minute
and cannot move backwards. At equal timestamps, failures take precedence over unverified results,
which take precedence over passes; other conflicting ties are rejected. These checks gate first dispatch, new follow-up sends, new resource
allocations, execution transitions and readiness/completion. The first dispatch separately
rechecks request authority and its accepted planning revision.

An uncertain dispatch or follow-up remains reconcilable after withdrawal. Confirm receipts,
record usage, preserve context and release ownership without starting new work. The record
retains the binding and normalized observation across restart; it omits proposal text and
attachment URLs. It does not cancel a running worker or mark a Linear proposal delivered.

The coordinator must verify service responses and human decision provenance before supplying
observations, stop an active worker when appropriate, and reconcile planning updates idempotently.
Automatic Linear approval intake, verified human provenance, remote synchronization and active-worker
withdrawal require integration pilots. Existing explicit requests without a planning binding retain
their request-authority workflow; this optional guard does not claim coverage for them.

## Signed Linear Event Observations

`verifyLinearEvent` in `scripts/agent-linear-event.mjs` accepts the exact raw request bytes,
Linear-Signature, a private signing secret and the configured organization/webhook IDs. It verifies
HMAC-SHA256 before parsing, checks the signed transport timestamp within one minute, restricts
body size and nesting, and rejects a different organization or webhook. Keep the secret and raw
payload outside repository artifacts and public logs.

The returned receipt retains event identity, actor attribution, timestamps and content hashes.
It omits proposal/comment text, actor names and email addresses, and private artifact URLs. Its
stable event ID derives from signed logical content, excluding retry-specific transport time;
an unsigned Linear-Delivery header cannot supply deduplication identity. Persist accepted event
IDs atomically in the receiving integration before acknowledging a new event. Identical logical
retries can reconcile the prior receipt without starting another task.

Issue and issue-comment events request a fresh complete planning read. They do not replace that
read, supply an approval, enqueue work or stop a worker. A deletion or changed proposal must be
reconciled through the existing planning-scope checks. Unsupported models supply no dispatch
intent. Issue attachment changes need an additional supported event adapter or polling.

Linear's default API authentication attributes writes to the authenticating user. Therefore a
signed event with a user actor, an Approved label or an approval-like comment does not establish
human provenance. The verifier always returns `authority: none`; the existing trusted maintainer
request remains required. Dedicated app-actor authorization is appropriate for service writes,
but configuring it alone does not prove who made a particular decision.

The verifier opens no listener and changes no Linear or task-store state. Its receiving integration,
fresh service reads, app-actor configuration and human-approval bridge require an integration pilot. Linear documents the transport and actor contracts in
[Webhooks](https://linear.app/developers/webhooks) and
[OAuth actor authorization](https://linear.app/developers/oauth-actor-authorization).

## Durable Linear Receipt Inbox

`AgentLinearInbox` in `scripts/agent-linear-inbox.mjs` persists normalized event receipts through
the existing task store's SQLite lock and atomic state-file replacement. It adds a versioned
`linearEventInbox` field while preserving task records and leases. Use a private receipt directory
for a separate receiving process; recording a receipt creates no delivery task.

`accept` verifies the raw event before entering the transaction. A new supported event returns
`refresh`; an uncertain earlier refresh returns `reconcile`; a confirmed refresh returns `skip`.
Unsupported signed models return `ignore`. Repeated receipt deliveries retain the original event
and confirmation, increment a delivery count and preserve pending work across restarts. Corrupt
inbox history fails closed. The state directory and files use the existing private permissions.

Pending refresh receipts survive compaction. The inbox retains at most 1,000 confirmed or ignored
receipts from the last 24 hours for retry deduplication. After eviction, a repeated supported
event requests a fresh planning read, which still supplies no implementation authority. At
1,000 pending refreshes, new supported events receive a retryable storage failure until the
consumer reconciles work; existing pending events remain available. Constructor options
`maxSettledReceipts`, `deduplicationMs`, and `maxPendingReceipts` configure these positive limits.

`pending` returns refresh receipts that need reconciliation. The consumer fetches a complete,
fresh issue snapshot, checks the proposal binding and trusted request authority, and updates any
bound task through its normal owned mutations. After observing the required refresh reconciliation,
call `confirm(eventId, { reference, observedAt })`. The reference is a SHA-256 identifier for the
private service-read evidence; observation time must be fresh and at or after event receipt.
Confirmation records refresh evidence. Task readiness and delivery keep their own gates.

`startLinearEventReceiver` in `scripts/agent-linear-receiver.mjs` provides an opt-in local HTTP
receiver at `127.0.0.1` and `/linear/webhook`. Supply an inbox, private signing secret, configured
organization/webhook IDs and an optional port. Its returned handle has `url` and `stop`. The
receiver accepts bounded JSON POST bodies, verifies the event, and sends HTTP 200 only after the
receipt transaction is durable. Invalid events are rejected; storage failures return 503 for
retry. Responses omit receipt contents and private error details.

The local receiver has synthetic HTTP and process-restart pilots. It needs an authorized HTTPS
endpoint and actual Linear delivery before production use. Its human approval bridge and task-worker
interruption integration remain pending. The receiver grants no implementation authority and leaves automatic dispatch off. Keep signing configuration and
raw payloads outside public artifacts.

## Fresh Linear Planning Reconciliation

`reconcileLinearRefresh` in `scripts/agent-linear-refresh.mjs` consumes one pending refresh receipt.
Supply `inbox`, its `eventId`, the existing task `store`, the owning coordinator `owner`, and a
`readIssue(issueId)` callback that performs a complete read through the owning Linear service.
The inbox and task store must share the same private state directory so confirmation can inspect
task progress atomically. The callback must enforce the service request timeout and return the issue UUID, team, project,
full title and description, complete attachments and label names, and explicit archival/cancellation
values (`null` or valid timestamp strings). For a definitive service-confirmed missing issue, throw `LinearIssueNotFoundError(issueId)`
from the refresh module. The identity-bound observation withdraws the proposal, latches revocation,
and confirms the receipt. Permission errors and ambiguous HTTP 404 responses remain unavailable.
Cached issue bodies and webhook payloads cannot substitute for this read.

The consumer checks the returned identity, complete fields and elapsed read freshness, then
updates nonterminal tasks bound to that issue through normal `planning-observation` mutations.
Each caller updates only records under its own live leases; the consumer neither claims ownership nor
creates tasks. Event-scoped observations preserve progress across release, handoff and restart only
while each record’s latest observation matches the same normalized proposal state. Other
coordinators reconcile their records with fresh service reads, and the receipt remains pending
until every applicable nonterminal record has been handled. Confirmation rechecks
that condition atomically with receipt persistence. If a later owner reads a changed proposal,
other owners must refresh their records before confirmation. Matching observations still expire
normally as execution evidence. Terminal history and unbound tasks remain intact. Scope withdrawal
latches through the existing guard. An Approved stage does not grant authority or revive a revoked request.

A failed, slow, mismatched or incomplete read records unavailable planning evidence on owned
bound tasks and returns `retry`, leaving the receipt pending. A successful read confirms the
receipt only after every applicable nonterminal task has a matching durable event-scoped
observation. Lease failures or interrupted confirmation leave pending work for reconciliation. Confirmation persists a hash of normalized
service-read state with the confirming observation timestamp, omitting proposal contents and temporary credentials.

Run this consumer from an existing coordinator with verified service access. It opens no listener,
sends no message, changes no Linear issue and starts no worker. New execution still needs its own
fresh planning observation and trusted maintainer request. Actual webhook-to-coordinator delivery,
human-approval provenance and worker withdrawal require operational integration pilots.


### Connected Linear reader

`createLinearConnectorIssueReader` in `scripts/agent-linear-connector-reader.mjs` implements the
proposal observation contract using connected read tools. Supply `getWorkspace`, `getUser` and
`getIssue` callbacks from the coordinator's trusted tool environment, plus a pinned `policy` with
`organizationId`, `readerUserId`, `teamId` and `projectId`. The reader accepts an exact issue UUID,
checks the active account and workspace for each snapshot, and compares two complete issue reads.
It validates explicit lifecycle fields, full attachment arrays, label names and source timestamps.
Explicit pagination/truncation, oversized collections, malformed MCP JSON and service failures
return unavailable evidence. A missing issue does not establish deletion.

The callbacks receive their native tool arguments and a separate `{ signal }` option. Tool calls
that ignore cancellation remain bounded by `maxReadMs`; parent cancellation propagates to all
callbacks. Successful results use the existing `{ status, issue, reference, observedAt }` shape
with a `linear-connector` service reference. The reader loads no credentials or tokens, changes no
planning record and grants no implementation authority. Supply only the three read callbacks;
proposal text cannot select tools or change pinned identities.

Use this adapter for an interactive coordinator with a connected Linear integration. An installed
coordinator must independently prove tool availability and account scope before adopting this
transport. A dedicated scoped app remains available for runners without connector access. In
either mode, independently verified human decisions, artifact access and private writer identity
remain separate contracts. A live connector read proves its observed scope, not operational
dispatch, complete private attachment contents or unattended recovery.

### Authenticated intake run

`runLinearPlanningIntake` in `scripts/agent-linear-intake-run.mjs` connects the scoped Linear
proposal reader, a lazy read-only app session and `enqueuePlanningRequest`. Supply `store`, the
exact request `identity`, `readerPolicy`, a credential-manager `readCredentials` callback and an
independently authenticated `readRequest(identity, { signal })` adapter. The latter must verify
the human decision through its owning source; proposal text, stages and agent-authored comments
cannot establish approval. It returns the trusted observation defined in the
[approval-to-queue contract](autonomous-builder-plan.md#approval-to-queue-handoff).

The run validates policy before loading credentials or querying authority, reads the human
request, fetches a complete stable proposal and rechecks the human request before enqueueing.
`maxRunMs` bounds source reads to at most 60 seconds, including adapters that ignore cancellation.
Proposal reads retain their own 20-second limit. Withdrawal, changed scope, mismatched app
identity, incomplete reads or unavailable services return a redacted `blocked` result.

A successful result contains `status: 'queued'` and `taskId`. Duplicate accepted requests retain
the existing task ID. The task has no claim, dispatch or planning pass; execution requires fresh
authority and proposal observations through the existing gates. An already-started atomic enqueue
is awaited even after cancellation so its acknowledgement is preserved.

The session closes before return using a separate bounded revocation deadline. Unverified cleanup
returns `blocked` with reason `linear-session-revocation-unverified`, retaining the original result
in `intake`, including any committed task ID. Late-grant cleanup exposes a redacted `cleanup`
promise; keep the runner alive to observe it. Successful late cleanup cannot restore canceled
authority. Reconcile retained task IDs before retrying or dispatching. Synthetic integration tests
prove these local boundaries; installed human-request provenance, live app permissions and the
authorized delivery pilot remain activation gates.

### Authenticated refresh run

`runLinearPlanningRefresh` in `scripts/agent-linear-refresh-run.mjs` connects the existing inbox
and task store to the actual scoped Linear proposal reader and a per-run read-only app session.
Supply the existing `inbox`, `eventId`, `store`, coordinator `owner`, `readerPolicy`, and a
`readCredentials` callback owned by the installed runner. The policy fixes the organization,
app actor, team and project. Credentials are loaded lazily after the existing receipt and store
checks; invalid policy or pre-cancellation loads no credentials. The session requests exactly
`read` and closes before the operation returns. Closing clears local token access immediately and
awaits server revocation with a separate five-second cleanup deadline. Unacknowledged revocation
returns `blocked` with reason `linear-session-revocation-unverified` and preserves the original
outcome in `reconciliation`; the durable receipt remains available for recovery.

`maxRunMs` bounds remote work to at most 60 seconds; proposal reads also retain their own
20-second limit. Parent cancellation reaches OAuth and GraphQL, including a transport that
ignores cancellation while awaiting its response. Failed authentication, revoked access or a
canceled read records unavailable evidence through normal reconciliation, invalidating earlier
passes on owned tasks and preserving the pending receipt. Already-started atomic store updates
finish before return. A setup or store failure returns a redacted `blocked` result for recovery.

Successful complete reads reconcile current scope or latch withdrawal. The run neither creates
human authority nor claims tasks, dispatches a worker or writes to Linear. Synthetic transport
integration tests verify the actual inbox, store, app session and reader together; live app setup,
verified credentials and an observed signed-event pilot remain activation gates.

## Execution Budgets

Bounded requests include `resourceLimits` with three positive integers: `maxElapsedMs`,
`maxModelTokens`, and `maxToolCalls`. Limits are part of the authorized request identity. A repeated
event cannot remove or expand them. Existing records without limits remain unbounded; the
coordinator must identify them explicitly when evaluating operational coverage.

Elapsed time starts at the first claim and includes waiting between runs. Renewing ownership or
restarting the store does not reset it. Model tokens count cumulative input and output tokens,
and tool calls count cumulative executed calls across the coordinator and its workers. These are
execution units, not monetary charges. Choose the numerical policy from measured workloads and
maintainer-approved operating limits before activating bounded intake.

Use `resource-usage` with a `usage` observation containing cumulative `modelTokens`, `toolCalls`,
`reference`, and `observedAt`. Read counts from the actual execution service or verified execution
log. Counters must be nonnegative, monotonic integers; observations must be within the preceding
minute. Missing measurement is not zero usage. Record actual overruns even when they exceed the
limit so recovery retains the failure evidence.

Before a model or tool operation, call `reserve-resources` with a stable `event`, the upper bound
on its `modelTokens`, and its maximum `toolCalls`. Its `resourceDecision.action` is `execute` for a
new allocation, `reconcile` for an uncertain existing operation, or `skip` for a settled operation.
Only `execute` permits starting the operation. Preserve the returned reservation token. Reserve
input tokens plus the provider-enforced output allowance for model work; a worker whose usage
cannot be measured or bounded needs a runner integration before it can execute under this policy.

Pass the reservation token as `resourceToken` to initial `dispatch-intent` and newly sent
`reserve-followup` actions. A reservation bound to dispatch cannot authorize a separate follow-up.
Existing dispatch and receipt reconciliation remain available without another allocation.

After verifying that cumulative usage includes an operation's completed execution, pass its token
in `settledReservations` with `resource-usage`. Pending allocations remain charged across restarts
and uncertain outcomes. Capacity uses measured cumulative usage plus all pending allocations;
an unsettled completed operation can therefore hold capacity conservatively until reconciled.
The exported `resourceStatus(task, now)` reports bounded coverage, observation freshness, remaining
units, and exhaustion.

Exhausted or unmeasured budgets block new allocations, dispatches, follow-up sends, and transitions
into execution. Ownership, acknowledgements, evidence, context, waiting and failure records remain
available for recovery. The store does not cancel an already running worker. The coordinator must
apply provider limits, monitor actual worker usage and deadlines, stop new work, preserve its
checkpoint, and present a concrete decision when a limit is reached. Numerical policy, service
measurement and monitored-worker integration require a live pilot before operational exit gates
pass. Local tests prove record behavior; an interrupted-delivery pilot proves operational recovery.

## Verify Native Validation Receipts

`pnpm agent:validation <private-input.json>` verifies a local-validation receipt against
a completed native Codex push execution and the pre-push hook stored at its commit. Supply the private
`receiptFile`, freshly confirmed `expectedHead`, `repositoryRoot`, GitHub `repository` (owner/name),
`branch` and confirmed delivery `threadId`. Fetch the current PR head independently before using
the result as current-head evidence; this local verifier does not query GitHub or grant authority.

Use version 3 for current Codex `response_item` records. A receipt contains version/gate, full
head, repository, branch, thread ID and positive Tier 1/2 counts. Its `source` names the absolute native session file, one-based line, timestamp, native
command call ID and SHA-256 of that complete record including its newline. `source.records` lists
the line and SHA-256 of each following output and polling call through successful completion, in
file order. Every hash covers the complete record including its newline. Its `hook` names
`.husky/pre-push` and the same full `sourceAtHead`. Keep the receipt and input files private.

The verifier correlates native call IDs with their output records and, for a running process,
empty-input `write_stdin` calls to the same session. It accepts JSON `exec_command` function/custom
calls and the single literal wrapper `text(await tools.exec_command({...}));`, with an explicit
`workdir`. Polling wrappers use the same form with `tools.write_stdin`. Wrapper arguments must be
literal JSON; dynamic orchestration remains unverified. Native output must contain a JSON execution
result with `output` and a running `session_id` or final `exit_code`. Version 2 supports completed
`CommandExecution` event records.

The verifier reads complete hashed records, confirms session and execution-thread identity,
and rejects missing/partial records, changed hashes, wrong checkouts, mismatched repositories,
failed commands and contradictory counts. It accepts the exact native bash/zsh command generated by
`validationPushCommand({ head: expectedHead, branch })` from `scripts/agent-validation-receipt.mjs`.
The command creates a temporary detached checkout of the confirmed commit and installs its
dependencies with `pnpm install --frozen-lockfile`. It verifies that installation leaves tracked
inputs unchanged and creates no untracked source files, then runs the validation hook inside that
checkout. The native output brackets the complete chain with the validated commit. The ordinary
push sends the exact commit to the destination branch and also runs its normal hooks. Temporary
validation checkouts are removed on success or failure. The verifier checks the current
repository's origin, the commit-bound typecheck/Tier 1/Tier 2 hook, their ordered output and complete
passing tier counts, and the pushed destination/branch/commit. Abbreviated push SHAs must resolve
to the confirmed full commit. For first branch pushes, Git reports `[new branch]` without a SHA;
the commit-bound pre-push hook captures Git’s input refs and prints the full validated local SHA
and remote branch after the required checks pass. The native record must contain that marker
for the confirmed commit and branch.
Unsupported hook or command forms remain unverified.

The command prints only proved head/count/provenance facts. Native prompts, commands and raw
output stay outside agent context. A valid hash confirms an unchanged local record; it is not a
signature or independent human approval. The coordinator still verifies receipt provenance,
current remote checks and authority, and follows the task store's evidence/ownership contract.
The verifier does not mutate the queue, send messages, stop workers, merge or publish.

## Monitor Bound Workers

`monitorPlanningWorker` in `scripts/agent-worker-monitor.mjs` observes a worker already bound to
the task store under a current coordinator lease. Supply trusted `readWorker`, `readRequest`,
`readIssue`, `readUsage` and `interruptWorker` callbacks, an explicit `maxStopAttempts` from 1 to
10, and a bounded `maxRunMs`. Worker observations must identify the exact task, dispatch token,
thread and runtime run ID, with a service reference and a timestamp from the current read.

The monitor rechecks accepted human scope and the complete proposal, then reads cumulative
task-wide usage. The usage adapter must prove coverage of the coordinator and every worker with
`complete: true`; a single thread's counters cannot establish that coverage. A failed usage read
persists `resource-unavailable`, invalidating the cached measurement without resetting counters or
settling uncertain reservations. A later measurement must follow that failure and preserve
monotonic counters. Missing configured limits require a policy decision before monitored execution.

Withdrawn or unverifiable scope, an unverifiable proposal, exhausted resources or unavailable usage
lead to a durable stop intent. Pending stops block further execution. Every interruption targets
the exact run and carries the same stop token; the installed adapter must make that operation
idempotent. Each retry requires a fresh running observation and consumes the intent's fixed retry
budget. An unresolved receipt cannot be replaced with another run or a larger retry policy.

Command acknowledgement does not prove stopping. Confirmation requires a fresh stopped observation
for the same run and a saved checkpoint containing a reference, explicit commit head or `null`,
and the next recovery action. The receipt preserves only those checkpoint fields. Cancellation,
lost acknowledgements and missing checkpoints retain uncertainty for reconciliation. Confirmation
does not complete the task, release its dispatch binding or resume execution.

This module supplies the monitoring protocol. Activation still requires installed service adapters,
verified aggregate accounting, a monitoring cadence, accepted resource policies and live interruption
and recovery pilots. An interactive connector read alone does not prove those operational gates.

### Codex runtime adapter

`createCodexWorkerAdapter` in `scripts/agent-codex-worker.mjs` implements the worker callbacks for
the Codex app-server protocol. Pin `binding` to the task's durable `taskId`, `dispatchToken` and
confirmed `threadId`. Supply a trusted RPC `request` callback and an independent `readCheckpoint`
verifier. The adapter reads `thread/read` metadata and the latest descending `thread/turns/list`
page twice with `itemsView: 'notLoaded'`. Thread and turn status must agree and remain stable.
Older-turn pagination is expected; missing latest-turn evidence and changed runs are unavailable.
An unloaded thread (`notLoaded`) can establish a stopped observation only when its latest persisted
turn is terminal and its load status and turn remain stable. A running turn in an unloaded thread
is inconsistent evidence. Independent checkpoint verification still applies before recovery confirmation.

The runtime turn ID becomes the monitored `runId`. Interruption rechecks that same latest run
before sending `turn/interrupt` with the exact thread and turn IDs. A retry can address that turn
again or observe it already stopped; it cannot interrupt a successor. A stopped observation requires
another stable runtime read after checkpoint verification to detect a resumed worker.

`readCheckpoint` receives the exact binding and run ID. A verified response identifies all four,
has a fresh `observedAt`, and contains `status: 'verified'`, a reference, the next recovery action,
and a full Git commit head or explicit `null`. The installed verifier must inspect the durable
checkpoint and actual worktree; worker prose is insufficient evidence. The adapter returns only
the permitted checkpoint fields. Runtime completion or interruption alone does not prove that
checkpoint exists or the task's acceptance criteria passed.

`createGitWorkerCheckpointService` in `scripts/agent-worker-checkpoint.mjs` supplies a Git-backed
checkpoint recorder and verifier under the coordinator's current lease. Save the task's worktree,
branch and next recovery action using `context`. After a trusted native observation identifies the
bound worker's stopped turn, pass that observation to `captureCheckpoint`. The service reads two
matching Git snapshots and commits a `worker-checkpoint` receipt containing the exact task,
dispatch, thread and turn identity, commit head and state fingerprint. The same atomic mutation
records the actual head, invalidating approval readiness when that head changes.

The fingerprint covers the index, staged diff, actual tracked file contents and non-ignored
untracked files, including symlink targets. Ignored local files remain outside this source checkpoint.
The service bounds Git output, file counts, content sizes and read time. Unresolved index entries,
submodules and worktree flags that suppress changes require a separate recovery procedure.
Checkpoint files stay in the existing task store; the worktree holds the preserved source contents.

Pass the service's `readCheckpoint` to `createCodexWorkerAdapter`. It verifies the saved receipt
against fresh matching Git snapshots and current recovery context, returning only the binding,
head, opaque reference, next action and observation time. Changed files, branch, head, context or
run identity produce unavailable evidence. It does not rewrite a failed checkpoint to match changed
work. An already-started local checkpoint commit is awaited through cancellation; a subsequent read
can recover its receipt after restart. A stopped native observation without a saved checkpoint
remains insufficient to confirm monitored recovery.

For an existing local app-server socket, `createCodexAppServerRequester` in
`scripts/agent-codex-app-server.mjs` supplies the RPC callback. Configure absolute `codexPath` and
`socketPath`, and pin `threadId`. The rendezvous path may be an owned managed symlink. Its resolved
physical socket must belong to the current OS user, have private permissions, and sit beneath
directories protected from replacement by other users. The configured endpoint and executable are
trusted installation inputs. Each request initializes a bounded `codex app-server proxy --sock`
connection to the physical path using the WebSocket handshake and text-message protocol. Only
metadata reads, the single latest turn page and exact-turn interruption are permitted. Responses
are correlated and byte-limited, including
handshake bytes, notifications and control frames. Unexpected server requests, binary messages,
failed upgrades and malformed frames fail closed. Diagnostics and notifications stay
outside the returned result. Cancellation closes the proxy connection; interruption outcomes still
require subsequent worker observation. The requester connects to an existing endpoint and leaves
daemon setup to the installation workflow.

Verify the configured executable's version and its compatibility with the installed runtime,
account and selected model before starting delivery. A successful metadata read or cached model
catalogue establishes neither model execution nor fresh usage measurement. Use a bounded pilot
to verify an actual execution turn, its current native counters and its terminal outcome. A failed
turn without a new usage measurement leaves accounting unverified; preserve the failure and pending
reservations before correcting the installation. Elapsed limits and cumulative counters retain
their existing values during that correction.

Wire the configured requester into `createCodexWorkerAdapter`, then pass the returned
`readWorker` and `interruptWorker` to `monitorPlanningWorker` alongside the independently verified
request, proposal and aggregate-usage readers. Synthetic proxy tests establish protocol behavior;
installation still requires endpoint identity, a live exact-turn interruption and recovery pilot,
monitoring cadence and complete resource accounting before activation.

## Observe Local Codex Usage

`pnpm agent:usage <private-input.json>` reads a fixed snapshot of one local Codex session log.
The input contains `sessionFile` and the confirmed delivery `threadId`. Keep it and its output in
private planning storage. The observer verifies the session identity and native
`event_msg` / `token_count` counters under `info.total_token_usage`, or
`token_usage_record` counters under `thread_token_usage` before reporting usage. Unsupported formats, missing
measurements, foreign-thread records, regressions and malformed complete records fail closed.
A live writer's unfinished final record is ignored and identified in the result. Rate-limit-only
`token_count` events with null `info` preserve the prior measurement and its timestamp. Current
usage events inherit the confirmed session identity; explicit thread IDs must also match.

When native `task_started`, `task_complete` and `turn_aborted` markers are available, the observer
reports the latest turn ID, start and finality metadata. A terminal marker must match its preceding
start; reused terminal run IDs and new operations after a terminal marker fail verification.
Marker text and agent messages remain private. Native snapshots default to a 128 MiB limit, with
individual records limited to 16 MiB. Callers can supply a bounded `maxSnapshotBytes` and abort signal.

A command completion receipt can arrive after the native interruption marker. The observer counts
it only when its explicit thread and turn identity match, its status is completed or failed, and
its start/end timestamps establish that it began within that turn before finality. New calls and
unverifiable completions after finality fail verification. Counting a completion receipt neither
changes the turn's finality nor establishes successful delivery.

The result reports cumulative input, cached input, output and reasoning tokens; `modelTokens`
uses total input plus output, including cached input. These are execution units, not monetary
charges. The original observation time remains separate from the snapshot read time: reading an
old token record does not make its measurement fresh. Whole-thread totals include every turn in
that thread; use a dedicated delivery thread for task-scoped accounting.

Direct model tool-call IDs and recorded nested operation IDs are counted separately and deduplicated.
`observedOperationUnits` adds both categories, so an orchestration call and its recorded children
are distinct observed units. Recorded operations can be in flight. The result does not prove their
completion, hidden/provider operations, all-worker totals, or reservation settlement. Prompts,
arguments, messages, tool outputs and credentials are not returned.

This observer is read-only. It neither writes task-store usage nor interrupts a worker. Integrate
only after defining the approved operation-unit policy, verifying complete worker/coordinator
coverage and applying provider allowances. Preserve pending reservations for uncertain execution;
then validate monitored interruption and recovery before activating bounded intake.

### Task-wide native accounting

`createTaskUsageReader` in `scripts/agent-task-usage.mjs` supplies the monitor's `readUsage`
callback. Configure the existing task store, current coordinator owner and trusted `readInventory`
callback. The inventory must independently verify the complete runtime participant set and the
maintainer-accepted `native-observed-operations-v1` unit policy for this task revision. That policy
counts cumulative native model tokens and direct plus recorded nested operation units; it does not
convert them into billing or claim coverage of hidden provider operations.

Inventory responses identify the exact task and dispatch, carry a fresh service reference and
timestamp, and retain every dedicated coordinator and worker session. Each member names its role,
thread, current turn, native session file, running/stopped status and `dedicated: true`. The
confirmed delivery thread and turn must be present. Active inventories require one running
coordinator; stopped historical coordinators remain participants after handoff. To record final
totals after every participant stops, supply explicit `phase: 'stopped'`. That phase requires at
least one retained coordinator and all participants stopped, each with matching native terminal
evidence. An omitted phase retains the active-inventory requirements. Shared sessions cannot establish
task-scoped totals. The current bounded protocol supports at most eight participants.

The reader compares two matching inventories around the native reads. Running sessions require
fresh measurements from the current turn. Stopped sessions require matching native completion or
interruption markers; their cumulative totals remain in the aggregate even when the terminal
measurement is older. Missing markers, partial record tails, changed inventory, malformed source
files and stale active measurements produce incomplete coverage. Unknown usage is not zero.

The reader commits `resource-accounting` in the existing task store before returning a complete
aggregate. This durable ledger retains session identities, policy reference and monotonic
per-participant counters and measurement times. It prevents dropping a closed worker or masking
one worker's rollback behind another's rising totals. Session paths and raw logs stay private.
An incomplete or canceled read preserves already-committed accounting references for recovery.

Pass the resulting callback to `monitorPlanningWorker`, which persists `resource-usage` and
invalidates older usage when coverage becomes unavailable. An accounting receipt alone neither
updates aggregate usage nor settles reservations. Completion and interruption markers establish
native accounting finality, not task acceptance or human authority. A stopped accounting phase
retains every participant and does not settle reservations or complete the task. Installed inventory identity,
dedicated-session attribution, accepted units, allowances for unobserved provider activity and live
metering/interruption pilots remain activation gates.
