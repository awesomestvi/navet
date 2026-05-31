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

    expect(screen.getByRole('button', { name: 'Volume down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volume up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Channel down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Channel up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume playback' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show navigation pad' }));

    expect(screen.getByRole('button', { name: 'Hide navigation pad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });
});
