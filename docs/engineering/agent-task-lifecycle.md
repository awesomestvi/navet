# Agent Task Lifecycle

The task store records execution and recovery observations in a private local directory. It is
an integration building block; the existing queue remains the coordinator. The
[queue state protocol](agent-queue-state-protocol.md) defines its integration. The
[coordinated team entry point](agent-team-workflow.md) connects private proposal intake,
specialist state and ticket conversations to this store. Authenticated live intake and Project
approval reconciliation need an integration pilot before operational exit gates pass.

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
The proposal reader can use the private GitHub Project reader in an interactive session or the
an installed authenticated adapter after its live pilot. Readers must preserve complete identity,
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
records in their existing planning/delivery home and link them from private task context. Every
execution needs its exact trusted request and accepted scope.

## Evidence And Acceptance

Use `head` to record the current implementation commit. Use `evidence` to record each required
gate with `result` (`pass`, `fail`, or `unverified`), proposal `revision`, current `head`, artifact
reference, and observation time. The latest result for that gate and head controls readiness;
history retains failures. Observations cannot move backwards. A failure takes precedence over a
pass at the same timestamp; other conflicting timestamp ties are rejected, while identical
receipt retries remain idempotent. A changed head invalidates readiness until fresh evidence is recorded.

## Private planning in GitHub Projects

Use the [private Project contract](github-project-planning.md) for destination, stage, human
approval, exact revisions and readback. Task records retain their bound request identity and
receipt meaning across upgrades.

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

Naturally stopped workers also require current authority, proposal scope and final cumulative usage.
The monitor closes cached planning permission before those remote reads, so a canceled or stalled
authority check cannot admit a follow-up. An unavailable final usage read preserves counters and
blocks new resource reservations. A successor observed during reconciliation invalidates the
measurement. An `inactive` result describes runtime state; it does not authorize more work.

For running workers, withdrawn or unverifiable scope, an unverifiable proposal, exhausted resources
or unavailable usage lead to a durable stop intent. Pending stops block further execution. Every interruption targets
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
An unloaded thread (`notLoaded`) or a thread reporting `systemError` can establish a stopped observation only when its latest persisted
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
bound worker's stopped turn, pass that observation to `captureCheckpoint`. Configure the service's
trusted `readWorker` callback with the bound native adapter's `readWorker`. Capture requires a fresh
observation of that exact stopped turn before inspecting Git and immediately before recording the
checkpoint. A running or successor turn, stale proof, unavailable runtime or expired read leaves
the saved head and checkpoint unchanged. The service reads two
matching Git snapshots and commits a `worker-checkpoint` receipt containing the exact task,
dispatch, thread and turn identity, commit head and state fingerprint. The same atomic mutation
records the actual head. A changed state fingerprint invalidates approval readiness and current-head
evidence even when the commit is unchanged. A first checkpoint also requires fresh evidence because
no prior fingerprint proves equivalence. Re-observing an identical head and fingerprint preserves
readiness. Invalidated gate observations retain their history and block delayed passes from before
the checkpoint; fresh verification is required before requesting approval or recording delivery.

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

Runtime observations bound this check; they do not lock native turn creation. The coordinator must
serialize capture and resume for the bound worker. Starting a turn outside that coordinator can
race the final observation and remains outside this recovery contract.

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
For an active aggregate, `observedAt` retains the oldest running participant's measurement time.
`verifiedAt` records completion of the fresh inventory and accounting read. The monitor checks that
verification happened during its current probe and persists the source measurement time for budget
freshness. Repeated reads cannot extend the counters' expiry. Final stopped aggregates use their
fresh verification time because every participant's matching terminal marker establishes finality.

Pass the resulting callback to `monitorPlanningWorker`, which persists `resource-usage` and
invalidates older usage when coverage becomes unavailable. An accounting receipt alone neither
updates aggregate usage nor settles reservations. Completion and interruption markers establish
native accounting finality, not task acceptance or human authority. A stopped accounting phase
retains every participant and does not settle reservations or complete the task. Installed inventory identity,
dedicated-session attribution, accepted units, allowances for unobserved provider activity and live
metering/interruption pilots remain activation gates.
