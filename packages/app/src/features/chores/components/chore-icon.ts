import { resolveLightIconComponent } from '@navet/app/constants/icon-map';
import { ListChecks, type LucideIcon } from 'lucide-react';

export const DEFAULT_CHORE_ICON_NAME = 'ListChecks';

export function resolveChoreIconComponent(iconName?: string): LucideIcon {
  return resolveLightIconComponent(iconName ?? DEFAULT_CHORE_ICON_NAME) ?? ListChecks;
}
