import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { LoginPage } from '../login-page';

const { chooseDiscoveryMock, fetchDiscoveryMock, loginMock } = vi.hoisted(() => ({
  chooseDiscoveryMock: vi.fn(),
  fetchDiscoveryMock: vi.fn(),
  loginMock: vi.fn(),
}));

vi.mock('@/auth/AuthProvider', () => ({
  useAuthSession: () => ({
    login: loginMock,
  }),
}));

vi.mock('@/auth/homeAssistantDiscovery', () => ({
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

  it('renders a URL-only OAuth login form', () => {
    fetchDiscoveryMock.mockResolvedValue(null);
    chooseDiscoveryMock.mockReturnValue(null);

    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Connect to Home Assistant' })).toBeInTheDocument();
    expect(screen.getByLabelText('Smart Home URL')).toBeInTheDocument();
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

    const urlInput = screen.getByLabelText('Smart Home URL') as HTMLInputElement;
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

    fireEvent.change(screen.getByLabelText('Smart Home URL'), {
      target: { value: 'https://ha.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({ hassUrl: 'https://ha.example.com' })
    );
  });

  it('leaves manual login available when discovery fails', async () => {
    fetchDiscoveryMock.mockRejectedValue(new Error('offline'));
    chooseDiscoveryMock.mockReturnValue(null);

    renderWithProviders(<LoginPage />);

    await waitFor(() =>
      expect(
        screen.getByText('You’ll sign in on Home Assistant, then return to Navet.')
      ).toBeInTheDocument()
    );
    expect(screen.getByLabelText('Smart Home URL')).toBeEnabled();
  });
});
