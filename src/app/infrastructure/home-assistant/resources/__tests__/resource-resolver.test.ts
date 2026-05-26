import { beforeEach, describe, expect, it } from 'vitest';
import { resetRuntimeContextForTests } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import { oauthSessionFixture } from '@/test/fixtures/home-assistant/auth/oauth';
import { signedPathFixture } from '@/test/fixtures/home-assistant/auth/signed-path';
import { homeAssistantUrlFixtures } from '@/test/fixtures/home-assistant/resources/urls';
import { HomeAssistantResourceResolver } from '../resource-resolver';

describe('HomeAssistantResourceResolver', () => {
  beforeEach(() => {
    document.querySelector('base')?.remove();
    window.history.replaceState({}, '', '/');
    window.__NAVET_PANEL__ = false;
    window.__NAVET_CONFIG__ = undefined;
    resetRuntimeContextForTests();
  });

  it('rewrites relative Home Assistant media paths through the same-origin proxy', () => {
    window.__NAVET_CONFIG__ = { hassUrl: oauthSessionFixture.haBaseUrl };
    resetRuntimeContextForTests();
    const resolver = new HomeAssistantResourceResolver(() => null);

    const resource = resolver.resolveSync({
      kind: 'media_artwork',
      entityId: 'media_player.living_room',
      rawPath: homeAssistantUrlFixtures.relativeMediaArtwork,
    });

    expect(resource.url).toBe(
      `/__navet_ha_proxy__${homeAssistantUrlFixtures.relativeMediaArtwork}`
    );
    expect(resource.authStrategy).toBe('same_origin');
  });

  it('preserves signed image paths while proxying them in hosted runtimes', () => {
    window.__NAVET_CONFIG__ = { hassUrl: oauthSessionFixture.haBaseUrl };
    resetRuntimeContextForTests();
    const resolver = new HomeAssistantResourceResolver(() => null);

    const resource = resolver.resolveSync({
      kind: 'absolute_url',
      url: homeAssistantUrlFixtures.signedImageServe,
    });

    expect(resource.url).toBe(`/__navet_ha_proxy__${homeAssistantUrlFixtures.signedImageServe}`);
    expect(resource.authStrategy).toBe('same_origin');
  });

  it('resolves standalone OAuth resources to signed direct Home Assistant URLs when available', async () => {
    window.__NAVET_CONFIG__ = { hassUrl: oauthSessionFixture.haBaseUrl };
    resetRuntimeContextForTests();
    const signPath = async (path: string) =>
      path === signedPathFixture.sourceWebSocketCommand.path ? signedPathFixture.path : null;
    const resolver = new HomeAssistantResourceResolver(
      () => ({
        runtime: oauthSessionFixture.runtime,
        authMode: oauthSessionFixture.authMode,
        haBaseUrl: oauthSessionFixture.haBaseUrl,
        hassUrl: oauthSessionFixture.hassUrl,
      }),
      signPath
    );

    const resource = await resolver.resolve({
      kind: 'absolute_url',
      url: homeAssistantUrlFixtures.relativeImageServe,
    });

    expect(resource.url).toBe(`${oauthSessionFixture.haBaseUrl}${signedPathFixture.path}`);
    expect(resource.authStrategy).toBe('none');
  });

  it('rewrites absolute Home Assistant URLs through ingress-aware proxy paths', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}${homeAssistantUrlFixtures.ingressBasePath}/`;
    document.head.append(base);
    window.__NAVET_CONFIG__ = { hassUrl: oauthSessionFixture.haBaseUrl };
    resetRuntimeContextForTests();
    const resolver = new HomeAssistantResourceResolver(() => null);

    const resource = resolver.resolveSync({
      kind: 'absolute_url',
      url: homeAssistantUrlFixtures.absoluteHaMediaArtwork,
    });

    expect(resource.url).toBe(
      `${homeAssistantUrlFixtures.ingressBasePath}/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room`
    );
    expect(resource.authStrategy).toBe('same_origin');
  });

  it('does not double-proxy ingress-prefixed Home Assistant camera snapshots', () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}${homeAssistantUrlFixtures.ingressBasePath}/`;
    document.head.append(base);
    window.history.replaceState({}, '', `${homeAssistantUrlFixtures.ingressBasePath}/security`);
    window.__NAVET_CONFIG__ = { hassUrl: oauthSessionFixture.haBaseUrl };
    resetRuntimeContextForTests();
    const resolver = new HomeAssistantResourceResolver(() => null);

    const ingressSnapshotUrl = `${homeAssistantUrlFixtures.ingressBasePath}${homeAssistantUrlFixtures.staleProxyCameraSnapshot}`;
    const resource = resolver.resolveSync({
      kind: 'camera_snapshot',
      entityId: 'camera.front_door',
      rawPath: ingressSnapshotUrl,
    });

    expect(resource.url).toBe(ingressSnapshotUrl);
    expect(resource.authStrategy).toBe('same_origin');
  });

  it('strips stale proxy paths in panel mode and keeps same-origin HA access', () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
    const resolver = new HomeAssistantResourceResolver(() => null);

    const resource = resolver.resolveSync({
      kind: 'absolute_url',
      url: `${window.location.origin}${homeAssistantUrlFixtures.staleProxyCameraSnapshot}`,
    });

    expect(resource.url).toBe(homeAssistantUrlFixtures.relativeCameraSnapshot);
    expect(resource.authStrategy).toBe('panel_bridge');
  });

  it('passes external URLs through unchanged when they are safe', () => {
    const resolver = new HomeAssistantResourceResolver(() => null);

    const resource = resolver.resolveSync({
      kind: 'absolute_url',
      url: homeAssistantUrlFixtures.crossOriginExternalImage,
    });

    expect(resource.url).toBe(homeAssistantUrlFixtures.crossOriginExternalImage);
    expect(resource.authStrategy).toBe('none');
  });

  it('rejects unsafe URL schemes', () => {
    const resolver = new HomeAssistantResourceResolver(() => null);

    const resource = resolver.resolveSync({
      kind: 'absolute_url',
      url: homeAssistantUrlFixtures.unsafeJavascriptUrl,
    });

    expect(resource.kind).toBe('unavailable');
    expect(resource.url).toBeUndefined();
  });
});
