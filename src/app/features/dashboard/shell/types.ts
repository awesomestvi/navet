import type { ReactNode } from 'react';
import type { MobileRoomNavigation } from '@/app/components/layout/mobile-room-dropdown';

export interface DashboardLayoutProps {
  children: ReactNode;
  mobileRoomNavigation?: MobileRoomNavigation;
}
