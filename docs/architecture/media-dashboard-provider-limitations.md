# Media Dashboard Provider Limitations

Navet's Media dashboard renders from normalized media devices and provider feature services. Home
Assistant is the reference provider today, but the dashboard should not depend on Home Assistant
payloads directly.

## Current Capabilities

- Transport controls use provider-neutral `NavetCommand` values.
- Media browsing uses `ProviderMediaFeatureService.browseMediaPlayer`.
- Media playback from browser items uses `ProviderMediaFeatureService.playMedia`.
- Source/output selection uses `ProviderMediaFeatureService.selectMediaPlayerSource`.
- Browser items can carry normalized title, artist, album, and thumbnail metadata.
- Per-player default browser folders and expanded/collapsed browser views persist in dashboard
  profile storage.
- Spotify Connect recovery can activate another media player that advertises a Spotify source when
  the Spotify account entity is idle.

## Component Structure

- `MediaSection` owns section composition, edit mode, hidden entities, and the existing compact
  media-card grids.
- `MediaDashboard` is the non-edit-mode media surface for normalized `MediaDevice` snapshots. It
  keeps provider-specific behavior behind `integrationMediaFeatureService` and provider feature
  hooks instead of importing provider packages.
- The dashboard is intentionally compact: a now-playing section reuses the large `MediaCard`, a
  browser panel lists playable or expandable media items, and a Spotify Connect panel handles output
  recovery.
- Existing compact media cards remain the per-entity surface below the dashboard and continue to use
  their own controller/dialog flow. Spotify account entities are hidden from this compact list
  outside edit mode because the dashboard already represents them.

## Home Assistant Adapter Behavior

- Browse and search prefer Home Assistant's `media_player/browse_media` and
  `media_player/search_media` WebSocket commands.
- Older runtimes that report those commands as unknown or unsupported fall back to the equivalent
  response-returning services.
- Browse responses are normalized at provider registration, including Home Assistant's alternate
  `media_title`, `media_image_url`, `media_artist`, and `media_album_name` fields.
- Play/pause dispatch is state-aware: a playing entity receives pause and any other state receives
  play. Pause capability is mapped separately from play capability.

## Artwork And Metadata

- Provider thumbnails pass through Navet's resource normalization and image URL sanitization before
  rendering. Relative, authenticated, or proxy-only URLs still depend on the active provider's
  resource resolver.
- Spotify track metadata first uses the standalone app's validated
  `/__navet_spotify_metadata__/track/:trackId` endpoint, then falls back to Spotify oEmbed when the
  endpoint is unavailable. The proxy accepts only 22-character Spotify track IDs and caches its
  upstream response for one hour.
- Album and artist items may use MusicBrainz, Cover Art Archive, Wikidata, and Wikimedia Commons as
  best-effort public metadata sources. The UI keeps text or initials fallbacks when any lookup fails.
- The standalone metadata endpoint is a development/standalone Vite surface. Home Assistant panel
  and Ingress deployments must continue to work without it through provider thumbnails and visual
  fallbacks.

## Known Limits

- Queue data is not exposed in the current provider-neutral media feature model, so the dashboard
  does not render an invented queue.
- Favorites/likes are not exposed in the current provider-neutral command model, so no favorite
  action is rendered. The bookmark action belongs to browser default-view persistence.
- Spotify-backed Home Assistant media players may be idle until a source/output is selected. When
  source selection is supported and sources are present, the dashboard surfaces the selector as the
  first recovery path.
- If a Spotify-backed player exposes source selection but Home Assistant returns an empty
  `source_list`, the dashboard offers other media players currently reporting a Spotify source as
  fallback output candidates. Selecting one activates its Spotify source when necessary and sends a
  provider-neutral play/pause command to that player.
- Browsed Spotify media is still submitted through the selected Spotify account entity. Activating a
  Connect target and starting a browsed item are separate operations; the provider decides where the
  account's playback ultimately appears.
- Transport controls are hidden for the Spotify account panel so Navet does not wake a dormant
  account on an unintended personal device.
- Providers may expose `canBrowseMedia` without useful children for a given entity state. The
  dashboard keeps an empty browser state until real browse results arrive.
- TV remotes still use existing TV-specific media card/dialog controls. The dashboard prioritizes
  audio players and does not duplicate the D-pad remote surface.

## Follow-Up Opportunities

- Add a provider-neutral queue model when a provider can supply real queue entries.
- Add a provider-neutral favorite/like command only when at least one adapter can implement it
  without leaking provider-specific service payloads.
- Move standalone Spotify metadata enrichment behind a deployment-neutral service if panel or
  Ingress builds need the same enrichment without relying on public fallback requests.
- Add provider contract fixtures for authenticated and expiring browse thumbnails as more providers
  implement media browsing.

## Storybook Coverage

`Pages/Media/Media Dashboard` uses the preview runtime's deterministic media feature service. It
covers playing and idle Spotify states, provider browse support, unsupported providers, TV and
unavailable players, missing artwork, multi-room targets, and a narrow touch layout without opening
a live provider session.
