import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseDiscoveredHomeAssistantUrl,
  fetchHomeAssistantDiscovery,
  parseHomeAssistantDiscoveryResult,
} from '../homeAssistantDiscovery';

describe('Home Assistant discovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('chooses one reachable candidate as the suggested URL', () => {
    expect(
      chooseDiscoveredHomeAssistantUrl({
        candidates: [
          {
            url: 'http://homeassistant.local:8123',
            source: 'hostname',
            reachable: true,
          },
        ],
      })
    ).toBe('http://homeassistant.local:8123');
  });

  it('does not choose when there are no reachable candidates', () => {
    expect(
      chooseDiscoveredHomeAssistantUrl({
        candidates: [
          {
            url: 'http://homeassistant.local:8123',
            source: 'hostname',
            reachable: false,
          },
        ],
      })
    ).toBeNull();
  });

  it('does not silently choose between multiple reachable candidates', () => {
    expect(
      chooseDiscoveredHomeAssistantUrl({
        candidates: [
          {
            url: 'http://homeassistant.local:8123',
            source: 'hostname',
            reachable: true,
          },
          {
            url: 'http://homeassistant:8123',
            source: 'hostname',
            reachable: true,
          },
        ],
      })
    ).toBeNull();
  });

  it('uses configured preferred URL ahead of reachable hostname candidates', () => {
    expect(
      chooseDiscoveredHomeAssistantUrl({
        preferredUrl: 'https://ha.example.com',
        candidates: [
          {
            url: 'https://ha.example.com',
            source: 'env',
            reachable: false,
          },
          {
            url: 'http://homeassistant.local:8123',
            source: 'hostname',
            reachable: true,
          },
        ],
      })
    ).toBe('https://ha.example.com');
  });

  it('rejects malformed discovery payloads', () => {
    expect(parseHomeAssistantDiscoveryResult({ candidates: [{ url: 'ftp://example.com' }] })).toBe(
      null
    );
  });

  it('returns null when the discovery endpoint is unavailable', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await expect(fetchHomeAssistantDiscovery()).resolves.toBeNull();
  });
});
