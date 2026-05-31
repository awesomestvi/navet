import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DemoApp from './demo-app';

const { authSnapshot } = vi.hoisted(() => ({
  authSnapshot: {
    providerId: 'home_assistant',
    runtime: 'standalone',
    authMode: 'standalone',
    haBaseUrl: null,
    isAuthenticated: false,
    sessions: {},
    authenticatedProviderIds: [],
  } as const,
}));

vi.mock('@navet/app/auth/integration-session-runtime', () => ({
  integrationSessionRuntime: {
    getAuthRuntime: () => 'standalone-oauth',
    getSnapshot: () => authSnapshot,
    getSession: () => null,
    subscribe: () => () => undefined,
    init: async () => authSnapshot,
    login: async () => authSnapshot,
    logout: async () => undefined,
    refresh: async () => authSnapshot,
    replaceSession: () => authSnapshot,
    setActiveProvider: () => authSnapshot,
  },
}));

describe('DemoApp', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/demo/security');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('renders the security demo route with camera cards', async () => {
    render(<DemoApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Security' }));

    expect(await screen.findAllByRole('button', { name: 'Open camera viewer' })).toHaveLength(2);
    expect(screen.getAllByText('Front Door').length).toBeGreaterThan(0);
    expect(screen.getByText('Driveway')).toBeInTheDocument();
  });
});
