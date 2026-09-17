import type { DashboardController } from '@navet/app/features/dashboard/hooks/use-dashboard-controller';
import { I18nProvider } from '@navet/app/i18n/i18n-provider';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOverlays } from '../dashboard-overlays';

const addCardDialogSpy = vi.fn();
const addEntityDialogSpy = vi.fn();

vi.mock('../add-entity-dialog', () => ({
  AddEntityDialogPrimitive: (props: unknown) => {
    addCardDialogSpy(props);
    return <div data-testid="add-card-dialog" />;
  },
  AddEntityDialog: (props: unknown) => {
    addEntityDialogSpy(props);
    return <div data-testid="add-entity-dialog" />;
  },
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
            customCards: [],
            handleAddCard: vi.fn(),
            handleAddGenericEntityCard: vi.fn(),
            handleAddLibraryCard: vi.fn(),
            handleAddEntity: vi.fn(),
            handleChooseAllEntities: vi.fn(),
            handleChooseBlankDashboard: vi.fn(),
            handleOnboardingImportDashboardConfig: vi.fn(),
            hiddenEntityIds: [],
            homeLayout: { cardIds: [] },
            isEditMode: false,
            manualDeviceMap: new Map(),
            manualEntityViewsByCanonicalId: {},
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
  it('offers only hidden entities from the active room in a room view', async () => {
    addEntityDialogSpy.mockClear();
    const kitchenLight = {
      id: 'sensor.kitchen_temperature',
      name: 'Kitchen temperature',
      room: 'Kitchen',
      size: 'small',
      value: '21',
      unit: '°C',
      type: 'sensors',
    } satisfies DeviceWithType;
    const hallwayLight = {
      ...kitchenLight,
      id: 'sensor.hallway_temperature',
      name: 'Hallway temperature',
      room: 'Hallway',
    } satisfies DeviceWithType;

    renderOverlays({
      activeRoom: 'Kitchen',
      showAddEntityDialog: true,
      addableEntityIds: [kitchenLight.id, hallwayLight.id],
      hiddenEntityIds: [kitchenLight.id, hallwayLight.id],
      availableDeviceMap: new Map([
        [kitchenLight.id, kitchenLight],
        [hallwayLight.id, hallwayLight],
      ]),
    });

    await waitFor(() => expect(addEntityDialogSpy).toHaveBeenCalled());
    expect(addEntityDialogSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      currentRoom: 'Kitchen',
      visibleEntityIds: [kitchenLight.id],
    });
  });

  it('offers only hidden light entities from the Lights dashboard', async () => {
    addEntityDialogSpy.mockClear();
    const light = {
      id: 'light.kitchen',
      name: 'Kitchen light',
      room: 'Kitchen',
      size: 'small',
      type: 'lights',
      state: false,
      brightness: 0,
      temp: 2700,
    } satisfies DeviceWithType;
    const sensor = {
      id: 'sensor.kitchen_temperature',
      name: 'Kitchen temperature',
      room: 'Kitchen',
      size: 'small',
      value: '21',
      unit: '°C',
      type: 'sensors',
    } satisfies DeviceWithType;
    const allLightDeviceMap = new Map<string, DeviceWithType>([[light.id, light]]);

    renderOverlays({
      activeSection: 'lights',
      showAddEntityDialog: true,
      addableEntityIds: [light.id, sensor.id],
      hiddenEntityIds: [light.id, sensor.id],
      availableDeviceMap: new Map<string, DeviceWithType>([
        [light.id, light],
        [sensor.id, sensor],
      ]),
      sectionData: {
        isOverviewSection: false,
        energyCustomCards: [],
        energyOrderedCardIds: [],
        hiddenLightEntityIds: [light.id],
        allLightDeviceMap,
        climateDeviceMap: new Map(),
        allClimateDeviceMap: new Map(),
        hiddenClimateEntityIds: [],
        climateSections: [],
      },
    });

    await waitFor(() => expect(addEntityDialogSpy).toHaveBeenCalled());
    expect(addEntityDialogSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      deviceMap: allLightDeviceMap,
      visibleEntityIds: [light.id],
    });
  });

  it('includes sensor entities in the add-card library', () => {
    addCardDialogSpy.mockClear();

    renderOverlays({
      showAddCardDialog: true,
      manualDeviceMap: new Map([
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

  it('includes normalized unknown entities in the add-card library', () => {
    addCardDialogSpy.mockClear();

    renderOverlays({
      showAddCardDialog: true,
      manualEntityViewsByCanonicalId: {
        'home_assistant:todo.groceries': {
          id: 'home_assistant:todo.groceries',
          canonicalId: 'home_assistant:todo.groceries',
          providerId: 'home_assistant',
          externalId: 'todo.groceries',
          type: 'unknown',
          name: 'Groceries',
          room: 'Kitchen',
          primaryState: '3 items',
          availability: 'available',
          capabilities: [],
          attributes: {},
          resources: undefined,
          size: 'small',
        },
      },
    });

    const props = addCardDialogSpy.mock.calls[0]?.[0] as {
      libraryCards?: Array<{ id: string; idSearchText?: string }>;
    };

    expect(props.libraryCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'home_assistant:todo.groceries',
          idSearchText: expect.stringContaining('todo.groceries'),
        }),
      ])
    );
  });

  it('routes generic-only entities to the generic entity card action', () => {
    addCardDialogSpy.mockClear();
    const handleAddGenericEntityCard = vi.fn();

    renderOverlays({
      showAddCardDialog: true,
      handleAddGenericEntityCard,
      manualEntityViewsByCanonicalId: {
        'home_assistant:event.doorbell': {
          id: 'home_assistant:event.doorbell',
          canonicalId: 'home_assistant:event.doorbell',
          providerId: 'home_assistant',
          externalId: 'event.doorbell',
          type: 'unknown',
          name: 'Doorbell event',
          room: 'Porch',
          primaryState: '2026-07-09T08:30:00Z',
          availability: 'available',
          capabilities: [],
          attributes: {},
          resources: undefined,
          size: 'small',
        },
      },
    });

    const props = addCardDialogSpy.mock.calls[0]?.[0] as {
      onAddLibraryCard?: (cardId: string) => void;
    };

    props.onAddLibraryCard?.('home_assistant:event.doorbell');

    expect(handleAddGenericEntityCard).toHaveBeenCalledWith('home_assistant:event.doorbell');
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
