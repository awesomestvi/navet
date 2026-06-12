import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VacuumControlsCompact } from '../vacuum-controls-compact';
import type { VacuumCapabilities } from '../vacuum-features';

describe('VacuumControlsCompact', () => {
  const createCapabilities = (overrides: Partial<VacuumCapabilities> = {}): VacuumCapabilities => ({
    canStart: true,
    canPause: true,
    canStop: false,
    canReturnHome: true,
    canLocate: false,
    canCleanSpot: false,
    canSetFanSpeed: true,
    currentFanSpeed: 'quiet',
    fanSpeedOptions: ['quiet'],
    canCycleFanSpeed: false,
    canShowMap: false,
    canCleanByArea: false,
    canOrderAreaCleaning: false,
    availableCleaningAreas: [],
    ...overrides,
  });

  it('renders the fan-speed cycle control only when at least two options are available', () => {
    const onCycleFanSpeed = vi.fn();
    const baseProps = {
      currentStatus: 'idle' as const,
      onStartCleaning: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
      onReturnHome: vi.fn(),
      onLocate: vi.fn(),
      onCleanSpot: vi.fn(),
      onCycleFanSpeed,
      onOpenSettings: vi.fn(),
      theme: 'dark' as const,
      isUpdatingFanSpeed: false,
    };

    const { rerender } = renderWithProviders(
      <VacuumControlsCompact {...baseProps} capabilities={createCapabilities()} />
    );

    expect(
      screen.queryByRole('button', {
        name: 'Fan Speed: quiet',
      })
    ).not.toBeInTheDocument();

    rerender(
      <VacuumControlsCompact
        {...baseProps}
        capabilities={createCapabilities({
          fanSpeedOptions: ['quiet', 'balanced'],
          canCycleFanSpeed: true,
        })}
      />
    );

    expect(
      screen.getByRole('button', {
        name: 'Fan Speed: quiet',
      })
    ).toBeInTheDocument();
  });

  it('cycles through available fan speeds in order and wraps to the first option', async () => {
    const onCycleFanSpeed = vi.fn();
    const baseProps = {
      currentStatus: 'idle' as const,
      onStartCleaning: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
      onReturnHome: vi.fn(),
      onLocate: vi.fn(),
      onCleanSpot: vi.fn(),
      onCycleFanSpeed,
      onOpenSettings: vi.fn(),
      theme: 'dark' as const,
      isUpdatingFanSpeed: false,
    };

    const { rerender } = renderWithProviders(
      <VacuumControlsCompact
        {...baseProps}
        capabilities={createCapabilities({
          fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
          canCycleFanSpeed: true,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fan Speed: quiet' }));
    expect(onCycleFanSpeed).toHaveBeenNthCalledWith(1, 'balanced');

    rerender(
      <VacuumControlsCompact
        {...baseProps}
        capabilities={createCapabilities({
          currentFanSpeed: 'balanced',
          fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
          canCycleFanSpeed: true,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fan Speed: balanced' }));
    expect(onCycleFanSpeed).toHaveBeenNthCalledWith(2, 'turbo');

    rerender(
      <VacuumControlsCompact
        {...baseProps}
        capabilities={createCapabilities({
          currentFanSpeed: 'turbo',
          fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
          canCycleFanSpeed: true,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fan Speed: turbo' }));
    expect(onCycleFanSpeed).toHaveBeenNthCalledWith(3, 'quiet');
  });

  it('shows the current fan-speed position as a badge on the control', () => {
    renderWithProviders(
      <VacuumControlsCompact
        currentStatus="idle"
        onStartCleaning={vi.fn()}
        onPause={vi.fn()}
        onStop={vi.fn()}
        onReturnHome={vi.fn()}
        onLocate={vi.fn()}
        onCleanSpot={vi.fn()}
        onCycleFanSpeed={vi.fn()}
        onOpenSettings={vi.fn()}
        theme="dark"
        isUpdatingFanSpeed={false}
        capabilities={createCapabilities({
          currentFanSpeed: 'balanced',
          fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
          canCycleFanSpeed: true,
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Fan Speed: balanced' })).toHaveTextContent('2');
  });

  it('disables the compact controls when the card is unavailable', () => {
    const onCycleFanSpeed = vi.fn();

    renderWithProviders(
      <VacuumControlsCompact
        currentStatus="idle"
        onStartCleaning={vi.fn()}
        onPause={vi.fn()}
        onStop={vi.fn()}
        onReturnHome={vi.fn()}
        onLocate={vi.fn()}
        onCleanSpot={vi.fn()}
        onCycleFanSpeed={onCycleFanSpeed}
        onOpenSettings={vi.fn()}
        theme="dark"
        isUpdatingFanSpeed={false}
        disabled
        capabilities={createCapabilities({
          canLocate: true,
          canCleanSpot: true,
          fanSpeedOptions: ['quiet', 'balanced'],
          canCycleFanSpeed: true,
        })}
      />
    );

    const fanSpeedButton = screen.getByRole('button', { name: 'Fan Speed: quiet' });
    expect(fanSpeedButton).toBeDisabled();
    fireEvent.click(fanSpeedButton);
    expect(onCycleFanSpeed).not.toHaveBeenCalled();
  });

  it('renders a stop button for running vacuums that advertise stop instead of pause', () => {
    const onStop = vi.fn();

    renderWithProviders(
      <VacuumControlsCompact
        currentStatus="cleaning"
        onStartCleaning={vi.fn()}
        onPause={vi.fn()}
        onStop={onStop}
        onReturnHome={vi.fn()}
        onLocate={vi.fn()}
        onCleanSpot={vi.fn()}
        onCycleFanSpeed={vi.fn()}
        onOpenSettings={vi.fn()}
        theme="dark"
        isUpdatingFanSpeed={false}
        capabilities={createCapabilities({
          canPause: false,
          canStop: true,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop cleaning' }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
