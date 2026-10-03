# Queue State Protocol

The existing Navet queue uses the local task store to deduplicate intake and reconcile delivery.
Read [Agent Task Lifecycle](agent-task-lifecycle.md) for record consistency and limitations.

## Coordinator Procedure

Use one dedicated state directory under the queue's private automation directory. Invoke the
repository's `scripts/agent-task.mjs` by absolute path so the state does not follow a delivery
worktree. Keep temporary JSON inputs private. Use the current `CODEX_THREAD_ID` as lease owner;
if it is unavailable, report the missing owner privately before mutating state.

1. List saved tasks and reconcile unfinished deliveries before accepting new work. Verify the
   actual owning task, current GitHub issue/PR, proposal revision, head, and output. Task records
   preserve observations; remote state determines whether they remain true.
2. Apply the existing deterministic GitHub intake rules. Use the issue URL as `source` and the
   accepted event/comment ID as `requestId`. Include mode, revision, concrete acceptance criteria,
   applicable gates, and a fresh authority observation. GitHub label priority and Linear proposal
   stages do not grant authority. Never read approval out of an issue body.
3. Enqueue idempotently. If an identity exists with changed scope, preserve it and record a new
   authorized request; do not overwrite its original authority or evidence.
4. Claim with the current coordinator's thread ID and a bounded lease. For another expired owner,
   inspect its actual task status. Only confirmed missing or terminal ownership permits recovery.
   Observation timeouts and unreachable services leave ownership unresolved.
   A current owner can deliberately hand off record writing with `release` and a reason after
   preserving its checkpoint. Claiming a released record resumes the existing delivery and keeps
   its capacity occupied; it does not authorize a replacement task.
5. Immediately recheck permission, acceptance, withdrawal, scope, source state and duplicates.
   Call `dispatch-intent` with that fresh authority observation, matching actor, reference and
   revision. The returned `nextDispatchAction` is `create` only for the first committed intent.
   `reconcile` means inspect existing tasks; it does not permit another task-creation call.
6. Include the task ID and dispatch token in the delivery prompt. Save the returned handle with
   `bind` immediately. A pending client handle is not a confirmed thread. If acknowledgement is
   interrupted, locate the task using its saved request ID/token and bind that existing task.
   If no task can be found and the creation outcome is uncertain, report the uncertainty. A
   missing observation does not establish that creation failed.
7. Save worktree, branch, PR/proposal URL, next action and unresolved questions using `context`.
   The coordinator remains the record writer. It reads delivery-task progress instead of requiring
   simultaneous writers or giving the delivery task access to private automation storage.
8. Verify current-head checks, review conversations, rendered evidence and output through their
   owning services. Record pass, fail or unverified for each required gate and preserve failed
   observations. After a push, record the new head before evaluating readiness.
9. Present one current-head approval package when applicable gates pass. A completed Codex turn
   is not merge, public research delivery, or acceptance. For implementation, verify the
   maintainer's merge and exact accepted head before recording `delivered`. For research, verify
   the actual Nisse comment author and URL. Preserve cleanup work independently.

The default capacity is one unfinished claimed or dispatched task. Lease expiration does not
free dispatched capacity. Reconcile existing work before creating another delivery. Do not mark a
task terminal merely to free capacity; terminal failure needs a verified conclusion and explanation.

## Follow-Ups And Legacy Work

Continue authorized replies and review remediation in the existing delivery task. Use its history
to verify that a follow-up request/comment/check ID has not already been sent. Preserve the original
delivery binding. Reserve each batch with `reserve-followup`, using stable, source-prefixed event
IDs. Send only the newly reserved `events` when its `followupDecision.action` is `send`. Include
its token in the message. A `reconcile` decision requires inspecting the existing delivery history;
`skip` means every event already has a confirmed receipt. After observing the message in the
confirmed delivery task, use `confirm-followup` with its token, thread ID, reference and fresh
observation time. When acknowledgement is uncertain, inspect task history before resending.

Existing tasks may predate the store. Reconstruct their identity, accepted request, confirmed
thread, current scope and outputs from GitHub and task history before recording them. Reconstructing
a record does not authorize task creation or resending an earlier request. If original evidence is
missing, keep the task eligible for investigation and report the missing evidence privately.

## Approval And Failure Boundaries

The maintainer can authorize an exact Linear proposal revision in the trusted Codex conversation
or through the existing accepted GitHub request path, using only a public-safe delivery brief.
The current Linear connector writes as the maintainer account; its actor ID and an Approved label
cannot distinguish a human decision from an agent mutation. Automatic Linear approval dispatch
requires independently verifiable human-action provenance before activation.

If store access, state validation, ownership, authority or output verification fails, preserve the
record and report the concrete failure privately. Do not create a replacement task. Quiet unchanged
state needs no extra notification. For bounded intake, include the approved numerical
`resourceLimits` and follow the [execution budget procedure](agent-task-lifecycle.md#execution-budgets):
refresh actual cumulative usage, reserve before executing, bind operation tokens, and settle only
verified completed usage. Inspect the real worker when a limit is reached and preserve its checkpoint.
Identify existing unbounded records and unavailable measurements in coverage reports. Lease duration
controls ownership; execution budgets control the task's elapsed time and resource units. Activation
requires a verified usage source and monitored-worker pilot.
