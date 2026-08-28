import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { SettingsSection } from '@navet/app/features/settings';
import { SETTINGS_DETAIL_HISTORY_KEY } from '@navet/app/features/settings/settings-navigation';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDashboardDefinition,
  createLegacyDashboardCollection,
  sanitizeDashboardCollection,
} from './dashboard-collection';
import { useDashboardCollectionStore } from './dashboard-collection-store';
import { DashboardSwitcherPill } from './dashboard-switcher';

describe('DashboardSwitcherPill', () => {
  let clientId: string;

  beforeEach(async () => {
    await resetAppStores();
    window.history.replaceState({}, '', '/');
    clientId = getDashboardClientIdentity().id;
    const home = createDashboardDefinition({ id: 'home', name: 'Home' });
    const upstairs = createDashboardDefinition({ id: 'upstairs', name: 'Upstairs lights' });
    const collection = sanitizeDashboardCollection(
      {
        schemaVersion: 1,
        defaultDashboardId: 'home',
        order: ['home', 'upstairs'],
        dashboardsById: { home, upstairs },
        dashboardIdByClientId: { [clientId]: 'home' },
      },
      createLegacyDashboardCollection({ homeLayout: null })
    );

    useDashboardCollectionStore.setState({
      collection,
      activeDashboardId: 'home',
      activeSource: 'assignment',
      pendingAssignedDashboardId: null,
      layoutHistory: { future: [], past: [] },
    });
  });

  it('navigates from the main area when inactive and always opens from the chevron', async () => {
    const onShowHome = vi.fn();
    renderWithProviders(<DashboardSwitcherPill active={false} onShowHome={onShowHome} />);

    const button = screen.getByRole('button', { name: /Open dashboards/ });
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    expect(onShowHome).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    const chevron = button.querySelector('[data-dashboard-switcher-chevron]');
    expect(chevron).not.toBeNull();
    fireEvent.pointerDown(chevron as Element);

    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
  });

  it('previews a dashboard without changing the device assignment, then offers explicit use', async () => {
    renderWithProviders(<DashboardSwitcherPill active onShowHome={() => {}} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: /Open dashboards/ }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('menuitem', { name: /Upstairs lights/ }));

    let state = useDashboardCollectionStore.getState();
    expect(state).toMatchObject({
      activeDashboardId: 'upstairs',
      activeSource: 'preview',
    });
    expect(state.collection.dashboardIdByClientId[clientId]).toBe('home');
    expect(window.location.pathname).toBe('/dashboard/upstairs');

    fireEvent.pointerDown(screen.getByRole('button', { name: /Open dashboards/ }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Use on this device' }));

    state = useDashboardCollectionStore.getState();
    expect(state).toMatchObject({
      activeDashboardId: 'upstairs',
      activeSource: 'assignment',
    });
    expect(state.collection.dashboardIdByClientId[clientId]).toBe('upstairs');
  });

  it('opens the dashboard section when managing dashboards', async () => {
    renderWithProviders(<DashboardSwitcherPill active onShowHome={() => {}} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: /Open dashboards/ }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Manage dashboards' }));

    expect(useNavigationStore.getState().activeSection).toBe('settings');
    expect(localStorage.getItem('navet-settings-active-tab')).toBe(JSON.stringify('dashboard'));
    expect(window.history.state).toMatchObject({ [SETTINGS_DETAIL_HISTORY_KEY]: true });

    renderWithProviders(<SettingsSection layout="mobile" />);
    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Settings' })).not.toBeInTheDocument()
    );
    expect(document.getElementById('dashboard-settings-title')).toHaveTextContent('Dashboard');
  });
});
