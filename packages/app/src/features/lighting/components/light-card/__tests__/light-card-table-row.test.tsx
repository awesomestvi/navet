import { useEntityCardInteractionController } from '@navet/app/components/shared/entity-card-interaction-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LightCardTableRow } from '../light-card-table-row';

function Example({ edit = false, onToggle = vi.fn(), onOpen = vi.fn(), onBrightness = vi.fn() }) {
  const interaction = useEntityCardInteractionController({
    ariaLabel: 'Kitchen island',
    ariaPressed: true,
    isEditMode: edit,
    onToggle,
    onOpenControls: onOpen,
    onOpenSettings: onOpen,
  });
  return (
    <LightCardTableRow
      name="Kitchen island"
      isOn
      brightness={72}
      supportsBrightness
      isEditMode={edit}
      cardInteraction={interaction}
      iconButtonProps={interaction.iconButtonProps}
      onBrightnessChange={onBrightness}
      onBrightnessCommit={onBrightness}
    />
  );
}

describe('LightCardTableRow', () => {
  it('keeps power, controls and brightness as distinct sibling actions', () => {
    const onToggle = vi.fn(),
      onOpen = vi.fn(),
      onBrightness = vi.fn();
    const { container } = renderWithProviders(
      <Example onToggle={onToggle} onOpen={onOpen} onBrightness={onBrightness} />
    );
    const row = container.querySelector('[data-light-table-row]');
    expect(row).not.toHaveAttribute('role');
    expect(row).not.toHaveAttribute('tabindex');
    const power = screen.getByRole('button', { name: 'Toggle Kitchen island' });
    const opener = screen.getByRole('button', { name: 'Open settings for Kitchen island' });
    expect(power).toHaveAttribute('aria-pressed', 'true');
    expect(opener).not.toHaveAttribute('aria-pressed');
    expect(opener.querySelector('button, [role="slider"]')).toBeNull();
    fireEvent.click(power);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(opener);
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });
    expect(onBrightness).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
  it('disables all row controls during dashboard editing', () => {
    renderWithProviders(<Example edit />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled');
  });
});
