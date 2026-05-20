import { afterEach, describe, expect, it } from 'vitest';
import { setMediaQueryMatch } from '@/test/browser-mocks';
import { initializeInputModality } from '../input-modality';

let cleanup: (() => void) | undefined;

function startInputModality() {
  cleanup = initializeInputModality().cleanup;
}

function dispatchPointerEvent(type: string, pointerType: string) {
  const event = new Event(type) as PointerEvent;
  Object.defineProperty(event, 'pointerType', {
    configurable: true,
    value: pointerType,
  });
  window.dispatchEvent(event);
}

describe('initializeInputModality', () => {
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('defaults to touch without a fine pointer', () => {
    startInputModality();

    expect(document.documentElement.dataset.pointerModality).toBe('touch');
  });

  it('defaults to mouse with a fine pointer', () => {
    setMediaQueryMatch('(any-pointer: fine)', true);

    startInputModality();

    expect(document.documentElement.dataset.pointerModality).toBe('mouse');
  });

  it('switches to touch after touch pointer activity and touch events', () => {
    setMediaQueryMatch('(any-pointer: fine)', true);
    startInputModality();

    dispatchPointerEvent('pointerdown', 'touch');
    expect(document.documentElement.dataset.pointerModality).toBe('touch');

    dispatchPointerEvent('pointermove', 'mouse');
    expect(document.documentElement.dataset.pointerModality).toBe('mouse');

    window.dispatchEvent(new Event('touchstart'));
    expect(document.documentElement.dataset.pointerModality).toBe('touch');
  });

  it('switches back to mouse after mouse pointer activity', () => {
    startInputModality();

    dispatchPointerEvent('pointermove', 'mouse');

    expect(document.documentElement.dataset.pointerModality).toBe('mouse');
  });

  it('keeps scrollbars hidden for non-mouse pointer activity', () => {
    setMediaQueryMatch('(any-pointer: fine)', true);
    startInputModality();

    dispatchPointerEvent('pointerdown', 'pen');

    expect(document.documentElement.dataset.pointerModality).toBe('touch');
  });

  it('removes listeners and dataset state during cleanup', () => {
    startInputModality();

    cleanup?.();
    cleanup = undefined;
    dispatchPointerEvent('pointermove', 'mouse');

    expect(document.documentElement.dataset.pointerModality).toBeUndefined();
  });
});
