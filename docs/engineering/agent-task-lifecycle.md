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
Readback of an attempted or already observed result can proceed without a new publication request;
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
