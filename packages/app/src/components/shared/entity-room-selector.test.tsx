import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntityRoomSelector } from './entity-room-selector';

vi.mock('@navet/app/hooks', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'common.room') return 'Room';
      if (key === 'common.noRoom') return 'No room';
      if (key === 'entityRoomSelector.createAction') return 'Create room';
      return key;
    },
  }),
  useTheme: () => ({
    theme: 'glass' as const,
  }),
  useIntegrationStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentProviderId: 'home_assistant',
      roomDescriptors: [
        {
          id: 'home_assistant:bathroom',
          name: 'Bathroom',
          providerIds: ['home_assistant'],
          memberIds: [],
          canonicalId: 'room-bathroom',
          normalizedName: 'bathroom',
          sources: [],
          canAssign: true,
        },
      ],
    }),
  useProviderEntityRoomContext: () => ({
    entry: { area_id: 'bathroom', device_id: null },
    deviceAreaId: null,
  }),
}));

vi.mock('@navet/app/platform/provider-room-management', () => ({
  buildManageableRoomReferences: () => [
    {
      id: 'home_assistant:bathroom',
      name: 'Bathroom',
      canAssign: true,
    },
  ],
}));

vi.mock('@navet/app/services/integration-admin.service', () => ({
  integrationAdminService: {
    createRoom: vi.fn(),
    updateEntityRoom: vi.fn(),
  },
}));

describe('EntityRoomSelector', () => {
  it('uses neutral native popup classes for compact selectors', () => {
    render(<EntityRoomSelector entityId="home_assistant:media_player.bathroom" compact />);

    const select = screen.getByRole('combobox', { name: 'Room' });
    expect(select).toHaveClass('bg-white', 'text-slate-900', 'appearance-none', 'opacity-0');
    expect(select).not.toHaveClass('text-white');
  });
});
