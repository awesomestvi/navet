## Summary

- describe the change
- note any relevant UI or behavior impact

## Review checklist

- [ ] Shared UI was added to `src/app/components/primitives/` or `src/app/components/patterns/` when appropriate
- [ ] If this adds shared UI, I can explain why it is not a primitive, pattern, or token when applicable
- [ ] `src/app/components/shared/` was only used for app-specific shared UI or compatibility shims
- [ ] Storybook stories were added or updated for shared UI changes
- [ ] `pnpm check:stories` passes
- [ ] `pnpm check:ui-kit` passes
- [ ] Documentation was updated if Storybook taxonomy, component ownership, or UI system guidance changed
- [ ] I tested responsive behavior where the UI changed
- [ ] I tested relevant theme states where the UI changed
