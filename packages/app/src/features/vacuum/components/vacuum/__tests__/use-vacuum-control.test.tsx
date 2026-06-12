import { vacuumEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/vacuum';
import { dreameFixtures } from '@navet/app/test/fixtures/home-assistant/integrations/dreame';
import { roborockFixtures } from '@navet/app/test/fixtures/home-assistant/integrations/roborock';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { runActionMock, serviceMock } = vi.hoisted(() => ({
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
    callService: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@navet/app/hooks', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@navet/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: async ({
    type,
    entityId,
    fanSpeed,
    areaIds,
  }: {
    type:
      | 'start'
      | 'clean_vacuum_areas'
      | 'pause'
      | 'stop'
      | 'return_home'
      | 'locate'
      | 'clean_spot'
      | 'set_vacuum_fan_speed';
    entityId: string;
    fanSpeed?: string;
    areaIds?: string[];
  }) => {
    const service =
      type === 'start'
        ? 'start'
        : type === 'clean_vacuum_areas'
          ? 'clean_area'
          : type === 'pause'
            ? 'pause'
            : type === 'stop'
              ? 'stop'
              : type === 'return_home'
                ? 'return_to_base'
                : type === 'locate'
                  ? 'locate'
                  : type === 'clean_spot'
                    ? 'clean_spot'
                    : 'set_fan_speed';
    await serviceMock.callService(
      'vacuum',
      service,
      type === 'set_vacuum_fan_speed'
        ? { fan_speed: fanSpeed }
        : type === 'clean_vacuum_areas'
          ? { cleaning_area_id: areaIds }
          : {},
      { entity_id: entityId }
    );
    return {
      accepted: true,
      requiresEventConfirmation: true,
    };
  },
}));

import { useVacuumControl } from '../use-vacuum-control';

describe('useVacuumControl', () => {
  it('starts cleaning through the documented Home Assistant vacuum.start service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: roborockFixtures.vacuum.entity_id,
        initialStatus: 'idle',
      })
    );

    act(() => result.current.handleStartCleaning());

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'start',
      {},
      { entity_id: roborockFixtures.vacuum.entity_id }
    );
  });

  it('starts an area clean through the documented Home Assistant vacuum.clean_area service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: roborockFixtures.vacuum.entity_id,
        initialStatus: 'idle',
      })
    );

    act(() => result.current.handleStartAreaCleaning(['kitchen', 'living_room']));

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'clean_area',
      { cleaning_area_id: ['kitchen', 'living_room'] },
      { entity_id: roborockFixtures.vacuum.entity_id }
    );
  });

  it('pauses cleaning through the documented Home Assistant vacuum.pause service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: dreameFixtures.vacuum.entity_id,
        initialStatus: 'cleaning',
      })
    );

    act(() => result.current.handlePause());

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'pause',
      {},
      { entity_id: dreameFixtures.vacuum.entity_id }
    );
  });

  it('stops cleaning through the documented Home Assistant vacuum.stop service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: dreameFixtures.vacuum.entity_id,
        initialStatus: 'cleaning',
      })
    );

    act(() => result.current.handleStop());

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'stop',
      {},
      { entity_id: dreameFixtures.vacuum.entity_id }
    );
  });

  it('returns the vacuum to base through the documented Home Assistant service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: vacuumEntityFixtures.normal.entity_id,
        initialStatus: 'cleaning',
      })
    );

    act(() => result.current.handleReturnHome());

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'return_to_base',
      {},
      { entity_id: vacuumEntityFixtures.normal.entity_id }
    );
  });

  it('locates the vacuum through the documented Home Assistant service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: vacuumEntityFixtures.normal.entity_id,
        initialStatus: 'idle',
      })
    );

    act(() => result.current.handleLocate());

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'locate',
      {},
      { entity_id: vacuumEntityFixtures.normal.entity_id }
    );
  });

  it('starts a spot clean through the documented Home Assistant service', () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: vacuumEntityFixtures.normal.entity_id,
        initialStatus: 'idle',
      })
    );

    act(() => result.current.handleCleanSpot());

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'clean_spot',
      {},
      { entity_id: vacuumEntityFixtures.normal.entity_id }
    );
  });

  it('sets vacuum fan speed through the documented Home Assistant service', async () => {
    const { result } = renderHookWithProviders(() =>
      useVacuumControl({
        entityId: vacuumEntityFixtures.normal.entity_id,
        initialStatus: 'idle',
        currentFanSpeed: 'quiet',
      })
    );

    await act(async () => {
      result.current.handleSetFanSpeed('turbo');
      await Promise.resolve();
    });

    expect(result.current.displayFanSpeed).toBe('turbo');
    expect(serviceMock.callService).toHaveBeenCalledWith(
      'vacuum',
      'set_fan_speed',
      { fan_speed: 'turbo' },
      { entity_id: vacuumEntityFixtures.normal.entity_id }
    );
  });

  it('clears the optimistic fan speed once live state catches up', async () => {
    const { result, rerender } = renderHookWithProviders(
      ({ currentFanSpeed }: { currentFanSpeed?: string }) =>
        useVacuumControl({
          entityId: vacuumEntityFixtures.normal.entity_id,
          initialStatus: 'idle',
          currentFanSpeed,
        }),
      {
        initialProps: { currentFanSpeed: 'quiet' },
      }
    );

    await act(async () => {
      result.current.handleSetFanSpeed('turbo');
      await Promise.resolve();
    });
    expect(result.current.displayFanSpeed).toBe('turbo');

    await act(async () => {
      rerender({ currentFanSpeed: 'turbo' });
      await Promise.resolve();
    });

    expect(result.current.displayFanSpeed).toBe('turbo');
    expect(result.current.isUpdatingFanSpeed).toBe(false);
  });
});
