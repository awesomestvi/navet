import type { DashboardController } from '@navet/app/features/dashboard/hooks/use-dashboard-controller';
import { I18nProvider } from '@navet/app/i18n/i18n-provider';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOverlays } from '../dashboard-overlays';

const addCardDialogSpy = vi.fn();

vi.mock('../add-card-dialog', () => ({
  AddCardDialogContainer: (props: unknown) => {
    addCardDialogSpy(props);
    return <div data-testid="add-card-dialog" />;
  },
}));

vi.mock('../add-entity-dialog', () => ({
  AddEntityDialog: () => <div data-testid="add-entity-dialog" />,
}));

vi.mock('../dashboard-onboarding-dialog', () => ({
  DashboardOnboardingDialog: () => <div data-testid="dashboard-onboarding-dialog" />,
}));

function renderOverlays(controller: Partial<DashboardController>) {
  return render(
    <I18nProvider>
      <DashboardOverlays
        controller={
          {
            activeRoom: 'Kitchen',
            activeSection: 'home',
            addableEntityIds: [],
            allEntityIds: [],
            availableDeviceMap: new Map(),
            handleAddCard: vi.fn(),
            handleAddLibraryCard: vi.fn(),
            handleAddEntity: vi.fn(),
            handleChooseAllEntities: vi.fn(),
            handleChooseBlankDashboard: vi.fn(),
            handleOnboardingImportDashboardConfig: vi.fn(),
            hiddenEntityIds: [],
            homeLayout: { cardIds: [] },
            isEditMode: false,
            isOnboardingClosing: false,
            onboardingCompleted: true,
            onCompleteOnboardingClose: vi.fn(),
            onCloseAddCardDialog: vi.fn(),
            onCloseAddEntityDialog: vi.fn(),
            orderedCardIds: [],
            sectionData: {
              isOverviewSection: true,
              energyCustomCards: [],
              energyOrderedCardIds: [],
              hiddenLightEntityIds: [],
              allLightDeviceMap: new Map(),
              climateDeviceMap: new Map(),
              allClimateDeviceMap: new Map(),
              hiddenClimateEntityIds: [],
              climateSections: [],
            },
            showAddCardDialog: false,
            showAddEntityDialog: false,
            ...controller,
          } as DashboardController
        }
      />
    </I18nProvider>
  );
}

describe('DashboardOverlays', () => {
  it('includes sensor entities in the add-card library', () => {
    addCardDialogSpy.mockClear();

    renderOverlays({
      showAddCardDialog: true,
      availableDeviceMap: new Map([
        [
          'sensor.kitchen_temperature',
          {
            id: 'sensor.kitchen_temperature',
            name: 'Kitchen temperature',
            room: 'Kitchen',
            size: 'small',
            value: '21',
            unit: '°C',
            type: 'sensors',
            entityType: 'temperature',
          } satisfies DeviceWithType,
        ],
      ]),
    });

    const props = addCardDialogSpy.mock.calls[0]?.[0] as {
      libraryCards?: Array<{ id: string }>;
    };

    expect(props.libraryCards).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'sensor.kitchen_temperature' })])
    );
  });

  it('does not build add-card library items while the add-card dialog is closed', () => {
    const availableDeviceMap = new Map();
    const values = vi.fn(() => {
      throw new Error('library card values should not be read');
    });
    Object.defineProperty(availableDeviceMap, 'values', { value: values });

    expect(() => renderOverlays({ availableDeviceMap })).not.toThrow();
    expect(values).not.toHaveBeenCalled();
  });
});
