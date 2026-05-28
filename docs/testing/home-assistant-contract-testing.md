# Home Assistant Contract Testing Policy

Home Assistant is the source of truth for Home Assistant adapter behavior in Navet tests.

## Rules

- do not derive expectations from the current Navet implementation alone
- do not change tests just because the implementation changed
- prefer realistic Home Assistant payloads and documented runtime behavior
- keep shared-surface tests grounded in Navet-owned contracts unless the code under test is
  explicitly Home Assistant-internal

## Required Sources

Use one or more of:

1. official Home Assistant docs
2. documented REST or WebSocket behavior
3. documented panel or Ingress behavior
4. realistic payload fixtures
5. known regressions

## Fixture Guidance

Primary fixture tree:

- `src/test/fixtures/home-assistant/entities/`
- `src/test/fixtures/home-assistant/integrations/`
- `src/test/fixtures/home-assistant/api/`
- `src/test/fixtures/home-assistant/auth/`
- `src/test/fixtures/home-assistant/resources/`
