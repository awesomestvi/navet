import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KelvinColorTrigger } from '../kelvin-color-trigger';

describe('KelvinColorTrigger', () => {
  it('limits the picker to the light range and commits keyboard selections', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    renderWithProviders(
      <KelvinColorTrigger
        size="small"
        isOn
        currentTempColor="#ffffff"
        isActive={false}
        onClick={vi.fn()}
        temperature={{ value: 4000, min: 3000, max: 5000, onChange, onCommit }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Color Temperature' }));
    expect(onCommit).not.toHaveBeenCalled();
    const slider = screen.getByRole('slider', { name: 'Color Temperature' });
    expect(slider).toHaveAttribute('aria-valuemin', '3000');
    expect(slider).toHaveAttribute('aria-valuemax', '5000');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(5000);
    expect(onCommit).toHaveBeenCalledWith(5000);
  });
});
