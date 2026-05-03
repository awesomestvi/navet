import type { ReactNode } from 'react';
import type { MobileHeaderEditActions } from '@/app/components/layout/mobile-header-actions';
import type { MobileRoomNavigation } from '@/app/components/layout/mobile-room-dropdown';

export interface DashboardLayoutProps {
  children: ReactNode;
  mobileEditActions?: MobileHeaderEditActions;
  mobileRoomNavigation?: MobileRoomNavigation;
}
