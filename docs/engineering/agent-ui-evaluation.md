# Agent UI Context Evaluation

Use the [five-case specification](evaluations/ui-context-v1.json) to compare how agents discover
and compose Navet UI. The cases come from current card-dialog, light-settings, vacuum, room-first
dashboard and shared empty-state sources. This specification contains no completed evaluation
results and does not establish that a context format improves delivery.

## Controlled Runs

Select a case and authorize an isolated evaluation run before starting workers. Record the full
source commit, specification revision, trusted request, model/version and effort, execution limits,
worker identity and context condition. Use synthetic fixtures. Evaluation patches remain isolated;
a product change follows its own approval and delivery workflow.

Run all conditions from the same clean source commit with the same prompt, fixture data, model,
limits and acceptance criteria. Each run starts with fresh conversation state and an independent
checkout. Preserve required repository and area instructions in every condition. Vary only the
additional discovery context:

| Condition | Discovery context |
| --- | --- |
| filesystem | Repository instructions, direct source, tests and rendered Storybook; no generated catalog or MCP assistance |
| catalog | The same access plus source-generated APIs, maturity metadata, token export and composition recipes |
| mcp | The catalog condition plus the verified local Storybook MCP tools |

These are context comparisons, not access restrictions on authoritative source. Every condition
may verify a contract in TypeScript. Record which context surfaces were actually used. A configured
MCP server without calls is an unused condition, not a completed MCP run. Regenerate metadata from
the selected source snapshot; record source/maturity fingerprints and token omissions. Never use
a newer catalog with an older checkout or treat missing extracted APIs as permission to invent them.

Counterbalance condition order across cases and record the run order. Keep tool/provider versions
and rendering settings fixed. Repeated runs must use fresh state. Do not compare one condition's
fully reviewed revision with another condition's initial output. Retain first-submission and final
results separately, including every repair and human correction.

## Verification And Measurement

Resolve each reference path and named story export against the recorded commit before executing.
Resolve story IDs through that build's Storybook index. A missing or changed reference invalidates
the case until the specification is revised; a guessed ID cannot supply evidence. Select the
narrow regression checks for the actual patch in addition to each case's listed checks.

Inspect relevant cases at phone, wall-tablet and desktop sizes, in all four themes. Record keyboard,
touch/no-hover, reduced motion and effects quality alongside open/close/reopen and supported data
states. Mark irrelevant or unavailable combinations explicitly. Respect mobile-only primitive
contracts rather than treating unsupported desktop rendering as a defect. Inspect connected
product behavior separately from isolated fixtures.

Record each acceptance criterion as passed, failed or unverified with current-head evidence.
Count incorrect props/imports, duplicated primitives, shared-token violations, introduced
accessibility/interaction failures and maintainer corrections. Use type diagnostics, required
boundary checks, focused tests and rendered inspection together; no one check proves design quality.
Separate confirmed baseline defects from regressions. The evaluation does not authorize fixing a
deferred finding, changing the product constitution or accepting a new screenshot baseline.

Record elapsed execution and waiting time, input/output/cached/reasoning tokens when reported,
observed tool-operation units and provider-reported monetary cost when available. Missing cost or
usage is unknown. Cached input belongs in the native cumulative token total but is not equivalent
to billed input. Include coordinator and worker usage when claiming a whole-run total. The
[usage observer](agent-task-lifecycle.md#observe-local-codex-usage) reads supported native records; it does not measure billing
or prove a worker was bounded.

Retain the original output, final patch, source commit, validation logs, screenshots and review
findings in the authorized artifact store. Keep prompts with private context and raw execution
logs private. A public report contains synthetic examples and aggregate evidence only after its
visibility is authorized.

## Run Record

Use one record per case, condition and repeat. Store it with the existing private planning evidence
and link it from the work brief and approval package.

- Case/specification revision, condition, run order and repeat number.
- Source commit, metadata fingerprints, model/version/effort, tool versions and fixture settings.
- Trusted authority, worker/checkout identity, numerical limits and stop/recovery observations.
- Started/finished timestamps, active/waiting duration and complete/partial/failed disposition.
- First-submission and final acceptance results, diagnostics and introduced/baseline findings.
- Primitive/token violations, repairs and maintainer correction count plus measured review time.
- Native usage and its coverage, provider cost or unknown, and evidence references.
- Rendered coverage by viewport/theme/input/state, with failures and unverified entries explicit.
- Selected output commit, independent-review result and remaining decision.

Report per-case results before aggregates. A faster incomplete run is not successful delivery.
Explain missing measurements and differences in context actually used. Compare quality, human
correction effort and complete execution cost together. The five cases form a pilot; they do not
prove product-wide correctness, a production autonomy policy or 1.0 readiness.
