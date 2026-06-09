import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VacuumSettingsDialog } from '../vacuum-settings-dialog';

describe('VacuumSettingsDialog', () => {
  it('dispatches fan-speed changes immediately when a speed is selected', async () => {
    const onSetFanSpeed = vi.fn();

    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        onSetFanSpeed={onSetFanSpeed}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        fanSpeed="quiet"
        fanSpeeds={['quiet', 'balanced', 'turbo']}
        supportsFanSpeed
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'balanced' }));

    expect(onSetFanSpeed).toHaveBeenCalledWith('balanced');
    expect(
      screen.queryAllByText(
        (_, element) => element?.textContent?.trim().endsWith('· balanced') ?? false
      ).length
    ).toBeGreaterThan(0);
  });

  it('reflects live fan-speed updates back into the selected state', () => {
    const { rerender } = renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        onSetFanSpeed={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        fanSpeed="quiet"
        fanSpeeds={['quiet', 'balanced', 'turbo']}
        supportsFanSpeed
      />
    );

    expect(
      screen.queryAllByText(
        (_, element) => element?.textContent?.trim().endsWith('· quiet') ?? false
      ).length
    ).toBeGreaterThan(0);

    rerender(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        onSetFanSpeed={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        fanSpeed="turbo"
        fanSpeeds={['quiet', 'balanced', 'turbo']}
        supportsFanSpeed
      />
    );

    expect(
      screen.queryAllByText(
        (_, element) => element?.textContent?.trim().endsWith('· turbo') ?? false
      ).length
    ).toBeGreaterThan(0);
  });
});
