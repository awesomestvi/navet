import { describe, expect, it, vi } from 'vitest';

const sessionRuntime = vi.hoisted(() => {
  const homeAssistantSession = {
    providerId: 'home_assistant' as const,
    runtime: 'standalone-oauth',
    authMode: 'oauth',
    haBaseUrl: 'https://ha.example.test',
    hassUrl: 'https://ha.example.test',
    auth: {
      accessToken: 'test-token',
    },
  };

  return {
    getSession: vi.fn(() => homeAssistantSession),
    getSnapshot: vi.fn(() => ({
      sessions: {
        home_assistant: homeAssistantSession,
      },
    })),
  };
});

vi.mock('@navet/app/integration-session-runtime', () => ({
  integrationSessionRuntime: sessionRuntime,
}));

vi.mock('@navet/app/auth/integration-session-runtime', () => ({
  integrationSessionRuntime: sessionRuntime,
}));

describe('provider-package-registry initialization', () => {
  it('loads with an existing provider session without re-entering the registry', async () => {
    vi.resetModules();

    const registry = await import('./provider-package-registry');

    expect(registry.getProviderPackageRegistration('home_assistant').contract.providerId).toBe(
      'home_assistant'
    );
  });
});
