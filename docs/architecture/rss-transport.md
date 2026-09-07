# RSS transport ownership

The development RSS endpoint uses `scripts/vite-public-media-plugins.ts` and the pinned
HTTPS requester in `scripts/vite-public-resource-request.ts`. Production authenticates in `docker/njs/rss-proxy.js` and calls the same transport over a
private Unix socket. This replaces native `ngx.fetch`, which cannot expose or pin resolved DNS answers.

The shared Node requester remains the transport owner. A small bundled Node process exposes it
through `/run/navet/rss-transport.sock`; nginx's internal subrequest location is its only caller.
The public nginx handler retains provider-session and Supervisor Ingress authentication. Cookies,
provider tokens and forwarded identity must not reach the transport. No provider payloads cross
this boundary: the input is a public feed URL and the output is bounded XML or an error.

This is the smallest extraction that reuses the verified DNS/HTTPS implementation without adding
a competing resolver, an external DNS service, or a provider-specific network dependency.
The socket is private to nginx. The transport runs as the nginx user, and the container supervises
it with nginx so a failed transport cannot leave an apparently healthy partial runtime.

The public RSS URL, HTTPS requirement, authentication contract and persisted `/data` remain
unchanged. Build the executable bundle from its TypeScript source; do not edit generated runtime
JavaScript. Container tests must cover private DNS rejection, internal endpoint confinement,
transport failure, and recovery in addition to profile/auth persistence.

The container uses the same Node 22 major as the build and CI, copied from a target-platform
Node image rather than the older Node package in Alpine 3.20. It includes one additional supervised process. That increases image and
runtime memory cost in exchange for one shared, verifiable HTTPS transport. Concurrency is capped
at 32, responses at 1 MiB, and requests at 10 seconds; low-power hardware cost still needs measurement.

Runtime support: [Node release status](https://nodejs.org/en/about/previous-releases).
