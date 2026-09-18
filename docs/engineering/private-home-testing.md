# Private Home Assistant Branch Testing

Use this path only when the public demo and provider fixtures cannot demonstrate the behavior.
Access to a real home is an explicit maintainer decision, never a default agent capability.

## Recommended Topology

```text
phone or tablet
  -> authenticated private mesh or access proxy
  -> dedicated Navet preview container on the home network
  -> local Home Assistant
```

Run the preview on an always-on dedicated machine or Raspberry Pi when available. A development
laptop is acceptable for occasional supervised tests, but it is less predictable and increases
the chance of exposing unrelated local services. The preview container should be disposable and
identified by the branch or commit SHA.

## Access Boundary

- Prefer a private mesh VPN such as Tailscale with device approval, or an identity-gated tunnel
  whose policy only admits the maintainer's account and devices.
- Expose only the Navet preview port. Do not publish Home Assistant, its API, or its WebSocket port
  to the internet.
- Keep Home Assistant reachable from the Navet container over the local network and set
  `NAVET_HASS_URL` only when an exact server-side route is required.
- Use a dedicated Home Assistant user with the least privileges the scenario permits. Never place
  a long-lived access token in a PR, issue, Actions secret available to pull requests, container
  image, or client-side environment variable.
- Terminate the preview and revoke its Navet/Home Assistant sessions after review.

## Branch Flow

1. Check out the exact PR head on the preview host or pull an immutable `sha-*`/dev image created
   for that commit. Set `NAVET_PREVIEW_GIT_SHA` to the reviewed commit.
2. Create an ignored `.env.private-preview` with a unique project name and host port for this
   branch, the exact commit SHA, and only the provider configuration needed for this test:

   ```dotenv
   NAVET_PREVIEW_PROJECT_NAME=navet-preview-pr-175
   NAVET_PREVIEW_PORT=8175
   NAVET_PREVIEW_GIT_SHA=4729ac2e19572d48ebb9996ab5cc38dc680f850e
   ```

   Use a different `NAVET_PREVIEW_PROJECT_NAME` and `NAVET_PREVIEW_PORT` for every simultaneously
   active branch. Build and start the isolated container with the verified launcher:

   ```bash
   pnpm preview:private
   ```

   The launcher refuses to build when the working tree has uncommitted files or when
   `NAVET_PREVIEW_GIT_SHA` differs from the checked-out `HEAD`. Do not invoke Compose directly;
   that would bypass the source-provenance check.
3. Verify the image digest and displayed commit metadata before testing.
4. Connect through the private access layer from the phone or tablet.
5. Record product feedback on the PR without including entity names, addresses, tokens, private
   URLs, camera images, or household screenshots unless deliberately redacted.
6. Stop the container, remove its disposable data, and revoke the test session.

`compose.private-preview.yml` binds to `127.0.0.1` by default and requires each branch to declare a
unique project name, host port, and commit SHA. The project name isolates the Compose-scoped data
volume; the SHA identifies the image under review. The environment file is passed at runtime and
is never embedded in the image. To expose the preview only on a Tailscale interface, set
`NAVET_PREVIEW_BIND_ADDRESS` to that host's Tailscale IP before starting it. Do not set the bind
address to `0.0.0.0`; an authenticated proxy or private mesh should be the only remote entry point.

Stop the preview without touching stable Navet data:

```bash
docker compose --env-file .env.private-preview -f compose.private-preview.yml down --volumes
```

## Agent Boundary

Agents may prepare commands, inspect redacted logs, and respond to feedback. They must not receive
VPN keys, Home Assistant credentials, cookies, or unrestricted access to the preview host. A future
self-hosted runner for this lane should be environment-protected, accept only maintainer-approved
commits, have no general repository-write token, and be torn down after each run.
