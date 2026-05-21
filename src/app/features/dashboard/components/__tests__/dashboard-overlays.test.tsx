import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/app/i18n/i18n-provider';
import type { DashboardController } from '../../hooks/use-dashboard-controller';
import { DashboardOverlays } from '../dashboard-overlays';

vi.mock('../add-card-dialog', () => ({
  AddCardDialogContainer: () => <div data-testid="add-card-dialog" />,
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
