import type { ProviderEntityRoomContext } from '@navet/app/hooks';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntityRoomSelector } from './entity-room-selector';

const { updateEntityRoomMock, setRoomOverrideMock, clearRoomOverrideMock } = vi.hoisted(() => ({
  updateEntityRoomMock: vi.fn(),
  setRoomOverrideMock: vi.fn(),
  clearRoomOverrideMock: vi.fn(),
}));

const rawEntityIdKey = ['entity', 'id'].join('_');

function createRoomContext(areaId: string | null): ProviderEntityRoomContext {
  return {
    entry: {
      [rawEntityIdKey]: 'home_assistant:media_player.bathroom',
      area_id: areaId,
      device_id: null,
    } as unknown as NonNullable<ProviderEntityRoomContext['entry']>,
    deviceAreaId: null,
  };
}

let mockRoomContext: ProviderEntityRoomContext = {
  ...createRoomContext('bathroom'),
};

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
  useProviderEntityRoomContext: () => mockRoomContext,
}));

vi.mock('@navet/app/stores/entity-room-overrides-store', () => ({
  useEntityRoomOverridesStore: (selector: (state: unknown) => unknown) =>
    selector({
      roomIdsByEntityId: {},
      setRoomOverride: setRoomOverrideMock,
      clearRoomOverride: clearRoomOverrideMock,
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
    updateEntityRoom: updateEntityRoomMock,
  },
}));

describe('EntityRoomSelector', () => {
  it('uses neutral native popup classes for compact selectors', () => {
    mockRoomContext = createRoomContext('bathroom');
    render(<EntityRoomSelector entityId="home_assistant:media_player.bathroom" compact />);

    const select = screen.getByRole('combobox', { name: 'Room' });
    expect(select).toHaveClass('absolute', 'appearance-none', 'opacity-0');
    expect(screen.getAllByText('Bathroom')).toHaveLength(2);
  });

  it('only mirrors compact focus styling for focus-visible focus', () => {
    mockRoomContext = createRoomContext('bathroom');
    render(<EntityRoomSelector entityId="home_assistant:media_player.bathroom" compact />);

    const select = screen.getByRole('combobox', { name: 'Room' });
    const visualEyebrow = screen.getAllByText('Bathroom')[0]?.closest('div[aria-hidden="true"]');
    expect(visualEyebrow).not.toHaveClass('ring-2');

    const originalMatches = select.matches.bind(select);

    select.matches = ((selector: string) =>
      selector === ':focus-visible' ? false : originalMatches(selector)) as typeof select.matches;
    fireEvent.focus(select);
    expect(visualEyebrow).not.toHaveClass('ring-2');

    select.matches = ((selector: string) =>
      selector === ':focus-visible' ? true : originalMatches(selector)) as typeof select.matches;
    fireEvent.blur(select);
    fireEvent.focus(select);
    expect(visualEyebrow).toHaveClass('ring-2');
  });

  it('falls back to a local room override when the entity has no registry-backed room context', () => {
    mockRoomContext = {
      entry: null,
      deviceAreaId: null,
    };
    updateEntityRoomMock.mockReset();
    setRoomOverrideMock.mockReset();
    clearRoomOverrideMock.mockReset();

    render(<EntityRoomSelector entityId="home_assistant:media_player.walkman" compact />);

    const select = screen.getByRole('combobox', { name: 'Room' });
    expect(select).toBeEnabled();

    fireEvent.change(select, { target: { value: 'home_assistant:bathroom' } });

    expect(setRoomOverrideMock).toHaveBeenCalledWith(
      'home_assistant:media_player.walkman',
      'home_assistant:bathroom'
    );
    expect(updateEntityRoomMock).not.toHaveBeenCalled();
  });

  it('shows a fallback room name when the entity room context is missing', () => {
    mockRoomContext = {
      entry: null,
      deviceAreaId: null,
    };

    render(
      <EntityRoomSelector
        entityId="home_assistant:media_player.walkman"
        compact
        fallbackRoomName="Bathroom"
      />
    );

    expect(screen.getAllByText('Bathroom')).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: 'Room' })).toHaveValue('home_assistant:bathroom');
  });
});
