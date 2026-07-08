import type { TranslationKey } from '@navet/app/i18n';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { HomeDashboardLayoutState } from '../hooks/use-home-dashboard-layout';

export type DashboardPackId = 'command-center' | 'security-monitor' | 'energy-wall';

export interface DashboardPackDefinition {
  id: DashboardPackId;
  labelKey: TranslationKey;
}

interface DashboardPackSectionDefinition {
  id: string;
  title: string;
  width: number;
  select: (devices: DeviceWithType[]) => string[];
}

export const DASHBOARD_PACKS: DashboardPackDefinition[] = [
  {
    id: 'command-center',
    labelKey: 'dashboard.packs.commandCenter',
  },
  {
    id: 'security-monitor',
    labelKey: 'dashboard.packs.securityMonitor',
  },
  {
    id: 'energy-wall',
    labelKey: 'dashboard.packs.energyWall',
  },
];

const MAX_SECTION_CARDS = 8;

function uniqueCardIds(ids: string[], usedIds: Set<string>) {
  const result: string[] = [];

  for (const id of ids) {
    if (usedIds.has(id)) {
      continue;
    }

    usedIds.add(id);
    result.push(id);
  }

  return result.slice(0, MAX_SECTION_CARDS);
}

function compareByName(left: DeviceWithType, right: DeviceWithType) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function hasEnergySignal(device: DeviceWithType) {
  if (device.type === 'switches' && (device.power !== undefined || device.energy !== undefined)) {
    return true;
  }

  if ('deviceClass' in device) {
    return ['battery', 'energy', 'power', 'voltage'].includes(device.deviceClass ?? '');
  }

  return false;
}

function isSecurityAttentionDevice(device: DeviceWithType) {
  return (
    device.securitySeverity === 'critical' ||
    device.securitySeverity === 'warning' ||
    device.securitySeverity === 'active' ||
    device.securitySeverity === 'unknown'
  );
}

function byType(devices: DeviceWithType[], types: Array<DeviceWithType['type']>) {
  const typeSet = new Set(types);
  return devices
    .filter((device) => typeSet.has(device.type))
    .sort(compareByName)
    .map((device) => device.id);
}

function securityAttention(devices: DeviceWithType[]) {
  return devices
    .filter(isSecurityAttentionDevice)
    .sort((left, right) => {
      const order = { critical: 0, warning: 1, active: 2, unknown: 3, normal: 4 };
      return (
        order[left.securitySeverity ?? 'normal'] - order[right.securitySeverity ?? 'normal'] ||
        compareByName(left, right)
      );
    })
    .map((device) => device.id);
}

function energyDevices(devices: DeviceWithType[]) {
  return devices
    .filter(hasEnergySignal)
    .sort(compareByName)
    .map((device) => device.id);
}

function makeSectionDefinitions(packId: DashboardPackId): DashboardPackSectionDefinition[] {
  switch (packId) {
    case 'security-monitor':
      return [
        {
          id: 'access',
          title: 'Access',
          width: 6,
          select: (devices) => [
            ...securityAttention(devices),
            ...byType(devices, ['locks', 'covers']),
          ],
        },
        {
          id: 'cameras',
          title: 'Cameras',
          width: 6,
          select: (devices) => byType(devices, ['cameras']),
        },
        {
          id: 'presence',
          title: 'Presence',
          width: 6,
          select: (devices) => byType(devices, ['persons', 'sensors']),
        },
      ];
    case 'energy-wall':
      return [
        {
          id: 'energy',
          title: 'Live Energy',
          width: 6,
          select: energyDevices,
        },
        {
          id: 'climate',
          title: 'Climate Load',
          width: 6,
          select: (devices) => byType(devices, ['climate', 'hvac', 'fans', 'weather']),
        },
        {
          id: 'devices',
          title: 'Device Draw',
          width: 6,
          select: (devices) => byType(devices, ['switches', 'sensors']),
        },
      ];
    case 'command-center':
      return [
        {
          id: 'attention',
          title: 'Needs Attention',
          width: 6,
          select: (devices) => [...securityAttention(devices), ...energyDevices(devices)],
        },
        {
          id: 'comfort',
          title: 'Comfort',
          width: 6,
          select: (devices) => byType(devices, ['weather', 'climate', 'hvac', 'lights']),
        },
        {
          id: 'household',
          title: 'Household',
          width: 4,
          select: (devices) => byType(devices, ['calendars', 'persons', 'media']),
        },
        {
          id: 'actions',
          title: 'Quick Actions',
          width: 4,
          select: (devices) => byType(devices, ['scenes', 'switches']),
        },
      ];
  }
}

export function buildDashboardPackLayout(
  packId: DashboardPackId,
  devices: Iterable<DeviceWithType>
): HomeDashboardLayoutState {
  const sortedDevices = Array.from(devices).sort(compareByName);
  const usedCardIds = new Set<string>();
  let sectionIndex = 0;
  const sections = makeSectionDefinitions(packId).flatMap((definition) => {
    const cardIds = uniqueCardIds(definition.select(sortedDevices), usedCardIds);

    if (cardIds.length === 0) {
      return [];
    }

    const index = sectionIndex;
    sectionIndex += 1;

    return [
      {
        id: `dashboard-pack-${packId}-${definition.id}`,
        title: definition.title,
        x: index % 2 === 0 ? 0 : 6,
        y: Math.floor(index / 2),
        w: definition.width,
        h: 1,
        span: definition.width,
        cardIds,
      },
    ];
  });
  const cardIds = sections.flatMap((section) => section.cardIds);
  const cardSectionAssignments = Object.fromEntries(
    sections.flatMap((section) => section.cardIds.map((cardId) => [cardId, section.id]))
  );

  return {
    mode: 'sectioned',
    showHero: false,
    cardIds,
    sections: sections.map(({ cardIds: _cardIds, ...section }) => section),
    cardSectionAssignments,
  };
}
