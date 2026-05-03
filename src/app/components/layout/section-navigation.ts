import {
  Clipboard,
  Home,
  Lightbulb,
  Lock,
  type LucideIcon,
  Settings,
  Tv,
  Video,
  Zap,
} from 'lucide-react';
import type { TranslateFn, TranslationKey } from '@/app/i18n';
import type { Section } from '@/app/navigation/sections';

export interface SectionNavigationItem {
  icon: LucideIcon;
  label: string;
  section: Section;
}

const SECTION_NAVIGATION_CONFIG: Array<{
  icon: LucideIcon;
  labelKey: TranslationKey;
  section: Section;
}> = [
  { icon: Home, labelKey: 'sidebar.home', section: 'home' },
  { icon: Zap, labelKey: 'sidebar.energy', section: 'energy' },
  { icon: Video, labelKey: 'sidebar.security', section: 'security' },
  { icon: Clipboard, labelKey: 'sidebar.tasks', section: 'tasks' },
  { icon: Lock, labelKey: 'sidebar.locks', section: 'locks' },
  { icon: Lightbulb, labelKey: 'sidebar.lights', section: 'lights' },
  { icon: Tv, labelKey: 'sidebar.media', section: 'media' },
  { icon: Settings, labelKey: 'sidebar.settings', section: 'settings' },
];

export const MOBILE_SECTION_DOCK_ORDER: Section[] = ['home', 'settings'];

export const MOBILE_SECTION_ORBIT_ORDER: Section[] = [
  'home',
  'lights',
  'media',
  'tasks',
  'security',
  'locks',
  'energy',
  'settings',
];

export function getSectionNavigationItems(t: TranslateFn): SectionNavigationItem[] {
  return SECTION_NAVIGATION_CONFIG.map(({ icon, labelKey, section }) => ({
    icon,
    label: t(labelKey),
    section,
  }));
}

export function getSectionNavigationItemMap(t: TranslateFn) {
  return new Map<Section, SectionNavigationItem>(
    getSectionNavigationItems(t).map(
      (item) => [item.section, item] satisfies [Section, SectionNavigationItem]
    )
  );
}

export function getOrderedSectionNavigationItems(
  t: TranslateFn,
  order: Section[]
): SectionNavigationItem[] {
  const itemMap = getSectionNavigationItemMap(t);
  return order
    .map((section) => itemMap.get(section))
    .filter((item): item is SectionNavigationItem => item !== undefined);
}

export function getRecentSectionNavigationItems(
  t: TranslateFn,
  recentSections: Section[],
  lastNonHomeSection: Section | null
): SectionNavigationItem[] {
  const itemMap = getSectionNavigationItemMap(t);

  if (recentSections.length > 0) {
    return recentSections
      .map((section) => itemMap.get(section))
      .filter((item): item is SectionNavigationItem => item !== undefined);
  }

  if (!lastNonHomeSection) {
    return [];
  }

  const lastSection = itemMap.get(lastNonHomeSection);
  return lastSection ? [lastSection] : [];
}
