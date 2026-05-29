import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { vacuumEntityFixtures } from '@/test/fixtures/home-assistant/entities/vacuum';
import { dreameFixtures } from '@/test/fixtures/home-assistant/integrations/dreame';
import { roborockFixtures } from '@/test/fixtures/home-assistant/integrations/roborock';
import { renderHookWithProviders } from '@/test/render';

const { runActionMock, serviceMock } = vi.hoisted(() => ({
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
    callService: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/hooks', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

vi.mock('@/app/services/integration-action.service', () => ({
  dispatchEntityAction: async ({
    domain,
    service,
    serviceData = {},
    entityId,
  }: {
    domain: string;
    service: string;
    serviceData?: Record<string, unknown>;
    entityId: string;
  }) => await serviceMock.callService(domain, service, serviceData, { entity_id: entityId }),
  dispatchEntityCommand: async ({
    type,
    entityId,
  }: {
    type: 'start' | 'stop' | 'return_home';
    entityId: string;
  }) => {
    const service = type === 'start' ? 'start' : type === 'stop' ? 'pause' : 'return_to_base';
    await serviceMock.callService('vacuum', service, {}, { entity_id: entityId });
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
});
