import { getThemeDropdownSurfaceClasses } from '@navet/app/components/shared/theme/dropdown-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { cn } from '@navet/app/components/ui/utils';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { getDashboardClientIdentity } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import { useI18n, useTheme } from '@navet/app/hooks';
import { dashboardToPath } from '@navet/app/navigation/sections';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { Check, ChevronDown, LayoutDashboard, Plus, Settings2 } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useDashboardCollectionStore } from './dashboard-collection-store';
import { DashboardCreateDialog } from './dashboard-create-dialog';

export function openDashboardPreview(dashboardId: string) {
  const store = useDashboardCollectionStore.getState();
  if (!store.collection.dashboardsById[dashboardId]) {
    return;
  }
  store.activateDashboard(dashboardId, 'preview', { rememberPreview: true });
  useNavigationStore.getState().applyNavigationState({
    activeSection: 'home',
    currentRoom: ALL_ROOMS_ID,
  });
  history.pushState({}, '', dashboardToPath(dashboardId));
  window.scrollTo(0, 0);
}

export function useDashboardSwitcher() {
  const collection = useDashboardCollectionStore((state) => state.collection);
  const activeDashboardId = useDashboardCollectionStore((state) => state.activeDashboardId);
  const assignDashboard = useDashboardCollectionStore((state) => state.assignDashboard);
  const client = useMemo(() => getDashboardClientIdentity(), []);
  const dashboards = collection.order.flatMap((id) => {
    const dashboard = collection.dashboardsById[id];
    return dashboard ? [dashboard] : [];
  });
  const activeDashboard = collection.dashboardsById[activeDashboardId] ?? dashboards[0] ?? null;
  const assignedDashboardId =
    collection.dashboardIdByClientId[client.id] ?? collection.defaultDashboardId;

  return {
    activeDashboard,
    activeDashboardId,
    assignedDashboardId,
    client,
    collection,
    dashboards,
    assignThisDevice: (dashboardId: string) => {
      assignDashboard(client.id, dashboardId);
      useNavigationStore.getState().applyNavigationState({
        activeSection: 'home',
        currentRoom: ALL_ROOMS_ID,
      });
    },
    openDashboard: openDashboardPreview,
  };
}

export function DashboardSwitcherMenuContent({
  onClose,
  onCreate,
  showManage = true,
}: {
  onClose?: () => void;
  onCreate?: () => void;
  showManage?: boolean;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { activeDashboardId, assignedDashboardId, assignThisDevice, dashboards, openDashboard } =
    useDashboardSwitcher();

  const closeAfter = (action: () => void) => {
    action();
    onClose?.();
  };
  const openManager = () => {
    try {
      window.localStorage.setItem('navet-settings-active-tab', JSON.stringify('dashboard'));
    } catch {
      // The Settings page still opens even when local persistence is unavailable.
    }
    useNavigationStore.getState().setActiveSection('settings');
  };

  return (
    <>
      <DropdownMenuLabel className={`px-3 py-2 text-xs font-semibold ${surface.textSecondary}`}>
        {t('dashboard.multiple.title')}
      </DropdownMenuLabel>
      {dashboards.map((dashboard) => (
        <DropdownMenuItem
          key={dashboard.id}
          className={`min-h-11 rounded-xl px-3 ${surface.textPrimary} ${surface.hoverBg}`}
          onSelect={() => closeAfter(() => openDashboard(dashboard.id))}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{dashboard.name}</span>
          {assignedDashboardId === dashboard.id ? (
            <span className={`text-[11px] ${surface.textMuted}`}>
              {t('dashboard.multiple.assignedThisDevice')}
            </span>
          ) : null}
          {activeDashboardId === dashboard.id ? <Check className="h-4 w-4 shrink-0" /> : null}
        </DropdownMenuItem>
      ))}
      {assignedDashboardId !== activeDashboardId ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={`min-h-11 rounded-xl px-3 ${surface.textPrimary} ${surface.hoverBg}`}
            onSelect={() => closeAfter(() => assignThisDevice(activeDashboardId))}
          >
            <Check className="h-4 w-4" />
            {t('dashboard.multiple.useThisDevice')}
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={`min-h-11 rounded-xl px-3 ${surface.textPrimary} ${surface.hoverBg}`}
        onSelect={() => {
          onCreate?.();
          onClose?.();
        }}
      >
        <Plus className="h-4 w-4" />
        {t('dashboard.multiple.new')}
      </DropdownMenuItem>
      {showManage ? (
        <DropdownMenuItem
          className={`min-h-11 rounded-xl px-3 ${surface.textPrimary} ${surface.hoverBg}`}
          onSelect={() => closeAfter(openManager)}
        >
          <Settings2 className="h-4 w-4" />
          {t('dashboard.multiple.manage')}
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

export function DashboardSwitcherDropdown({
  children,
  align = 'start',
  side = 'bottom',
  showManage = true,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  showManage?: boolean;
}) {
  const { theme } = useTheme();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          side={side}
          sideOffset={8}
          className={cn(getThemeDropdownSurfaceClasses(theme), 'w-72 overflow-visible p-1')}
        >
          <DashboardSwitcherMenuContent
            showManage={showManage}
            onCreate={() => setCreateOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <DashboardCreateDialog isOpen={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export function DashboardSwitcherPill({
  active,
  activeClassName,
  inactiveClassName,
  onShowHome,
}: {
  active: boolean;
  activeClassName: string;
  inactiveClassName: string;
  onShowHome: () => void;
}) {
  const { t } = useI18n();
  const { activeDashboard } = useDashboardSwitcher();
  const itemClassName = active ? activeClassName : inactiveClassName;

  return (
    <div
      className={`room-nav-item flex h-9 shrink-0 items-stretch overflow-hidden rounded-[22px] transition-colors ${itemClassName}`}
    >
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={onShowHome}
        className="min-w-0 px-3 text-sm font-medium"
      >
        <span className="block max-w-40 truncate">{activeDashboard?.name ?? 'Home'}</span>
      </button>
      <DashboardSwitcherDropdown>
        <button
          type="button"
          aria-label={t('dashboard.multiple.open')}
          className="flex w-9 items-center justify-center border-l border-current/10"
        >
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DashboardSwitcherDropdown>
    </div>
  );
}
