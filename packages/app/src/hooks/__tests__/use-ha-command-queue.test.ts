import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHaCommandQueue } from '../use-ha-command-queue';

describe('useHaCommandQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends a queued value after the debounce window', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHaCommandQueue(send, 75));

    act(() => result.current.queue(42));
    expect(send).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(75));
    expect(send).toHaveBeenCalledWith(42);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid calls — only sends the last value', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHaCommandQueue(send, 75));

    act(() => {
      result.current.queue(10);
      result.current.queue(20);
      result.current.queue(30);
    });

    await act(async () => vi.advanceTimersByTime(75));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(30);
  });

  it('sends immediately when immediate=true, skipping the debounce', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHaCommandQueue(send, 75));

    await act(async () => result.current.queue(99, true));
    expect(send).toHaveBeenCalledWith(99);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('cancel() drops a pending value without sending it', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useHaCommandQueue(send, 75));

    act(() => result.current.queue(42));
    act(() => result.current.cancel());

    await act(async () => vi.advanceTimersByTime(75));
    expect(send).not.toHaveBeenCalled();
  });

  it('re-flushes a value queued while a request was in-flight', async () => {
    let resolveFlight!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      resolveFlight = resolve;
    });
    const send = vi.fn().mockReturnValueOnce(inFlight).mockResolvedValue(undefined);
    const { result } = renderHook(() => useHaCommandQueue(send, 75));

    // First value — fires immediately
    await act(async () => result.current.queue(1, true));
    expect(send).toHaveBeenCalledWith(1);
    expect(send).toHaveBeenCalledTimes(1);

    // Queue a second value while the first is still in-flight
    act(() => result.current.queue(2, true));
    expect(send).toHaveBeenCalledTimes(1); // blocked — in-flight

    // Resolve the first request — the queued value should flush
    await act(async () => resolveFlight());
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith(2);
  });

  it('does not send if cancel() is called while request is in-flight', async () => {
    let resolveFlight!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      resolveFlight = resolve;
    });
    const send = vi.fn().mockReturnValueOnce(inFlight).mockResolvedValue(undefined);
    const { result } = renderHook(() => useHaCommandQueue(send, 75));

    // Send first value
    await act(async () => result.current.queue(1, true));

    // Queue second, then cancel before flight resolves
    act(() => result.current.queue(2, true));
    act(() => result.current.cancel());

    await act(async () => resolveFlight());
    expect(send).toHaveBeenCalledTimes(1); // second never sent
  });

  it('cancels pending timeout on unmount', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useHaCommandQueue(send, 75));

    act(() => result.current.queue(42));
    unmount();

    await act(async () => vi.advanceTimersByTime(75));
    expect(send).not.toHaveBeenCalled();
  });
});
