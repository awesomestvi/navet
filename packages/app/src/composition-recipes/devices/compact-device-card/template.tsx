import { SwitchCard } from '@navet/app/features/lighting/components/switch-card';
import type { ComponentProps } from 'react';

// A Navet switch-family adapter. Its controller retains routing, capabilities and persistence.
export type CompactDeviceCardProps = ComponentProps<typeof SwitchCard>;
export function CompactDeviceCard(props: CompactDeviceCardProps) {
  return <SwitchCard {...props} />;
}
