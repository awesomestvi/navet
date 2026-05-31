import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../login-page';

const { chooseDiscoveryMock, fetchDiscoveryMock, loginMock } = vi.hoisted(() => ({
  chooseDiscoveryMock: vi.fn(),
  fetchDiscoveryMock: vi.fn(),
  loginMock: vi.fn(),
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
    fetchDiscoveryMock.mockReset();
    chooseDiscoveryMock.mockReset();
    window.__NAVET_CONFIG__ = {};
  });

  it('starts with provider selection before showing provider-specific fields', () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);

    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Choose your smart home' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Smart Home URL')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Homey' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
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

    const urlInput = screen.getByLabelText('Home Assistant URL') as HTMLInputElement;
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

    fireEvent.change(screen.getByLabelText('Home Assistant URL'), {
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

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        providerId: 'homey',
      })
    );
  });
});
