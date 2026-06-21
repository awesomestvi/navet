import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VacuumSettingsDialog } from '../vacuum-settings-dialog';

const { entityRoomSelectorMock } = vi.hoisted(() => ({
  entityRoomSelectorMock: vi.fn((_props?: unknown) => <div>Kitchen</div>),
}));

vi.mock('@navet/app/components/shared/entity-room-selector', () => ({
  EntityRoomSelector: (props: unknown) => entityRoomSelectorMock(props),
}));

describe('VacuumSettingsDialog', () => {
  it('passes the assigned room as the eyebrow fallback room name', () => {
    entityRoomSelectorMock.mockClear();

    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room="Kitchen"
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
      />
    );

    expect(entityRoomSelectorMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        entityId: 'vacuum.roborock',
        fallbackRoomName: 'Kitchen',
      })
    );
  });

  it('uses a constrained scroll shell so long mobile content can scroll', () => {
    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room="Kitchen"
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: Array.from({ length: 12 }, (_, index) => ({
            id: `room-${index}`,
            label: `Room ${index + 1}`,
          })),
        }}
      />
    );

    expect(screen.getByRole('dialog')).toHaveClass('flex', 'flex-col', 'max-h-[85vh]');
    expect(
      document.body.querySelector('.relative.flex.min-h-0.flex-1.flex-col.overflow-y-auto')
    ).not.toBeNull();
  });

  it('renders the footer as part of the scrollable dialog body', () => {
    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room="Kitchen"
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: Array.from({ length: 12 }, (_, index) => ({
            id: `room-${index}`,
            label: `Room ${index + 1}`,
          })),
        }}
      />
    );

    const startButton = screen.getByRole('button', { name: 'Start Cleaning' });
    const scrollRoot = document.body.querySelector(
      '.relative.flex.min-h-0.flex-1.flex-col.overflow-y-auto'
    );
    const footer = startButton.closest('.mt-6.flex.justify-end');

    expect(scrollRoot).not.toBeNull();
    expect(scrollRoot?.contains(startButton)).toBe(true);
    expect(footer).not.toBeNull();
  });

  it('renders the map tab only when map support is available', () => {
    const { rerender } = renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [{ id: 'kitchen', label: 'Kitchen' }],
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'Map' })).toBeInTheDocument();

    rerender(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: false,
          canCleanByArea: false,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [],
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Map' })).not.toBeInTheDocument();
  });

  it('selects areas in the map tab and starts area cleaning from controls', () => {
    const onStartAreaCleaning = vi.fn();

    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={onStartAreaCleaning}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'hallway', label: 'Hallway' },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    fireEvent.click(screen.getByRole('button', { name: /^Kitchen/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Hallway/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Cleaning' }));

    expect(onStartAreaCleaning).toHaveBeenCalledWith(['kitchen', 'hallway']);
    expect(screen.getAllByText('Hallway').length).toBeGreaterThan(0);
  });

  it('shows area reorder affordances only when ordered cleaning is supported', () => {
    const { rerender } = renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: true,
          availableCleaningAreas: [
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'hallway', label: 'Hallway' },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    fireEvent.click(screen.getByRole('button', { name: /^Kitchen/ }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Stop 1')).toBeInTheDocument();

    rerender(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'hallway', label: 'Hallway' },
          ],
        }}
      />
    );

    expect(screen.queryByText('Stop 1')).not.toBeInTheDocument();
  });

  it('does not add a nested scroll region to the selected areas section', () => {
    const { container } = renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room="Kitchen"
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: true,
          availableCleaningAreas: [
            { id: 'kitchen', label: 'Kitchen' },
            { id: 'hallway', label: 'Hallway' },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    fireEvent.click(screen.getByRole('button', { name: /^Kitchen/ }));

    expect(screen.getByText('Stop 1')).toBeInTheDocument();
    expect(container.querySelector('.max-h-28.overflow-auto')).toBeNull();
  });

  it('keeps the selected map tab active during live dialog rerenders', () => {
    const { rerender } = renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        fanSpeed="quiet"
        fanSpeeds={['quiet', 'balanced', 'turbo']}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: true,
          currentFanSpeed: 'quiet',
          fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [{ id: 'kitchen', label: 'Kitchen' }],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(
      within(screen.getByRole('tabpanel')).getByRole('button', { name: /^Kitchen/ })
    ).toBeInTheDocument();

    rerender(
      <VacuumSettingsDialog
        entityId="vacuum.roborock"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onStartAreaCleaning={vi.fn()}
        onPauseCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Robot"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="cleaning"
        fanSpeed="turbo"
        fanSpeeds={['quiet', 'balanced', 'turbo']}
        capabilities={{
          canStart: true,
          canPause: true,
          canStop: false,
          canReturnHome: true,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: true,
          currentFanSpeed: 'turbo',
          fanSpeedOptions: ['quiet', 'balanced', 'turbo'],
          canCycleFanSpeed: false,
          canShowMap: true,
          canCleanByArea: true,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [{ id: 'kitchen', label: 'Kitchen' }],
        }}
      />
    );

    expect(
      within(screen.getByRole('tabpanel')).getByRole('button', { name: /^Kitchen/ })
    ).toBeInTheDocument();
  });

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
    expect(screen.getByRole('button', { name: 'balanced' })).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'quiet' })).toBeInTheDocument();

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

    expect(screen.getByRole('button', { name: 'turbo' })).toBeInTheDocument();
  });

  it('hides the return-to-dock action when the vacuum does not support it', () => {
    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.basic"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Basic Vacuum"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: false,
          canStop: false,
          canReturnHome: false,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: false,
          canCleanByArea: false,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [],
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Return to Dock' })).not.toBeInTheDocument();
  });

  it('hides the controls tab when the vacuum has no dialog controls', () => {
    renderWithProviders(
      <VacuumSettingsDialog
        entityId="vacuum.minimal"
        isOpen
        onClose={vi.fn()}
        onStartCleaning={vi.fn()}
        onReturnHome={vi.fn()}
        name="Minimal Vacuum"
        room=""
        theme="dark"
        accentColorValue="#06b6d4"
        currentStatus="idle"
        supportsFanSpeed={false}
        capabilities={{
          canStart: true,
          canPause: false,
          canStop: false,
          canReturnHome: false,
          canLocate: false,
          canCleanSpot: false,
          canSetFanSpeed: false,
          currentFanSpeed: undefined,
          fanSpeedOptions: [],
          canCycleFanSpeed: false,
          canShowMap: false,
          canCleanByArea: false,
          canOrderAreaCleaning: false,
          availableCleaningAreas: [],
        }}
      />
    );

    expect(screen.queryByRole('button', { name: 'Controls' })).not.toBeInTheDocument();
  });
});
