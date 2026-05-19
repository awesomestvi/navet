import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/app/stores/settings-store';
import { renderHookWithProviders } from '@/test/render';
import { getGreetingPeriod, useHeaderDateTime } from '../use-header-datetime';

describe('useHeaderDateTime', () => {
  afterEach(() => {
    useSettingsStore.getState().resetSettings();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('classifies 07:30 as morning', () => {
    expect(getGreetingPeriod(7)).toBe('morning');
  });

  it('updates the greeting when the time-of-day period changes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 11, 59, 0));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const { result } = renderHookWithProviders(() => useHeaderDateTime());

    expect(result.current.greetingKey).toBe('header.greeting.morning');

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 12, 12, 0, 0));
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.greetingKey).toBe('header.greeting.afternoon');
  });

  it('formats the header clock with the selected 12-hour preference', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 13, 5, 0));
    useSettingsStore.getState().updateSettings({ language: 'en', use24HourTime: false });

    const { result } = renderHookWithProviders(() => useHeaderDateTime());

    expect(result.current.formattedTime).toMatch(/[AP]M$/);
  });

  it('formats the header clock with the selected 24-hour preference', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 13, 5, 0));
    useSettingsStore.getState().updateSettings({ language: 'en', use24HourTime: true });

    const { result } = renderHookWithProviders(() => useHeaderDateTime());

    expect(result.current.formattedTime).toMatch(/^\d{1,2}:\d{2}$/);
    expect(result.current.formattedTime).not.toMatch(/[AP]M$/);
  });
});
