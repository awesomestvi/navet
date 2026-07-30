import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('previews a dashboard without changing the device assignment, then offers explicit use', async () => {
    renderWithProviders(
      <DashboardSwitcherPill
        active
        activeClassName="active"
        inactiveClassName="inactive"
        onShowHome={() => {}}
      />
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open dashboards' }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('menuitem', { name: /Upstairs lights/ }));

    let state = useDashboardCollectionStore.getState();
    expect(state).toMatchObject({
      activeDashboardId: 'upstairs',
      activeSource: 'preview',
    });
    expect(state.collection.dashboardIdByClientId[clientId]).toBe('home');
    expect(window.location.pathname).toBe('/dashboard/upstairs');

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open dashboards' }));
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Use on this device' }));

    state = useDashboardCollectionStore.getState();
    expect(state).toMatchObject({
      activeDashboardId: 'upstairs',
      activeSource: 'assignment',
    });
    expect(state.collection.dashboardIdByClientId[clientId]).toBe('upstairs');
  });
});
