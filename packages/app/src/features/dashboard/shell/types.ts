import type { MobileHeaderEditActions } from '@navet/app/components/layout/mobile-header-actions';
import type { MobileRoomNavigation } from '@navet/app/components/layout/mobile-room-dropdown';
import type { ReactNode } from 'react';

export interface DashboardLayoutProps {
  children: ReactNode;
  densePerformanceMode?: boolean;
  mobileEditActions?: MobileHeaderEditActions;
  mobileRoomNavigation?: MobileRoomNavigation;
}
