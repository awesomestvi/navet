# Marketing Workspace

Read this file before creating or changing community content, marketing videos, tutorials,
publication records, media plans, or campaign assets.

## Storage boundaries

The root `marketing/` directory is a local workspace and is fully ignored by Git.

Use exactly these local boundaries:

```text
marketing/
├── planning/
│   ├── community/
│   ├── tutorials/
│   └── videos/
├── wip/
│   ├── community/<task-id>/
│   ├── tutorials/<task-id>/
│   └── videos/<task-id>/
└── deliverables/
    ├── community/<task-id>/
    ├── tutorials/<task-id>/
    └── videos/<task-id>/
```

- `planning/` contains long-lived internal backlogs and roadmaps that span multiple production
  tasks. It is ignored local state, not a Git documentation surface.
- `wip/` contains briefs, plans, scripts, drafts, raw captures, audio, render dependencies,
  intermediate exports, review frames, and temporary delivery metadata.
- `deliverables/` contains retained local masters, editable archives, captions, posters,
  checksums, final public copy, and publication receipts.
- Important masters and editable archives need durable storage outside the repository. An ignored
  local deliverable is not a backup.

## Git boundary

- Never stage or commit anything under the root `marketing/` directory.
- Never use `git add -f` or an ignore override for marketing workspace files.
- Never move a brief, plan, draft, review note, publication receipt, or local delivery manifest to
  another tracked directory as a workaround.
- Do not commit raw or rendered campaign-specific media.
- Do not commit credentials, tokens, private URLs, real-household captures, or local absolute paths.
- Executable workflow code, tests, and stable configuration may remain tracked under `scripts/`.
- Only reusable canonical product captures consumed by the website or public documentation belong
  in tracked `assets/reference/marketing/`.

## Task lifecycle

1. Consult the relevant `marketing/planning/<area>/` roadmap when one exists.
2. Create one direct task directory under the appropriate `marketing/wip/<area>/` directory.
3. Keep every task-specific planning and production artifact inside it.
4. Use provider-free demo data or an exact public-safe Storybook fixture for product proof.
5. Before completion, verify the final exports, checksums, captions, provenance, and public metadata.
6. Copy only retained local outputs into `marketing/deliverables/<area>/<task-id>/`.
7. Update the long-lived roadmap only when task status or ordering changed.
8. Confirm important masters have durable external storage when the task requires preservation.
9. Remove the completed task's WIP directory:

```bash
pnpm marketing:wip:clean -- --area <community|tutorials|videos> --id <task-id>
```

The cleanup command intentionally accepts one task at a time. Do not add a broad `--all` mode.
Never clean a deliverables directory through the WIP cleanup command.
Do not delete a long-lived `planning/` roadmap as part of routine WIP cleanup.

## Publication boundary

- Publication requires the user's explicit approval and remains separate from media production.
- Store the final public URL, public copy, timestamps, platform status, and media checksums beside
  the local deliverable when useful.
- Do not treat publication receipts as a reason to keep internal planning in Git.
- External-community submissions and moderation actions remain user-controlled unless the user
  explicitly authorizes the exact action.

## Completion report

Report:

- the WIP directory that was cleaned;
- the deliverables directory that was retained;
- which integrity checks passed;
- whether important masters were archived externally or remain local-only;
- any publication step that still requires user action.
