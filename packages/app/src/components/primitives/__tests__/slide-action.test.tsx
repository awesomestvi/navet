import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlideAction } from '../slide-action';

describe('SlideAction', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves the thumb as the pointer moves before completion', () => {
    render(
      <SlideAction
        actionLabel="Slide to unlock"
        ariaLabel="Slide to unlock"
        onComplete={vi.fn()}
        size="small"
        theme="glass"
      />
    );

    const button = screen.getByRole('button', { name: 'Slide to unlock' });
    Object.defineProperty(button, 'clientWidth', {
      configurable: true,
      value: 238,
    });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 48,
      height: 48,
      left: 0,
      right: 238,
      toJSON: () => ({}),
      top: 0,
      width: 238,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(button, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(button, { clientX: 96, pointerId: 1 });

    expect(button.style.getPropertyValue('--slide-knob-offset')).toBe('96px');
    expect(button.style.getPropertyValue('--slide-fill-width')).toBe('134px');
    expect(button.style.getPropertyValue('--slide-motion-duration')).toBe('0ms');
  });

  it('holds the completed position before slowly returning', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <SlideAction
        actionLabel="Slide to unlock"
        ariaLabel="Slide to unlock"
        onComplete={onComplete}
        size="small"
        theme="glass"
      />
    );

    const button = screen.getByRole('button', { name: 'Slide to unlock' });
    Object.defineProperty(button, 'clientWidth', {
      configurable: true,
      value: 238,
    });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      bottom: 48,
      height: 48,
      left: 0,
      right: 238,
      toJSON: () => ({}),
      top: 0,
      width: 238,
      x: 0,
      y: 0,
    });

    fireEvent.pointerDown(button, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(button, { clientX: 192, pointerId: 1 });
    fireEvent.pointerUp(button, { clientX: 192, pointerId: 1 });

    expect(button.style.getPropertyValue('--slide-knob-offset')).toBe('192px');

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(button.style.getPropertyValue('--slide-knob-offset')).toBe('192px');

    act(() => {
      vi.advanceTimersByTime(500);
      vi.advanceTimersByTime(16);
    });

    expect(button.style.getPropertyValue('--slide-knob-offset')).toBe('0px');
    expect(button.style.getPropertyValue('--slide-motion-duration')).toBe('620ms');
  });
});
