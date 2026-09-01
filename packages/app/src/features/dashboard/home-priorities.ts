import { getHouseholdTodayOccurrences } from '@navet/app/features/chores/chore-dashboard-selectors';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { type ChoreWorkspaceData, getChoreTiming } from '@navet/core/chores';
import {
  type IntelligencePriorityCandidate,
  prepareIntelligencePriorityCandidates,
} from '@navet/core/intelligence-priorities';
import type { PlatformRepairIssue } from '@navet/core/provider-feature-models';

export interface HomePriorityPresentation {
  title?: string;
  titleKey?: 'priorities.weatherTitle' | 'priorities.maintenanceTitle' | 'priorities.energyTitle';
  detail: string;
}

export interface HomePriorityEntry {
  candidate: IntelligencePriorityCandidate;
  presentation: HomePriorityPresentation;
}

const SAFETY_KINDS = new Set([
  'alarm',
  'lock',
  'camera',
  'smoke',
  'carbonMonoxide',
  'gas',
  'waterLeak',
  'safety',
]);
const ADVERSE_WEATHER = new Set([
  'exceptional',
  'hail',
  'hurricane',
  'lightning',
  'lightning-rainy',
  'pouring',
  'snowy-heavy',
  'tornado',
  'windy-variant',
]);
const DAY_MS = 86_400_000;

function endOfLocalDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
}

function stableIdPart(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function securityEntries(devices: readonly DeviceWithType[], now: Date): HomePriorityEntry[] {
  return devices.flatMap<HomePriorityEntry>((device): HomePriorityEntry[] => {
    if (
      !device.securityKind ||
      device.securityKind === 'presence' ||
      device.securityKind === 'person'
    )
      return [];
    const unavailable =
      ('availability' in device && device.availability === 'unavailable') ||
      ('status' in device && device.status === 'unavailable') ||
      ('state' in device && device.state === 'unavailable');
    if (unavailable && SAFETY_KINDS.has(device.securityKind)) {
      return [
        {
          candidate: {
            id: `maintenance:unavailable:${stableIdPart(device.canonicalId ?? device.id)}`,
            source: 'maintenance',
            reasonCode: 'safety_device_unavailable',
            priority: 'attention',
            urgencyGroup: 'advisory',
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + DAY_MS).toISOString(),
            sourceReference: { section: 'security', providerId: device.providerId },
            sharedDisplayPolicy: 'safe',
            facts: { kind: device.securityKind },
          },
          presentation: {
            title: `${device.name} is unavailable`,
            detail: 'Safety device needs attention',
          },
        },
      ];
    }
    if (!['critical', 'warning', 'active'].includes(device.securitySeverity ?? '')) return [];
    const critical = device.securitySeverity === 'critical';
    const reasonCode = critical
      ? 'security_critical'
      : device.securitySeverity === 'warning'
        ? 'security_warning'
        : 'security_active';
    return [
      {
        candidate: {
          id: `security:${reasonCode}:${stableIdPart(device.canonicalId ?? device.id)}`,
          source: 'security',
          reasonCode,
          priority: critical ? 'critical' : 'attention',
          urgencyGroup: critical ? 'active_critical_safety' : 'due_soon',
          createdAt: now.toISOString(),
          expiresAt: new Date(
            now.getTime() + (critical ? 366 * DAY_MS : 6 * 60 * 60 * 1_000)
          ).toISOString(),
          sourceReference: { section: 'security', providerId: device.providerId },
          sharedDisplayPolicy: 'safe',
          facts: { kind: device.securityKind, severity: device.securitySeverity ?? 'active' },
        },
        presentation: {
          title: device.name,
          detail: critical ? 'Critical safety alert is active now' : 'Security needs attention now',
        },
      },
    ];
  });
}

function choreEntries(
  workspace: ChoreWorkspaceData | null | undefined,
  now: Date
): HomePriorityEntry[] {
  if (!workspace) return [];
  return getHouseholdTodayOccurrences(workspace, now).flatMap((occurrence) => {
    if (occurrence.status === 'done' || occurrence.status === 'skipped') return [];
    const definition = workspace.definitionsById[occurrence.definitionId];
    if (!definition?.enabled || definition.archivedAt) return [];
    const timing = getChoreTiming(occurrence, now);
    const approval = occurrence.status === 'awaiting_approval';
    const overdue = timing === 'overdue';
    const reasonCode = approval ? 'chore_approval' : overdue ? 'chore_overdue' : 'chore_due_today';
    return [
      {
        candidate: {
          id: `chore:${reasonCode}:${stableIdPart(occurrence.id)}`,
          source: 'chores',
          reasonCode,
          priority: 'attention',
          urgencyGroup: approval || overdue ? 'overdue_or_approval' : 'due_today',
          createdAt: occurrence.updatedAt,
          startsAt: occurrence.scheduledAt,
          expiresAt: endOfLocalDay(now),
          sourceReference: { section: 'tasks', occurrenceId: occurrence.id },
          sharedDisplayPolicy: 'safe',
          facts: { timing: approval ? 'approval' : overdue ? 'overdue' : 'today' },
        },
        presentation: {
          title: definition.title,
          detail: approval ? 'Needs approval' : overdue ? 'Overdue' : 'Due today',
        },
      },
    ];
  });
}

function weatherEntries(devices: readonly DeviceWithType[], now: Date): HomePriorityEntry[] {
  return devices.flatMap((device) => {
    if (device.type !== 'weather' || !ADVERSE_WEATHER.has(device.condition.toLowerCase()))
      return [];
    return [
      {
        candidate: {
          id: `weather:${stableIdPart(device.canonicalId ?? device.id)}:${device.condition.toLowerCase()}`,
          source: 'weather',
          reasonCode: 'weather_adverse_soon',
          priority: 'attention',
          urgencyGroup: 'due_soon',
          createdAt: now.toISOString(),
          startsAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1_000).toISOString(),
          sourceReference: { section: 'home', providerId: device.providerId },
          sharedDisplayPolicy: 'safe',
          facts: { condition: device.condition.toLowerCase(), withinHours: 6 },
        },
        presentation: {
          titleKey: 'priorities.weatherTitle',
          detail: `${device.condition} · expected within 6 hours`,
        },
      },
    ];
  });
}

function calendarEntries(
  devices: readonly DeviceWithType[],
  now: Date,
  showTitles: boolean
): HomePriorityEntry[] {
  const today = now.toDateString();
  return devices
    .flatMap((device) => (device.type === 'calendars' ? device.events : []))
    .flatMap((event) => {
      const startsAt = Date.parse(event.startTime);
      if (!Number.isFinite(startsAt)) return [];
      const allDay = event.timeDisplay.trim().toLowerCase().includes('all day');
      const withinTwoHours =
        startsAt >= now.getTime() && startsAt <= now.getTime() + 2 * 60 * 60 * 1_000;
      const allDayToday = allDay && new Date(startsAt).toDateString() === today;
      if (!withinTwoHours && !allDayToday) return [];
      return [
        {
          candidate: {
            id: `calendar:${stableIdPart(event.sourceId ?? '')}:${stableIdPart(event.id)}`,
            source: 'calendar',
            reasonCode: allDayToday ? 'calendar_all_day_today' : 'calendar_due_soon',
            priority: 'attention',
            urgencyGroup: withinTwoHours ? 'due_soon' : 'due_today',
            createdAt: now.toISOString(),
            startsAt: event.startTime,
            expiresAt: event.endTime,
            sourceReference: { section: 'home' },
            sharedDisplayPolicy: 'summary_only',
            facts: { allDay: allDayToday },
          },
          presentation: {
            title: showTitles ? event.title : 'Calendar event',
            detail: allDayToday ? 'All-day event today' : 'Starts within 2 hours',
          },
        },
      ];
    });
}

function batteryEntries(devices: readonly DeviceWithType[], now: Date): HomePriorityEntry[] {
  return devices.flatMap((device) => {
    const battery =
      device.type === 'vacuums'
        ? device.battery
        : device.type === 'sensors' && device.deviceClass === 'battery'
          ? Number.parseFloat(device.value)
          : undefined;
    if (!Number.isFinite(battery) || (battery as number) > 20) return [];
    return [
      {
        candidate: {
          id: `maintenance:battery:${stableIdPart(device.canonicalId ?? device.id)}`,
          source: 'maintenance',
          reasonCode: 'battery_critical',
          priority: 'attention',
          urgencyGroup: 'advisory',
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + DAY_MS).toISOString(),
          sourceReference: { section: 'settings', providerId: device.providerId },
          sharedDisplayPolicy: 'safe',
          facts: { percent: Math.max(0, Math.round(battery as number)) },
        },
        presentation: {
          title: `${device.name} battery is low`,
          detail: `${Math.max(0, Math.round(battery as number))}% remaining`,
        },
      },
    ];
  });
}

function repairEntries(issues: readonly PlatformRepairIssue[], now: Date): HomePriorityEntry[] {
  return issues.flatMap((issue, index) => {
    if (issue.severity !== 'warning' && issue.severity !== 'error') return [];
    const error = issue.severity === 'error';
    const id = issue.issue_id ?? `${issue.domain ?? issue.issue_domain ?? 'repair'}:${index}`;
    return [
      {
        candidate: {
          id: `maintenance:repair:${stableIdPart(id)}`,
          source: 'maintenance',
          reasonCode: error ? 'repair_error' : 'repair_warning',
          priority: 'attention',
          urgencyGroup: error ? 'due_soon' : 'advisory',
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + DAY_MS).toISOString(),
          sourceReference: { section: 'settings' },
          sharedDisplayPolicy: 'summary_only',
          facts: { severity: issue.severity },
        },
        presentation: {
          titleKey: 'priorities.maintenanceTitle',
          detail: error ? 'A repair needs attention' : 'A repair warning is available',
        },
      },
    ];
  });
}

export function buildHomePriorityEntries(input: {
  devices: readonly DeviceWithType[];
  choreWorkspace?: ChoreWorkspaceData | null;
  choresEnabled: boolean;
  repairIssues?: readonly PlatformRepairIssue[];
  showCalendarTitles?: boolean;
  energyHigherThanUsual?: { observedAt: string; sampleCount?: number } | null;
  learningEnabled?: boolean;
  now?: Date;
}): HomePriorityEntry[] {
  const now = input.now ?? new Date();
  const entries = [
    ...securityEntries(input.devices, now),
    ...(input.choresEnabled ? choreEntries(input.choreWorkspace, now) : []),
    ...weatherEntries(input.devices, now),
    ...calendarEntries(input.devices, now, input.showCalendarTitles === true),
    ...batteryEntries(input.devices, now),
    ...repairEntries(input.repairIssues ?? [], now),
  ];
  if (input.learningEnabled && input.energyHigherThanUsual) {
    const evidence = input.energyHigherThanUsual;
    entries.push({
      candidate: {
        id: `energy:higher-than-usual:${evidence.observedAt.slice(0, 13)}`,
        source: 'energy',
        reasonCode: 'energy_higher_than_usual',
        priority: 'attention',
        urgencyGroup: 'advisory',
        createdAt: evidence.observedAt,
        expiresAt: new Date(Date.parse(evidence.observedAt) + DAY_MS).toISOString(),
        sourceReference: { section: 'energy' },
        sharedDisplayPolicy: 'safe',
        facts: { sampleCount: Math.max(1, Math.round(evidence.sampleCount ?? 1)) },
      },
      presentation: {
        titleKey: 'priorities.energyTitle',
        detail: 'Recent use crossed the local high-usage pattern',
      },
    });
  }
  const ordered = prepareIntelligencePriorityCandidates(
    entries.map((entry) => entry.candidate),
    now
  );
  const entryById = new Map(entries.map((entry) => [entry.candidate.id, entry]));
  return ordered.flatMap((candidate) => {
    const entry = entryById.get(candidate.id);
    return entry ? [{ ...entry, candidate }] : [];
  });
}
