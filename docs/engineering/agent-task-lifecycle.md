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

A mutation input contains `id`, `action`, and an `input` object. Claim a task with `owner` and
`durationMs`, then include that owner in subsequent mutations. Lease duration is bounded to one
hour and the default active-task limit is one. Ownership must refer to a real coordinator handle
that can be observed during recovery.

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
within the preceding minute. The coordinator supplies this from the owning task service. An
unfinished dispatch continues to occupy capacity after its coordinator lease expires.

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

## Evidence And Acceptance

Use `head` to record the current implementation commit. Use `evidence` to record each required
gate with `result` (`pass`, `fail`, or `unverified`), proposal `revision`, current `head`, artifact
reference, and observation time. The latest result for that gate and head controls readiness;
history retains failures. A changed head invalidates readiness until fresh evidence is recorded.

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
from the full title, description and complete attachment references. Use a complete fresh issue
read; missing attachment data cannot be treated as an empty list. Priority and proposal-stage
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
and cannot move backwards. These checks gate first dispatch, new follow-up sends, new resource
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
endpoint and actual Linear delivery before production use. Its service-read consumer, human
approval bridge and task-worker interruption integration remain pending. The receiver grants
no implementation authority and leaves automatic dispatch off. Keep signing configuration and
raw payloads outside public artifacts.

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
