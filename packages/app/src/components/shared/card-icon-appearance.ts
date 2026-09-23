import { isEmojiLightIcon, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import type { LucideIcon } from 'lucide-react';

export function resolveCardIconAppearance(selectedIcon: string, fallbackIcon: LucideIcon | null) {
  const selectedComponent = resolveLightIconComponent(selectedIcon);
  if (selectedComponent) {
    return { iconComponent: selectedComponent, iconText: null };
  }

  const iconText = isEmojiLightIcon(selectedIcon) ? selectedIcon.trim() : null;
  return {
    iconComponent: iconText ? null : fallbackIcon,
    iconText,
  };
}
