import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaTvView } from '../media-tv-view';

const defaultProps = {
  size: 'small' as const,
  playerName: 'Living Room TV',
  source: 'HDMI 1',
  sourceList: ['HDMI 1', 'Apple TV'],
  isOn: true,
  isPlaying: false,
  volume: 24,
  isMuted: false,
  theme: 'glass' as const,
  remoteAvailable: true,
  canSetVolume: true,
  canMuteVolume: true,
  canSelectSource: true,
  onTogglePlay: vi.fn(),
  onToggleMute: vi.fn(),
  onVolumeChange: vi.fn(),
  onVolumeInteractionStart: vi.fn(),
  onVolumeInteractionEnd: vi.fn(),
  onSelectSource: vi.fn(),
  onRemoteCommand: vi.fn(),
  onOpenDialog: vi.fn(),
};

describe('MediaTvView', () => {
  it('renders the small TV control buttons and toggles the D-pad controls', () => {
    renderWithProviders(<MediaTvView {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Show volume controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show channel controls' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volume down' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Channel down' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume playback' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show volume controls' }));

    expect(screen.getByRole('button', { name: 'Hide volume controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volume down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volume up' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show channel controls' }));

    expect(screen.getByRole('button', { name: 'Hide channel controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Channel down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Channel up' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volume down' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show navigation pad' }));

    expect(screen.getByRole('button', { name: 'Hide navigation pad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('hides unsupported remote, volume, and source controls', () => {
    renderWithProviders(
      <MediaTvView
        {...defaultProps}
        remoteAvailable={false}
        canSetVolume={false}
        canMuteVolume={false}
        canSelectSource={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Volume down' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volume up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mute volume' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Channel down' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Channel up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show navigation pad' })).not.toBeInTheDocument();
    expect(screen.queryByText('HDMI 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume playback' })).toBeInTheDocument();
  });

  it('renders source badges inside the TV input source selector menu', async () => {
    renderWithProviders(
      <MediaTvView {...defaultProps} source="Apple TV" sourceList={['Apple TV', 'Netflix']} />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: /apple tv/i }));

    expect((await screen.findAllByText('Apple TV')).length).toBeGreaterThan(1);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('uses a visible fallback source badge for unknown sources in light theme', () => {
    const { container } = renderWithProviders(
      <MediaTvView
        {...defaultProps}
        theme="light"
        source="Samsung TV Plus"
        sourceList={['Samsung TV Plus']}
      />
    );

    const badge = container.querySelector('button[aria-haspopup="menu"] span[aria-hidden="true"]');
    expect(badge?.className).toContain('bg-white');
    expect(badge?.className).toContain('border-slate-300/90');
    expect(badge?.className).toContain('text-slate-700');
  });
});
