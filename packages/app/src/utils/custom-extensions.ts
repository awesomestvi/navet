import { normalizeLightIconName, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import type { Section } from '@navet/app/navigation/sections';
import { sanitizeExternalUrl } from '@navet/app/utils/url-security';
import {
  Bell,
  Clipboard,
  Fan,
  Home,
  Lightbulb,
  Link2,
  type LucideIcon,
  Settings,
  Shield,
  Sparkles,
  Speaker,
  Zap,
} from 'lucide-react';

export const ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT = 5;
export const ADVANCED_CUSTOM_SUMMARY_PILL_LIMIT = 3;
export const CUSTOM_EXTENSION_LABEL_MAX_LENGTH = 28;
export const CUSTOM_EXTENSION_VALUE_MAX_LENGTH = 40;
export const CUSTOM_EXTENSION_ENTITY_ID_MAX_LENGTH = 120;

export const CUSTOM_EXTENSION_ICON_IDS = [
  'home',
  'energy',
  'climate',
  'security',
  'lights',
  'media',
  'tasks',
  'settings',
  'link',
  'sparkles',
  'bell',
] as const;

export type CustomExtensionIconId = (typeof CUSTOM_EXTENSION_ICON_IDS)[number];
export type CustomSidebarActionIcon = string;
export type CustomSidebarActionVisibility = 'always' | 'desktop_only' | 'mobile_only';
export type CustomSummaryPillVisibility = 'always' | 'when_value_available';
export type CustomTargetType = 'none' | 'section' | 'url' | 'iframe';
export type CustomSummaryValueSourceType = 'static' | 'entity';

export interface CustomSidebarAction {
  id: string;
  label: string;
  icon: CustomSidebarActionIcon;
  targetType: Exclude<CustomTargetType, 'none'>;
  targetSection?: Section;
  targetUrl?: string;
  visibility?: CustomSidebarActionVisibility;
}

export interface CustomSummaryPill {
  id: string;
  label: string;
  icon: CustomExtensionIconId;
  valueSourceType: CustomSummaryValueSourceType;
  staticValue?: string;
  entityId?: string;
  actionType?: CustomTargetType;
  actionSection?: Section;
  actionUrl?: string;
  visibility?: CustomSummaryPillVisibility;
}

const sectionIds: Section[] = [
  'home',
  'energy',
  'climate',
  'security',
  'lights',
  'media',
  'tasks',
  'settings',
];

const customExtensionIcons: Record<CustomExtensionIconId, LucideIcon> = {
  home: Home,
  energy: Zap,
  climate: Fan,
  security: Shield,
  lights: Lightbulb,
  media: Speaker,
  tasks: Clipboard,
  settings: Settings,
  link: Link2,
  sparkles: Sparkles,
  bell: Bell,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSection(value: unknown): value is Section {
  return typeof value === 'string' && sectionIds.includes(value as Section);
}

function isCustomExtensionIconId(value: unknown): value is CustomExtensionIconId {
  return (
    typeof value === 'string' && CUSTOM_EXTENSION_ICON_IDS.includes(value as CustomExtensionIconId)
  );
}

function normalizeSidebarActionIcon(value: unknown): CustomSidebarActionIcon {
  if (typeof value !== 'string') {
    return 'Link2';
  }

  const normalizedIcon = normalizeLightIconName(value);
  return normalizedIcon || 'Link2';
}

function isSidebarVisibility(value: unknown): value is CustomSidebarActionVisibility {
  return value === 'always' || value === 'desktop_only' || value === 'mobile_only';
}

function isSummaryVisibility(value: unknown): value is CustomSummaryPillVisibility {
  return value === 'always' || value === 'when_value_available';
}

function sanitizeId(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim().slice(0, 80);
  return trimmed || fallback;
}

export function normalizeCustomExtensionLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, CUSTOM_EXTENSION_LABEL_MAX_LENGTH);
}

function normalizeCustomExtensionValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, CUSTOM_EXTENSION_VALUE_MAX_LENGTH);
}

function normalizeEntityId(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, CUSTOM_EXTENSION_ENTITY_ID_MAX_LENGTH);
}

function resolveBaseUrl(): string | undefined {
  return typeof window !== 'undefined' ? window.location.href : undefined;
}

function normalizeSidebarTarget(
  item: Record<string, unknown>
): Pick<CustomSidebarAction, 'targetType' | 'targetSection' | 'targetUrl'> | null {
  if (item.targetType === 'section' && isSection(item.targetSection)) {
    return {
      targetType: 'section',
      targetSection: item.targetSection,
    };
  }

  if (item.targetType === 'url' || item.targetType === 'iframe') {
    const safeUrl = sanitizeExternalUrl(
      typeof item.targetUrl === 'string' ? item.targetUrl : null,
      resolveBaseUrl()
    );

    if (!safeUrl) {
      return null;
    }

    return {
      targetType: item.targetType,
      targetUrl: safeUrl,
    };
  }

  return null;
}

function normalizeSummaryAction(
  item: Record<string, unknown>
): Pick<CustomSummaryPill, 'actionType' | 'actionSection' | 'actionUrl'> {
  if (item.actionType === 'section' && isSection(item.actionSection)) {
    return {
      actionType: 'section',
      actionSection: item.actionSection,
    };
  }

  if (item.actionType === 'url') {
    const safeUrl = sanitizeExternalUrl(
      typeof item.actionUrl === 'string' ? item.actionUrl : null,
      resolveBaseUrl()
    );

    if (safeUrl) {
      return {
        actionType: 'url',
        actionUrl: safeUrl,
      };
    }
  }

  return {
    actionType: 'none',
  };
}

export function normalizeCustomSidebarActions(value: unknown): CustomSidebarAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT).flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    const label = normalizeCustomExtensionLabel(entry.label);
    if (!label) {
      return [];
    }

    const icon = normalizeSidebarActionIcon(entry.icon);
    if (!icon) {
      return [];
    }

    const target = normalizeSidebarTarget(entry);
    if (!target) {
      return [];
    }

    return [
      {
        id: sanitizeId(entry.id, `custom-sidebar-${index}`),
        label,
        icon,
        visibility: isSidebarVisibility(entry.visibility) ? entry.visibility : 'always',
        ...target,
      },
    ];
  });
}

export function normalizeCustomSummaryPills(value: unknown): CustomSummaryPill[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, ADVANCED_CUSTOM_SUMMARY_PILL_LIMIT).flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    const label = normalizeCustomExtensionLabel(entry.label);
    if (!label || !isCustomExtensionIconId(entry.icon)) {
      return [];
    }

    const valueSourceType =
      entry.valueSourceType === 'entity' || entry.valueSourceType === 'static'
        ? entry.valueSourceType
        : null;

    if (!valueSourceType) {
      return [];
    }

    const staticValue =
      valueSourceType === 'static' ? normalizeCustomExtensionValue(entry.staticValue) : '';
    const entityId = valueSourceType === 'entity' ? normalizeEntityId(entry.entityId) : '';

    if (
      (valueSourceType === 'static' && !staticValue) ||
      (valueSourceType === 'entity' && !entityId)
    ) {
      return [];
    }

    return [
      {
        id: sanitizeId(entry.id, `custom-summary-${index}`),
        label,
        icon: entry.icon,
        valueSourceType,
        staticValue: staticValue || undefined,
        entityId: entityId || undefined,
        visibility: isSummaryVisibility(entry.visibility)
          ? entry.visibility
          : valueSourceType === 'entity'
            ? 'when_value_available'
            : 'always',
        ...normalizeSummaryAction(entry),
      },
    ];
  });
}

export function getCustomExtensionIcon(
  icon: CustomSidebarActionIcon | CustomExtensionIconId
): LucideIcon {
  if (isCustomExtensionIconId(icon)) {
    return customExtensionIcons[icon];
  }

  return resolveLightIconComponent(icon) ?? Link2;
}

export function createCustomExtensionId(prefix: 'sidebar' | 'summary'): string {
  return `custom-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isSidebarActionVisible(
  action: Pick<CustomSidebarAction, 'visibility'>,
  isMobile: boolean
): boolean {
  if (action.visibility === 'desktop_only') {
    return !isMobile;
  }

  if (action.visibility === 'mobile_only') {
    return isMobile;
  }

  return true;
}

export function openCustomExtensionUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
