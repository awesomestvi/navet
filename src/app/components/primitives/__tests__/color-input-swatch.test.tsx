import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ColorInputSwatch } from '../color-input-swatch';

describe('ColorInputSwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces color changes and only emits the latest value', () => {
    const onChange = vi.fn();

    const { container } = renderWithProviders(
      <ColorInputSwatch
        value="#f97316"
        ariaLabel="Custom color"
        changeDebounceMs={220}
        onChange={onChange}
      />
    );

    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#ff0000' } });
    fireEvent.change(input, { target: { value: '#00ff00' } });

    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(219);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });

  it('flushes a pending color change on blur', () => {
    const onChange = vi.fn();

    const { container } = renderWithProviders(
      <ColorInputSwatch
        value="#f97316"
        ariaLabel="Custom color"
        changeDebounceMs={220}
        onChange={onChange}
      />
    );

    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#ff0000' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });

  it('keeps picker behavior when rendered with the rainbow visual', () => {
    const onChange = vi.fn();

    const { container } = renderWithProviders(
      <ColorInputSwatch
        value="#f97316"
        ariaLabel="Custom color"
        visual="rainbow"
        onChange={onChange}
      />
    );

    const trigger = container.firstElementChild;
    const input = container.querySelector('input[type="color"]') as HTMLInputElement;

    expect(trigger?.getAttribute('style')).toContain('conic-gradient');

    fireEvent.change(input, { target: { value: '#00ff00' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });
});
