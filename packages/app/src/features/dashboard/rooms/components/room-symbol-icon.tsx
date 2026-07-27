import { resolveLightIconComponent } from '@navet/app/constants/icon-map';
import {
  Armchair,
  Baby,
  Bath,
  BedDouble,
  Briefcase,
  Car,
  CookingPot,
  Dumbbell,
  House,
  Layers3,
  type LucideIcon,
  Palette,
  TreePine,
  Tv,
  Utensils,
  Warehouse,
  WashingMachine,
} from 'lucide-react';

export interface RoomSymbolIconChoice {
  value: string;
  icon: LucideIcon;
}

export const ROOM_SYMBOL_ICON_CHOICES: readonly RoomSymbolIconChoice[] = [
  { value: 'House', icon: House },
  { value: 'Armchair', icon: Armchair },
  { value: 'BedDouble', icon: BedDouble },
  { value: 'CookingPot', icon: CookingPot },
  { value: 'Bath', icon: Bath },
  { value: 'Utensils', icon: Utensils },
  { value: 'Tv', icon: Tv },
  { value: 'Briefcase', icon: Briefcase },
  { value: 'Palette', icon: Palette },
  { value: 'Baby', icon: Baby },
  { value: 'Dumbbell', icon: Dumbbell },
  { value: 'WashingMachine', icon: WashingMachine },
  { value: 'Car', icon: Car },
  { value: 'TreePine', icon: TreePine },
  { value: 'Warehouse', icon: Warehouse },
  { value: 'Layers3', icon: Layers3 },
] as const;

export function getRoomSymbolIcon(value: string | null | undefined): LucideIcon | undefined {
  return value ? (resolveLightIconComponent(value) ?? undefined) : undefined;
}

export function RoomSymbolIcon({ value, className }: { value: string; className?: string }) {
  const Icon = getRoomSymbolIcon(value);
  return Icon ? <Icon className={className} aria-hidden="true" /> : value;
}
