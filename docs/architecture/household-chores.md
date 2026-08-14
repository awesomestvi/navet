# Household Chores

Navet chores are an app-owned, provider-neutral household domain. They are not Home Assistant todo
entities and do not expose provider service payloads to shared UI.

## Ownership

- `@navet/core` owns participant, definition, schedule, occurrence, timing, workflow, and activity
  contracts plus deterministic recurrence and workflow transitions.
- `@navet/app` owns shared-workspace synchronization, feature state, and the Household UI.
- NJS owns durable Docker and add-on storage under `/data`.
- the standalone Vite runtime mirrors the same HTTP contract for development and preview.

Provider automations and scripts remain in the existing routines feature. The Household **Routines**
tab is a navigation composition boundary, not a merge of the two command models.

## Scheduling

Definitions support once, daily, weekly, monthly, and after-completion schedules. A schedule stores an
IANA time zone and local due time. Occurrence IDs are deterministic from definition, scheduled instant,
and assignment slot so repeated materialization preserves completed state.

Assignment modes are:

- `person`: one selected active participant
- `anyone`: one shared occurrence claimable or completable by an eligible participant
- `everyone`: one occurrence for every active participant
- `rotation`: one occurrence assigned by deterministic schedule index

Workflow status (`available`, `claimed`, `awaiting_approval`, `done`, or `skipped`) stays separate
from timing (`upcoming`, `due`, or `overdue`).

## Persistence And Concurrency

The shared endpoint exposes a revisioned document:

- `GET /__navet_chores__/workspace`
- `POST /__navet_chores__/commands`
- `X-Navet-Chore-Revision` for conditional reads
- `X-Navet-Base-Revision` for compare-and-swap writes

Every mutation has an idempotent command ID and exactly one matching activity entry. A stale write
returns `412`; the client loads the newest document, rebuilds the mutation against it, and retries
once. The command journal and activity log both detect retries after a partially successful durable
write.

The workspace is bound to the trusted Home Assistant installation used by Navet's existing shared
dashboard profile. Normal routes require an authenticated HttpOnly browser session. Add-on Ingress
uses its explicit trusted-headers handler. Mutations require strict same-origin requests.

## Identity Boundary

Household participants are workflow profiles, not authenticated accounts. Selecting a participant
attributes an action and applies household assignment or approval policy; it does not prove who is at
the screen. Account authentication protects access to the installation-level shared workspace.

## Runtime Limits

The Home Assistant custom panel cannot use the native file store, so chores are unavailable there.
The current store is available to the add-on and to standalone Navet when the installation has an
authenticated Home Assistant principal. Provider-only Homey or openHAB installations do not yet own
a chores workspace authority.

Completed and skipped occurrences older than 90 days are pruned during materialization. Activity is
capped at 5,000 entries in the client document, while the idempotency journal retains the most recent
500 commands.
