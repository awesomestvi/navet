import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorInputSwatch } from '../color-input-swatch';
import { ColorPickerPanel } from '../color-picker-panel';

describe('ColorInputSwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces color changes and only emits the latest value', () => {
    const onChange = vi.fn();

    renderWithProviders(
      <ColorInputSwatch
        value="#f97316"
        ariaLabel="Custom color"
        changeDebounceMs={220}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
    const input = screen.getByRole('textbox', { name: 'Hex color' });
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

    renderWithProviders(
      <ColorInputSwatch
        value="#f97316"
        ariaLabel="Custom color"
        changeDebounceMs={220}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
    const input = screen.getByRole('textbox', { name: 'Hex color' });
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
    fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
    const input = screen.getByRole('textbox', { name: 'Hex color' });

    expect(trigger?.getAttribute('style')).toContain('conic-gradient');

    fireEvent.change(input, { target: { value: '#00ff00' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });
  it('supports keyboard color adjustment and rejects incomplete hex values', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <ColorInputSwatch value="#ff0000" ariaLabel="Custom color" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
    const hex = screen.getByRole('textbox', { name: 'Hex color' });
    fireEvent.change(hex, { target: { value: '#bad' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(hex);
    expect(hex).toHaveValue('#ff0000');
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Saturation and brightness' }), {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    expect(onChange).toHaveBeenCalledWith('#ff1919');
    fireEvent.keyDown(hex, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open a disabled picker', () => {
    renderWithProviders(<ColorInputSwatch value="#ff0000" ariaLabel="Custom color" disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom color' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps detailed editing optional and applies a light preset on selection', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    renderWithProviders(
      <ColorPickerPanel
        value="#ffffff"
        compact
        presets={['#ffa500']}
        onChange={onChange}
        onCommit={onCommit}
      />
    );
    expect(screen.getByRole('slider', { name: 'Hue' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Hex color' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Select color #ffa500' }));
    expect(onChange).toHaveBeenCalledWith('#ffa500');
    expect(onCommit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Detailed color'));
    expect(screen.getByRole('textbox', { name: 'Hex color' })).toHaveValue('#ffa500');
  });
});
