# Provider Onboarding Harness

This file documents the minimum package-level onboarding path for a new Navet provider.

## Required package exports

A provider package should expose one stable package-root surface for each of these:

- provider contract / adapter
- provider runtime registration
- provider package registration
- provider state builder when the provider accepts native snapshot input

## Required automated checks

Implemented providers should pass:

1. contract tests via `runProviderContractTests`
2. provider package registration tests via `runProviderPackageRegistrationTests`
3. provider-specific payload/runtime tests

Planned providers should pass:

1. planned contract behavior
2. provider package registration tests with `implementationStatus: 'planned'`
3. explicit unsupported feature expectations

## Readiness checklist

- package does not import `@navet/app`
- package root exports the registration surface used by `@navet/app`
- contract returns normalized `NavetProviderState`
- runtime registration declares capabilities and feature matrix explicitly
- provider package registration keeps contract, adapter, and runtime registration references aligned
- implemented providers cover connect, disconnect, entity lookup, updates, malformed payloads, and unsupported commands
- planned providers stay scaffold-only and do not claim unsupported features
