# Coding standards

Use the smallest coherent change within the owning module. Root `AGENTS.md` owns architecture
boundaries and task routing; [architecture](architecture.md) explains migration seams.

- Keep UI, state, domain logic and provider transport in their owning layers. Keep feature-specific
  hooks, stores and utilities local; promote them only for real cross-feature reuse.
- Prefer focused components, composition and local state. Lift state when consumers need it;
  avoid unnecessary prop drilling, duplicate variants and premature abstractions.
- Inspect existing components, callers, hooks, utilities, stories and tests before adding an
  equivalent. Extend the existing story/test when appropriate.
- Use clear names and predictable patterns. Explain material ownership or performance tradeoffs.
- Use narrow subscriptions, lazy loading and measured memoization; keep render work and DOM
  lean. Follow the [performance guide](../../ai/skills/performance.md) for rendering and kiosk work.
- For dashboard UI, follow [UX discovery and acceptance](../../ai/skills/navet-ux.md).
  [Shared UI layers](../design-system/README.md#current-shared-ui-layers) define authoring and
  stable imports; [UI guidelines](../design-system/UI-GUIDELINES.md) own visual rules.
- Run the [focused validation](commands.md) required by the changed contract. Passing source
  checks does not establish rendered acceptance.
- Follow the [documentation policy](documentation.md): update affected behavior and references
  coherently, including file moves; distinguish current implementation, stable imports and
  target ownership.
