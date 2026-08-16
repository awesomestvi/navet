import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import { useDeviceDisplayProfileRuntimeStore } from '@navet/app/features/dashboard/clients/device-display-profile-runtime-store';
import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsSystemSection } from './settings-system-section';

function SystemStory({
  scenario = 'synced',
  connectedProvider = false,
}: {
  scenario?: 'empty' | 'error' | 'synced';
  connectedProvider?: boolean;
}) {
  const controller = useSettingsSectionController();
  if (connectedProvider) {
    controller.providerCards = controller.providerCards.map((provider) =>
      provider.id === 'home_assistant'
        ? {
            ...provider,
            status: 'connected',
            isActive: true,
            isConnected: true,
            canDisconnect: true,
            baseUrl: 'http://navet.local:5200/__navet_ha_proxy__',
          }
        : provider
    );
  }
  useEffect(() => {
    const identity = getDashboardClientIdentity({
      environment: { userAgent: 'Mozilla/5.0 (iPad)' },
      profileMode: 'wall_display',
      randomUUID: () => '12345678-1234-1234-1234-123456781234',
    });
    const runtime = useDashboardProfileRuntimeStore.getState();
    runtime.reset();
    runtime.setClient(identity);

    if (scenario === 'error') {
      runtime.markError('The shared dashboard could not be reached. Local settings are preserved.');
      useDeviceDisplayProfileRuntimeStore.getState().markDisabled();
    } else if (scenario === 'synced') {
      const now = new Date();
      runtime.setClients([
        {
          id: identity.id,
          name: identity.name,
          kind: identity.kind,
          firstSeenAt: new Date(now.getTime() - 86_400_000).toISOString(),
          lastSeenAt: now.toISOString(),
          lastRevision: 12,
        },
        {
          id: 'vishals_phone',
          name: 'Vishal’s phone',
          kind: 'phone',
          firstSeenAt: new Date(now.getTime() - 86_400_000 * 3).toISOString(),
          lastSeenAt: new Date(now.getTime() - 120_000).toISOString(),
          lastRevision: 12,
          userName: 'Vishal',
        },
      ]);
      runtime.markSynced({
        revision: 12,
        workspaceId: 'home_workspace',
        activity: {
          id: 'home_workspace:12',
          revision: 12,
          changedAt: new Date(now.getTime() - 120_000).toISOString(),
          changedPaths: ['/theme/primaryColor', '/homeDashboardLayout/sections'],
          actor: {
            clientId: 'vishals_phone',
            clientName: 'Vishal’s phone',
            clientKind: 'phone',
            userName: 'Vishal',
          },
        },
      });
      useDeviceDisplayProfileRuntimeStore.getState().replacePolicy(
        {
          schemaVersion: 1,
          profilesById: {
            display_wall: {
              id: 'display_wall',
              name: 'Wall displays',
              settings: { kioskMode: true, effectsQuality: 'low' },
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            },
          },
          profileIdByClientId: { [identity.id]: 'display_wall' },
        },
        1
      );
    } else {
      useDeviceDisplayProfileRuntimeStore.getState().markDisabled();
    }

    return () => {
      useDashboardProfileRuntimeStore.getState().reset();
      useDeviceDisplayProfileRuntimeStore.getState().markDisabled();
    };
  }, [scenario]);

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsSystemSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Settings/System',
  component: SystemStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'System settings grouped into smart-home providers, devices and sync, and device data and session actions.',
      },
    },
  },
} satisfies Meta<typeof SystemStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    scenario: 'synced',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-settings-detail-group]')).toHaveLength(3);
  },
};

export const ConnectedProvider: Story = {
  args: {
    scenario: 'synced',
    connectedProvider: true,
  },
};

export const FirstDashboard: Story = {
  args: {
    scenario: 'empty',
  },
};

export const SyncNeedsAttention: Story = {
  args: {
    scenario: 'error',
  },
};
