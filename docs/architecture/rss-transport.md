# RSS transport ownership

The development RSS endpoint uses `scripts/vite-public-media-plugins.ts` and the pinned
HTTPS requester in `scripts/vite-public-resource-request.ts`. Production authenticates in
`docker/njs/rss-proxy.js` and calls a small target-native transport over a private Unix socket.
This replaces native `ngx.fetch`, which cannot expose or pin resolved DNS answers.

The production transport in `docker/rss-transport` owns the container network boundary and
exposes it through `/run/navet/rss-transport.sock`; nginx's internal subrequest location is its
only caller. The Vite requester implements the same policy for development without shipping a
general-purpose JavaScript runtime in production.
The public nginx handler retains provider-session and Supervisor Ingress authentication. Cookies,
provider tokens and forwarded identity must not reach the transport. No provider payloads cross
this boundary: the input is a public feed URL and the output is bounded XML or an error.

This keeps the resolver and transport outside provider packages without adding an external DNS
service or provider-specific network dependency.
The socket is private to nginx. The transport runs as the nginx user, and the container supervises
it with nginx so a failed transport cannot leave an apparently healthy partial runtime.

The public RSS URL, HTTPS requirement, authentication contract and persisted `/data` remain
unchanged. Build the target-native executable in the Docker build stage. Container tests must
cover private DNS rejection, internal endpoint confinement,
transport failure, and recovery in addition to profile/auth persistence.

The transport is a stripped, statically linked executable built for the target architecture. It
adds one supervised process without adding Node to the runtime image. Concurrency is capped at 32,
responses at 1 MiB, and requests at 10 seconds.
