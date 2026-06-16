import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityCommandMock, invokeIntegrationNativeActionMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
  invokeIntegrationNativeActionMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@navet/app/services/integration-native-action.service', () => ({
  invokeIntegrationNativeAction: invokeIntegrationNativeActionMock,
}));

import { useSwitchToggleAction } from '../use-switch-toggle-action';

describe('useSwitchToggleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete document.documentElement.dataset.navetStorybook;
  });

  it('skips provider command dispatch in Storybook runtime', () => {
    document.documentElement.dataset.navetStorybook = 'true';
    const setIsOn = vi.fn();
    const resetTimerRef = { current: null as number | null };

    const { result } = renderHookWithProviders(() =>
      useSwitchToggleAction({
        id: 'switch.espresso_machine',
        isOn: true,
        setIsOn,
        resetTimerRef,
        resolvedServiceDomain: 'switch',
        resolvedServiceAction: 'toggle',
        updateSwitchFailedMessage: 'Failed to update switch',
      })
    );

    act(() => {
      result.current();
    });

    expect(setIsOn).toHaveBeenCalledWith(false);
    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();
    expect(invokeIntegrationNativeActionMock).not.toHaveBeenCalled();
  });
});
