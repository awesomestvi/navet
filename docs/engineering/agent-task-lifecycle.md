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

## Observe Local Codex Usage

`pnpm agent:usage <private-input.json>` reads a fixed snapshot of one local Codex session log.
The input contains `sessionFile` and the confirmed delivery `threadId`. Keep it and its output in
private planning storage. The observer verifies the session identity and native
`token_usage_record` whole-thread counters before reporting usage. Unsupported formats, missing
measurements, foreign-thread records, regressions and malformed complete records fail closed.
A live writer's unfinished final record is ignored and identified in the result.

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
