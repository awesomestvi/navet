import { resolveLightIconComponent } from '@navet/app/constants/icon-map';
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
import {
  CUSTOM_EXTENSION_ICON_IDS,
  type CustomExtensionIconId,
  type CustomSidebarActionIcon,
} from './custom-extensions';

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

function isCustomExtensionIconId(value: string): value is CustomExtensionIconId {
  return CUSTOM_EXTENSION_ICON_IDS.includes(value as CustomExtensionIconId);
}

export function getCustomExtensionIcon(
  icon: CustomSidebarActionIcon | CustomExtensionIconId
): LucideIcon {
  if (isCustomExtensionIconId(icon)) {
    return customExtensionIcons[icon];
  }

  return resolveLightIconComponent(icon) ?? Link2;
}
