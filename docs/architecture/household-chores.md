# Household Chores

Navet chores are an app-owned, provider-neutral household domain. They are not Home Assistant todo
entities and do not expose provider service payloads to shared UI.

The current user-facing behavior is documented in the
[household chores guide](../chores.md). This document owns the durable domain, authority, storage,
and provider-boundary decisions behind that behavior.

## Ownership

- `@navet/core` owns participant, definition, schedule, occurrence, timing, workflow, and activity
  contracts plus deterministic recurrence and workflow transitions.
- `@navet/app` owns shared-workspace synchronization, feature state, and the Household UI.
- NJS owns durable Docker and add-on storage under `/data`.
- the standalone Vite runtime mirrors the same HTTP contract for development and preview.

Provider automations and scripts remain in the existing routines feature. The Household **Routines**
tab is a navigation composition boundary, not a merge of the two command models.

## Scheduling

Definitions support once, daily, weekly, monthly, and after-completion schedules. Bi-weekly and
tri-weekly choices are weekly schedules with an interval of two or three. A schedule stores an
IANA time zone and local due time. Date ranges, exclusions, every-N-day or every-N-week intervals,
multiple due times, nth-weekday monthly rules, and per-participant weekday/time variants deepen that
same model. Rotation can preserve its cursor indefinitely or reset within a week or month.
Occurrence IDs are deterministic from definition, scheduled instant, and assignment slot so repeated
materialization preserves completed state.

Assignment modes are:

- `person`: one selected active participant
- `anyone`: one shared occurrence claimable or completable by an eligible participant
- `everyone`: one occurrence for every active participant
- `rotation`: one occurrence assigned by deterministic schedule index

Workflow status (`available`, `claimed`, `awaiting_approval`, `done`, `skipped`, or `missed`) stays separate
from timing (`upcoming`, `due`, or `overdue`). Definitions may require an explicit claim, allow an
expired claim to be taken over, and define a missed-work grace period. The storage authority applies
missed, automatic skip, or carry-forward rules from durable state whenever it serves the workspace;
the scheduler therefore recovers after a browser or device restart.

## Persistence And Concurrency

The shared endpoint exposes a revisioned document:

- `GET /__navet_chores__/workspace`
- `GET /__navet_chores__/history`
- `POST /__navet_chores__/commands`
- `GET /__navet_chores__/definitions`
- `GET /__navet_chores__/occurrences`
- `GET /__navet_chores__/events`
- `POST /__navet_chores__/actions`
- `GET /__navet_chores__/backup`
- `POST /__navet_chores__/restore`
- `POST /__navet_chores__/reset`
- `POST /__navet_chores__/recovery`
- `POST /__navet_chores__/management/pin`
- `POST /__navet_chores__/management/verify`
- `X-Navet-Chore-Revision` for conditional reads
- `X-Navet-Base-Revision` for compare-and-swap writes
- `X-Navet-Chore-Management-Session` for PIN-unlocked management writes

Every mutation has an idempotent command ID and a primary matching activity entry. Materialization
may additionally append one occurrence-created lifecycle event per new occurrence. A stale write
returns `412`; the client loads the newest document, rebuilds the mutation against it, and retries
once. The command journal and activity log both detect retries after a partially successful durable
write.

The workspace document is the authority; command-journal and immutable-history files are
reconstructable sidecars and cannot take the whole feature offline. Each successful workspace write
keeps the previous valid document as a last-known-good copy. Reads repair malformed sidecars from
the bounded activity log and automatically restore a malformed primary document from that healthy
copy when possible. The client also reconciles a retryable error by reloading and checking the
original command ID before it offers another write, preventing duplicate people or chores after an
ambiguous response.

If neither the primary document nor its last-known-good copy can be read, the authority returns
structured recovery metadata instead of a generic unavailable response. The Household recovery
surface can retry, restore the healthy copy, or explicitly start over. Start-over preserves the
damaged primary under a failed-file name for diagnosis before creating an empty workspace. Recovery
mutations require the existing management PIN session when the PIN state is readable; a damaged PIN
file can only be cleared through the explicit destructive start-over path.

Occurrence actions enter the domain through `applyChoreWorkspaceOccurrenceCommand`. The browser
sends a typed occurrence action rather than a replacement document; both the Vite and NJS storage
authorities resolve the current definition and active participant, verify the participant capability,
apply the state machine, append the activity entry, and enqueue a delivery-outbox item. Profile,
definition, archive/restore, and occurrence-materialization writes use the same authoritative action
envelope. Materialization accepts a bounded date range and derives occurrences from the authority's
stored definitions and profiles; clients cannot submit occurrence objects or replace the workspace
document.

Schema version 2 adds the delivery outbox. Both storage authorities migrate a valid schema version 1
document before serving it, increment the revision, and persist the migrated representation. The
outbox decouples a committed household action from future webhook, notification, and provider-event
delivery.

The same authority schedules before-due, due, overdue, and approval reminders. Reminder IDs encode
the occurrence, reminder slot, and recipient, so a restart can recover elapsed reminder slots
without duplicating them. Participant quiet hours defer `nextAttemptAt`; delivery destination and
acknowledgement remain household-profile policy rather than browser state. In-app reminders are
acknowledged through the normal command envelope. Home Assistant delivery uses the optional
provider-neutral notification method, then commits a delivered or failed outbox result with bounded
exponential retry timing; Home Assistant does not receive ownership of the chore state.

The capped workspace activity array is a rebuildable UI projection. Both authorities also append
each unique activity to a separate versioned event-history file. Reads reconcile the current
projection into that file, which closes the normal interrupted-write gap without letting statistics
or export depend on the projection's retention limit.

An active manager can choose a bounded immutable-history policy between 30 and 3,650 days and
between 1,000 and 100,000 events. The policy changes through the same command envelope and preserves
append order so automation cursors remain stable. The Household review surface reads immutable
history, provides 7- and 30-day household/profile views, builds the weekly report, explains workload
imbalance without changing assignments, and exports filtered history as JSON or CSV.

The automation read surface lists definitions and bounded occurrence projections without exposing
the mutable workspace document. The action endpoint is a stable alias for the same authoritative,
revisioned command envelope. The event endpoint is an append-only cursor feed of occurrence-created,
due, overdue, claim, completion, approval, rejection, skip, reopen, reassignment, and missed events.
Setup and delivery bookkeeping remain available only through the audit history. Lifecycle timing
events use deterministic IDs and the authority reconciles them against immutable history, so a
restart does not duplicate them after the capped workspace projection rolls forward.

The workspace is bound to the trusted Home Assistant installation used by Navet's existing shared
dashboard profile. Normal routes require an authenticated HttpOnly browser session. Add-on Ingress
uses its explicit trusted-headers handler. Mutations require strict same-origin requests.

The optional household management PIN is installation-owned security state stored separately from
the public chores document, immutable history, and backups. The authority stores only a salted PIN
hash. Successful verification creates a short-lived, browser-memory management session. Once a PIN
is configured, both storage authorities reject participant, definition, experience, retention,
restore, and reset writes without that session; ordinary occurrence completion remains available.

## Backup, Import, And Workspace Semantics

The versioned `navet.chores` interchange document contains one workspace and its immutable events.
Restore supports explicit merge and replace modes. Merge deterministically remaps participant,
definition, occurrence, and event ID collisions; imported outbox work is never replayed. Reset
requires an active manager, the current base revision, an idempotent command ID, and the exact
confirmation phrase. The UI accepts Navet backups, documented Home Assistant todo export objects,
and normalized ChoreOps export objects after validating every required field.

The optional multi-workspace directory contract is separately versioned and installation-owned. It
defines an explicit active workspace, embeds a complete backup per workspace, rejects data from
another installation, requires exact deletion confirmation, and never permits deletion of the final
workspace. Device-local presentation and browser credential sessions remain outside this directory.

## Home Assistant Projection

Home Assistant remains an optional projection, not the owner of chores. `@navet/core` builds one
bounded summary snapshot with due, overdue, approval, completed-today, and next-occurrence details.
`@navet/provider-homeassistant` publishes that snapshot as a `navet_chore_projection` event. The
Navet custom integration exposes one summary sensor backed by rich attributes, rather than one
entity per internal field.

Home Assistant actions `navet.claim`, `navet.complete`, `navet.approve`, `navet.reject`,
`navet.skip`, `navet.reopen`, and `navet.reassign` publish a typed action request. The active Navet
runtime translates it into the same authoritative occurrence action used by the UI; the storage
authority still verifies revision, participant, assignment, capability, and manager policy. For
unattended automations, the authenticated Navet HTTP action API is the dependable boundary.

## Optional Motivation Domain

The workspace's versioned experience state owns the optional `off`, `light`, `family`, and
`adventure` presentation modes, per-chore time/point/child labels, optional icon and colour
overrides, missions, reward goals, and earned participant balances. Without an override, the UI
uses a stable hash of the chore definition ID to choose from twelve non-semantic card palettes;
category, icon, and dashboard accent do not affect that choice. Overdue red and completed green
remain semantic UI state and take priority over presentation metadata. Stored colour overrides are
validated six-digit hex values and travel with the versioned experience document and chores backup.

Balances are awarded only when an occurrence first becomes final (after
approval when required), reverse when final work is reopened, and remain durable when old occurrence
rows are pruned. Existing experience documents without balances derive their starting snapshot from
retained final occurrences before the next experience mutation. A mission's shared bonus is awarded
once when its final required chore completes; the awarded mission ID is retained so reopening and
re-completing work cannot duplicate the household reward.

The richer motivation contract remains a provider-neutral extension boundary for reward claims,
manager adjustments, badges, and time-boxed challenges. Its ledger prevents repeated completion
awards and defines audited reversal/refund behavior. Those deeper workflows are not required by the
calm Today experience, and no public leaderboard is defined.

## Identity Boundary

Household participants are workflow profiles, not authenticated accounts. Selecting a participant
attributes an action and applies household assignment or approval policy; it does not prove who is at
the screen. Account authentication protects access to the installation-level shared workspace and
its automation API. The participant included in an action remains attribution, not authorization.

The management PIN adds a household-screen authorization boundary on top of the authenticated
installation session. It prevents someone using a shared Navet screen from changing the household
plan while leaving assigned chore actions available. It is not an account identity and is not
exported with household data.

The first participant must be a manager. Active managers authorize profile and definition changes,
and the authority rejects profile updates that would leave the household without an active manager.
If legacy or damaged data contains no active manager, an active participant may make one profile a
manager as an explicit recovery path; that exception cannot be used for other management actions.

Archive, skip, reopen, and reassignment are manager actions. Skip, reopen, and reassignment require a
non-empty reason, which is retained on the activity entry; reassignment also records the previous and
new assignees. A configured approver can approve or reject normally. An active manager outside the
approver list may override that decision only by declaring the override and supplying an audited
reason.

## Runtime Limits

The Home Assistant custom panel cannot use the native file store, so the native chores workspace is
unavailable inside panel-only mode. The authority is available to the add-on and to standalone Navet
when the installation has an authenticated Home Assistant principal. Provider-only Homey or openHAB
installations do not yet own a chores workspace authority. Home Assistant may still receive the
optional summary projection from an active standalone/add-on runtime.

Completed and skipped occurrences older than 90 days are pruned during materialization. Activity is
capped at 5,000 entries in the client document, immutable event history uses the manager-selected
bounded policy (730 days and 50,000 events by default), and the idempotency journal retains the most
recent 500 commands.
