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

Transactions use an exclusive process lock and atomic state replacement. A live process lock is
preserved. A dead same-host process lock can be recovered. Corrupt or unknown state fails closed;
inspect and preserve it before repair. A recovery lock left by an interrupted recovery also needs
inspection before removal.

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

Elapsed execution and model/tool expenditure limits still require coordinator integration. Local
unit tests prove record behavior; a live interrupted-delivery pilot proves operational recovery.
