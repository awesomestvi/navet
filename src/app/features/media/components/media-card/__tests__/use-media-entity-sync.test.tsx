import { act, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { getMediaPlayerCapabilities } from '@/app/constants/media-player-features';
import { renderHookWithProviders } from '@/test/render';
import { useMediaEntitySync } from '../use-media-entity-sync';

function createLiveEntity({ volumeLevel }: { volumeLevel: number }) {
  return {
    state: 'playing',
    attributes: {
      volume_level: volumeLevel,
      is_volume_muted: false,
      media_position: 3,
      media_position_updated_at: '2026-05-21T19:00:00.000Z',
      media_duration: 180,
      supported_features: 12,
    },
  };
}

describe('useMediaEntitySync', () => {
  it('does not reset elapsed time for volume-only entity updates', async () => {
    const { result, rerender } = renderHookWithProviders(
      ({ volumeLevel }: { volumeLevel: number }) => {
        const [state, setState] = useState<'playing' | 'paused' | 'idle' | 'off'>('playing');
        const [elapsedSeconds, setElapsedSeconds] = useState(0);
        const [, setDurationSeconds] = useState(0);
        const [volume, setVolume] = useState(20);
        const [previousVolume, setPreviousVolume] = useState(20);
        const [isMuted, setIsMuted] = useState(false);
        const [supportsGrouping, setSupportsGrouping] = useState(false);
        const [groupMembers, setGroupMembers] = useState<string[]>([]);

        useMediaEntitySync({
          liveEntity: createLiveEntity({ volumeLevel }),
          entityId: 'media_player.office',
          currentMuted: isMuted,
          initialState: 'playing',
          initialVolume: 20,
          initialMuted: false,
          initialElapsedSeconds: 0,
          initialDurationSeconds: 0,
          initialMediaCapabilities: getMediaPlayerCapabilities(12),
          initialSupportsGrouping: false,
          initialGroupMembers: [],
          isAdjustingVolume: false,
          setState,
          setElapsedSeconds,
          setDurationSeconds,
          setVolume,
          setPreviousVolume,
          setIsMuted,
          setSupportsGrouping,
          setGroupMembers,
        });

        return {
          elapsedSeconds,
          groupMembers,
          previousVolume,
          setElapsedSeconds,
          state,
          supportsGrouping,
          volume,
        };
      },
      { initialProps: { volumeLevel: 0.2 } }
    );

    await waitFor(() => {
      expect(result.current.elapsedSeconds).toBe(3);
    });

    act(() => result.current.setElapsedSeconds(42));

    rerender({ volumeLevel: 0.5 });

    await waitFor(() => {
      expect(result.current.volume).toBe(50);
    });
    expect(result.current.elapsedSeconds).toBe(42);
  });

  it('keeps elapsed and duration when live playback attributes are temporarily missing', async () => {
    const { result, rerender } = renderHookWithProviders(
      ({ includePlaybackAttrs }: { includePlaybackAttrs: boolean }) => {
        const [state, setState] = useState<'playing' | 'paused' | 'idle' | 'off'>('playing');
        const [elapsedSeconds, setElapsedSeconds] = useState(0);
        const [durationSeconds, setDurationSeconds] = useState(0);
        const [volume, setVolume] = useState(20);
        const [previousVolume, setPreviousVolume] = useState(20);
        const [isMuted, setIsMuted] = useState(false);
        const [supportsGrouping, setSupportsGrouping] = useState(false);
        const [groupMembers, setGroupMembers] = useState<string[]>([]);
        const liveEntity = includePlaybackAttrs
          ? createLiveEntity({ volumeLevel: 0.2 })
          : {
              state: 'playing',
              attributes: {
                volume_level: 0.4,
                is_volume_muted: false,
                supported_features: 12,
              },
            };

        useMediaEntitySync({
          liveEntity,
          entityId: 'media_player.office',
          currentMuted: isMuted,
          initialState: 'playing',
          initialVolume: 20,
          initialMuted: false,
          initialElapsedSeconds: 0,
          initialDurationSeconds: 0,
          initialMediaCapabilities: getMediaPlayerCapabilities(12),
          initialSupportsGrouping: false,
          initialGroupMembers: [],
          isAdjustingVolume: false,
          setState,
          setElapsedSeconds,
          setDurationSeconds,
          setVolume,
          setPreviousVolume,
          setIsMuted,
          setSupportsGrouping,
          setGroupMembers,
        });

        return {
          durationSeconds,
          elapsedSeconds,
          groupMembers,
          previousVolume,
          state,
          supportsGrouping,
          volume,
        };
      },
      { initialProps: { includePlaybackAttrs: true } }
    );

    await waitFor(() => {
      expect(result.current.elapsedSeconds).toBe(3);
      expect(result.current.durationSeconds).toBe(180);
    });

    rerender({ includePlaybackAttrs: false });

    await waitFor(() => {
      expect(result.current.volume).toBe(40);
    });
    expect(result.current.elapsedSeconds).toBe(3);
    expect(result.current.durationSeconds).toBe(180);
  });
});
