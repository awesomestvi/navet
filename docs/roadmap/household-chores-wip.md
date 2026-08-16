# WIP: Native Household Chores

Status: native foundation implemented; follow-up work is intentionally staged.

Current implementation progress:

- occurrence claim/complete/approve/reject/skip/reopen actions are applied by the storage authority;
- profile, definition, archive/restore, and materialization actions are also applied by the storage
  authority; the client-authored replacement-document path has been removed;
- materialization accepts only a bounded range; the authority derives deterministic occurrences
  from its stored definitions and profiles instead of trusting client-authored occurrence objects;
- schema version 2 migrates version 1 workspaces and adds a durable event-delivery outbox;
- profile and chore edit flows now use the same manager-authorized action boundary;
- Today and the chore library use compact auto-filling cards so phone, iPad landscape, and very
  wide desktop layouts stay readable without stretching sparse rows;
- recurrence now supports bounded every-N-day schedules, exclusions, multiple times, nth-weekday
  monthly rules, per-participant variants, and rotation resets in the core model;
- claim requirements, expiry takeover, and authority-run missed/skip/carry-forward policies are
  implemented with durable activity and outbox entries;
- authority-run reminders now support before-due, due, overdue, and approval events with
  per-profile destinations, quiet-hours deferral, deterministic deduplication, and audited
  acknowledgement;
- immutable activity history is stored separately from the capped workspace projection and is
  exposed through the authenticated local authority for later reports and exports;
- Today now keeps immediate work primary while offering a collapsed seven-day plan; the chore
  library adds bounded search plus recoverable archive/restore controls;
- in-app reminders can be acknowledged from Today, while Home Assistant reminder destinations use
  the provider-neutral notification adapter and record retryable delivery outcomes;
- the authenticated automation surface now lists definitions and filtered occurrences, accepts
  the authoritative action envelope, and exposes a cursor-based occurrence lifecycle feed;
- a compact weekly review now provides household/profile completion, missed and upcoming counts,
  explain-only workload guidance, filtered JSON/CSV export, and manager-controlled retention;
- versioned backup/merge/replace/reset contracts and import adapters cover Navet, Home Assistant
  todo, and normalized ChoreOps data with deterministic collision handling;
- the optional Home Assistant projection exposes one rich summary sensor and typed service actions
  while the Navet authority remains the owner of every state change;
- motivation mode now has an off-by-default versioned core domain for points, audited adjustments,
  reward claims, refunds, badges, challenges, and reopen/import anti-gaming rules;
- installation-owned multi-workspace ownership, switching, embedded backup, and safe deletion
  semantics are defined in a versioned core directory contract;

This document is the product and engineering backlog for bringing ChoreOps-class household task
management into Navet without copying ChoreOps' Home Assistant entity model or exposing every
advanced concept in the first-run experience.

Reference products:

- [ChoreOps](https://github.com/ccpk1/ChoreOps) for recurrence, rotations, approvals, reminders,
  service controls, statistics, and optional gamification.
- [ChoreOps community thread](https://community.home-assistant.io/t/choreops-level-up-your-household-tasks/995326)
  for real setup, permissions, dashboard, and vocabulary friction.
- [Dashie](https://dashieapp.com/) for glanceable, always-on tablet presentation.
- [Sweepy](https://sweepy.com/), [Tody](https://todyapp.com/), and
  [OurHome](https://ourhomeapp.com/) for simple daily focus, household assignment, and completion
  language.

## Product Principle

The default experience answers four questions:

1. What needs doing now?
2. Who can or should do it?
3. When is it due?
4. Is it done, or waiting for approval?

Advanced scheduling, automation, and motivation features should deepen those answers without
creating a second vocabulary the household has to learn. Points, rewards, badges, penalties, and
challenges remain an optional mode. They must not be required to use chores.

## First Native Release

The first release is an installation-owned Navet workspace, not a Home Assistant todo-list wrapper.
Its domain model lives in `@navet/core`; persistence and composition live in `@navet/app` and the
standalone/add-on runtime.

| Capability | First-release state | Notes |
| --- | --- | --- |
| Household profiles | Implemented | Display name, colour/avatar metadata, pause state, optional account/person links, and complete/approve/manage capabilities. |
| Chore definitions | Implemented | Title, description/icon/room metadata, enabled/archive state, assignment, schedule, due window, and approval policy. |
| Recurrence | Implemented | Once, daily, selected weekdays, weekly intervals, monthly day, and after-completion cadence with IANA time zones. |
| Assignment | Implemented | One person, first-completer shared chore, everyone, and deterministic rotation. |
| Live occurrence state | Implemented | Available, claimed, awaiting approval, done, and skipped; timing is separately derived as upcoming, due, or overdue. |
| Approval | Implemented | Completion can wait for an explicit eligible approver; rejection reopens the work. |
| Native controls | Core implemented | Workspace control boundary verifies the occurrence, definition, active participant, and participant capability before applying the state machine. |
| Shared persistence | Implemented for standalone/add-on | Revisioned compare-and-swap writes, idempotent command IDs, authenticated installation binding, and durable local storage. |
| Daily dashboard | Implemented | Participant focus, clear status/action language, bounded auto-filling cards, and completed-work disclosure. |
| Chore library | Implemented | Add, edit, pause/resume, archive/delete, and see assignment/schedule; profile editing and pause/resume are available in the adjacent People rail. |
| Locales | Implemented | The current Navet locale set receives chores UI strings through the normal localization pipeline. |

### First-release completion gate

Before the feature is considered generally available:

- [x] Move validation and command application into the storage authority so a client submits an action,
  not a replacement workspace document;
- [x] Add edit flows for profiles and chore definitions, including pausing profiles safely;
- [x] Define explicit manager policy for archive, skip, reopen, reassignment, and approval
  overrides;
- [x] Add reminder preferences plus a scheduler that survives browser restarts;
- [x] Add empty, offline, conflict, stale occurrence, and recovery acceptance coverage;
- [x] Verify phone portrait, tablet portrait, iPad landscape, desktop, kiosk, keyboard, screen reader,
  reduced motion, light theme, and dark theme;
- [x] Decide and document availability for Home Assistant panel, provider-only standalone installations,
  backup/export, and workspace reset.

## Staged Backlog

### Stage 1 — dependable household operations

- Server-authoritative command envelope: `commandId`, `baseRevision`, action, target, actor profile,
  and action-specific payload. Return a typed result and the new revision.
- Full definition editing: name, instructions, room, assignment, due window, schedule, approval,
  reminder policy, and archive/restore.
- Profile administration: rename, avatar/colour, pause, role/capabilities, linked account/person, and
  safe handling of future assignments when a profile is paused.
- Scheduling additions: date ranges, exclusions/holidays, every-N-day cadence, multiple days/times,
  nth weekday of month, per-assignee variants, and rotation reset/offset controls.
- Shared-chore policy: optional claim requirement, claim expiry, allow-steal, and manager reassignment.
- Missed-work policy: explicit missed state, grace period, automatic skip/carry-forward, and manager
  override with auditable reason.
- Reminders: before due, at due, overdue escalation, approval reminder, quiet hours, per-profile
  destination, deduplication, retry, and acknowledgement.
- Calendar projection and a compact seven-day plan without turning Today into a calendar app.
- Search/filter for larger households and rooms.

### Stage 2 — open automation and Home Assistant projection

- Navet-owned service API to list definitions/occurrences, materialize a range, claim, complete,
  approve, reject, skip, reopen, and reassign.
- Stable webhook/event stream for occurrence created, due, overdue, claimed, completed, approved,
  rejected, skipped, and reopened.
- Optional `@navet/provider-homeassistant` projection using a feature service. Shared UI must continue
  to consume Navet contracts rather than Home Assistant entity or service payloads.
- Deliberately small Home Assistant entity surface backed by rich attributes, plus buttons/services
  for automations. Avoid one entity per internal field.
- Notification adapters for Home Assistant companion notifications and future provider-neutral
  destinations.
- Import assistant for existing todo entities or ChoreOps data after a versioned interchange format
  and collision rules exist.
- API authorization based on verified account identity where available; selected household profile
  remains attribution, not authentication.

### Stage 3 — insights and household review

- Per-profile and household completion rate, overdue rate, approval turnaround, streak, and workload
  balance from occurrence history.
- Weekly report with completed, missed, carried-forward, pending approval, and next-week highlights.
- History filters and export with bounded retention settings.
- Workload suggestions that explain their reasoning and never silently rewrite assignments.
- Multi-workspace support only after workspace ownership, backup, and switching semantics are
  explicit.

### Stage 4 — optional motivation mode

This entire stage is off by default and must use a single switchable household mode.

- Points/XP awarded only after final approval when approval is required.
- Rewards catalog, balances, claim/approval/fulfilment workflow, and refund rules.
- Badges/ranks and configurable milestones derived from the immutable activity history.
- Bonuses and penalties restricted to managers with a required reason and audit entry.
- Time-boxed challenges/quests with transparent goals and progress.
- Anti-gaming rules for reopen/recomplete, duplicate commands, imported history, profile merge, and
  clock changes.
- Age-appropriate presentation and controls; no public leaderboards or coercive defaults.

## Data And Architecture Follow-ups

- Add versioned migrations before changing schema version 1. Never make a stored workspace
  unreadable because a new optional feature shipped.
- Separate immutable event history from rebuildable occurrence projections before statistics or
  gamification depend on long retention.
- Keep shared household state installation-owned. Device presentation remains client-local and
  credential sessions remain browser-specific.
- Define backup, export, import, delete-all, and retention contracts before multi-instance support.
- Add an outbox for notifications and external events so durable state changes and delivery can be
  retried independently.
- Keep provider packages optional. A provider may project or notify about Navet chores, but it does
  not become the owner of the chores domain.

## Explicitly Deferred From Version 1

- rewards, points, XP, ranks, badges, bonuses, penalties, and challenges;
- weekly reports and long-term performance statistics;
- automatic Home Assistant entity creation and service registration;
- multi-instance household switching;
- marketplace/community chore templates;
- AI-generated assignments or scoring.

These items are deferred to keep the default language and setup small, not because the data model
should prevent them later.
