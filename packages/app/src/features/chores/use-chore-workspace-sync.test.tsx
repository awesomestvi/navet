import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChoreWorkspaceStore } from './chore-workspace-store';
import { useChoreWorkspaceSync } from './use-chore-workspace-sync';

vi.mock('@navet/app/runtime/app-mode', () => ({
  isHomeAssistantPanelMode: () => false,
}));

const originalLoad = useChoreWorkspaceStore.getState().load;

afterEach(() => {
  useChoreWorkspaceStore.setState({ load: originalLoad });
  vi.useRealTimers();
});

describe('chore workspace sync', () => {
  it('requests a full workspace after local midnight so new occurrences can materialize', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 14, 23, 59, 45));
    const load = vi.fn(async () => {});
    useChoreWorkspaceStore.setState({ load });

    const { unmount } = renderHook(() => useChoreWorkspaceSync());
    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith();

    act(() => vi.advanceTimersByTime(30_000));
    expect(load).toHaveBeenNthCalledWith(2, { force: true });

    act(() => vi.advanceTimersByTime(30_000));
    expect(load).toHaveBeenNthCalledWith(3, undefined);
    unmount();
  });
});
