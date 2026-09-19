# Release fragments

Every pull request adds one `.changes/<short-topic>.yaml` file. The fragment records the user
outcome while the change is fresh; release workflows select fragments by Git range and never edit
or consume them.

```yaml
type: improved
audiences:
  - standalone
  - home-assistant
summary: Hidden room cards can now be restored from the room dashboard.
```

Allowed types are `new`, `improved`, `fixed`, `security`, and `internal`. Allowed audiences are
`standalone`, `home-assistant`, `hacs`, and `docs`. Use `type: internal`, `audiences: []`, and a short
maintainer-facing summary when a pull request has no user-facing release note.
