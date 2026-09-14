import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../login-page';

const { chooseDiscoveryMock, fetchDiscoveryMock, loginMock, toastSuccessMock } = vi.hoisted(() => ({
  chooseDiscoveryMock: vi.fn(),
  fetchDiscoveryMock: vi.fn(),
  loginMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: vi.fn(),
  },
}));

vi.mock('@navet/app/auth/AuthProvider', () => ({
  useAuthSession: () => ({
    login: loginMock,
  }),
}));

vi.mock('@navet/app/auth/homeAssistantDiscovery', () => ({
  chooseDiscoveredHomeAssistantUrl: chooseDiscoveryMock,
  fetchHomeAssistantDiscovery: fetchDiscoveryMock,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    loginMock.mockReset();
    toastSuccessMock.mockReset();
    fetchDiscoveryMock.mockReset();
    chooseDiscoveryMock.mockReset();
    useSettingsStore.setState({ language: 'en' });
    window.__NAVET_CONFIG__ = {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = new URL(String(input), window.location.origin);
        if (url.pathname === '/__navet_devices__/availability') {
          return Promise.resolve(
            new Response(JSON.stringify({ available: false }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              providerId: url.searchParams.get('providerId'),
              state: 'ready',
              authorization: 'approved_connection',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      })
    );
  });

  it('starts with provider selection before showing provider-specific fields', () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);

    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Choose your smart home' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Smart Home URL')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Homey' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Connect with another device' })
    ).not.toBeInTheDocument();
  });

  it('shows an authentication initialization error before provider selection', () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);

    renderWithProviders(
      <LoginPage initialError="Navet could not reach Home Assistant to finish sign-in. Check that Home Assistant is reachable from this Navet server, then try again." />
    );

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent(
      'Navet could not reach Home Assistant to finish sign-in. Check that Home Assistant is reachable from this Navet server, then try again.'
    );
    expect(errorAlert).toHaveClass('mt-3');
  });

  it('prefills a discovered Home Assistant URL while keeping the field editable', async () => {
    fetchDiscoveryMock.mockResolvedValue({
      candidates: [
        {
          url: 'http://homeassistant.local:8123',
          source: 'hostname',
          reachable: true,
        },
      ],
    });
    chooseDiscoveryMock.mockReturnValue('http://homeassistant.local:8123');

    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Home Assistant' }));

    expect(screen.queryByRole('button', { name: 'Homey' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'openHAB' })).not.toBeInTheDocument();

    const urlInput = (await screen.findByLabelText('Home Assistant URL')) as HTMLInputElement;
    await waitFor(() => expect(urlInput.value).toBe('http://homeassistant.local:8123'));
    expect(urlInput).toBeEnabled();
    expect(
      screen.getByText(
        'Found Home Assistant on your network. You can edit the URL before continuing.'
      )
    ).toBeInTheDocument();
  });

  it('submits the manually entered URL to OAuth login', async () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);
    loginMock.mockResolvedValue(undefined);

    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Home Assistant' }));

    fireEvent.change(await screen.findByLabelText('Home Assistant URL'), {
      target: { value: 'https://ha.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        providerId: 'home_assistant',
        hassUrl: 'https://ha.example.com',
      })
    );
  });

  it('leaves manual login available when discovery fails', async () => {
    fetchDiscoveryMock.mockRejectedValue(new Error('offline'));
    chooseDiscoveryMock.mockReturnValue(null);

    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Home Assistant' }));

    await waitFor(() =>
      expect(
        screen.getByText('You’ll sign in on Home Assistant, then return to Navet.')
      ).toBeInTheDocument()
    );
    expect(screen.getByLabelText('Home Assistant URL')).toBeEnabled();
  });

  it('starts Homey OAuth without asking for URL or token input', async () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);
    loginMock.mockResolvedValue(undefined);

    renderWithProviders(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Homey' }));

    expect(screen.getByRole('heading', { name: 'Connect to Homey' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Smart Home URL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        providerId: 'homey',
      })
    );
  });

  it('shows openHAB credential fields and submits them with the base URL', async () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);
    loginMock.mockResolvedValue(undefined);

    renderWithProviders(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'openHAB' }));

    fireEvent.change(await screen.findByLabelText('openHAB URL'), {
      target: { value: 'http://openhab.local:8080' },
    });
    fireEvent.change(screen.getByLabelText('openHAB Username'), {
      target: { value: 'navet' },
    });
    fireEvent.change(screen.getByLabelText('openHAB Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        providerId: 'openhab',
        hassUrl: 'http://openhab.local:8080',
        username: 'navet',
        password: 'secret',
      })
    );
  });

  it('shows provider credentials immediately without requesting installation approval', async () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);
    renderWithProviders(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'openHAB' }));
    expect(await screen.findByLabelText('openHAB Username')).toBeVisible();
    expect(screen.queryByLabelText('Setup code')).not.toBeInTheDocument();
    expect(
      vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes('/__navet_auth__/setup'))
    ).toBe(false);
  });

  it('offers a provider-neutral additional-device flow before sign-in', async () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);
    const writeText = vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    vi.mocked(fetch).mockImplementation((input) => {
      const url = new URL(String(input), window.location.origin);
      if (url.pathname === '/__navet_devices__/availability') {
        return Promise.resolve(
          new Response(JSON.stringify({ available: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'a'.repeat(32),
            requesterSecret: 'b'.repeat(64),
            code: '1234-5678-9abc',
            expiresAt: Date.now() + 300_000,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    renderWithProviders(<LoginPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Connect with another device' }));

    expect(await screen.findByText('1234-5678-9ABC', undefined, { timeout: 5_000 })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Copy device connection code' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('1234-5678-9ABC'));
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByText('Copied')).toBeVisible();
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Waiting for approval/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeVisible();
  });
});
