import { Button, IconButton } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import type { EnergyOverviewTemplate } from '@navet/app/features/energy/components/dashboard/energy-overview-layout';
import { useI18n, useTheme } from '@navet/app/hooks';
import {
  Columns2,
  LayoutDashboard,
  LayoutPanelTop,
  LayoutTemplate,
  MoreHorizontal,
  Plus,
  Redo2,
  Rows3,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode, useEffect, useState } from 'react';
import { DashboardSwitcherDropdown, useDashboardSwitcher } from '../dashboards/dashboard-switcher';
import type { HomeLayoutMode } from '../hooks/use-home-dashboard-layout';
import { DASHBOARD_PACKS, type DashboardPackId } from '../packs/dashboard-packs';

interface HomeEditCommandBarProps {
  addActionLabel?: string;
  canRedo?: boolean;
  canUndo?: boolean;
  homeLayoutMode?: HomeLayoutMode;
  onAddCard?: () => void;
  onAddColumn?: () => void;
  onAddRow?: () => void;
  onApplyPack?: (packId: DashboardPackId) => void;
  onApplyEnergyLayout?: (template: EnergyOverviewTemplate) => void;
  onConfigureKpis?: () => void;
  onManageRooms?: () => void;
  onRedo?: () => void;
  onSetLayoutMode?: (mode: HomeLayoutMode) => void;
  onToggleEditMode?: () => void;
  onUndo?: () => void;
}

const CommandBarMenuButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string }
>(function CommandBarMenuButton({ icon, label, ...props }, ref) {
  return (
    <Button
      {...props}
      ref={ref}
      type="button"
      variant="secondary"
      size="small"
      leading={icon}
      className="h-9 rounded-full px-3 text-xs md:text-sm"
    >
      {label}
    </Button>
  );
});

function useIsMobileCommandBar() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncMobileState = () => setIsMobile(mediaQuery.matches);
    syncMobileState();
    mediaQuery.addEventListener('change', syncMobileState);

    return () => {
      mediaQuery.removeEventListener('change', syncMobileState);
    };
  }, []);

  return isMobile;
}

export function HomeEditCommandBar({
  addActionLabel,
  canRedo = false,
  canUndo = false,
  homeLayoutMode,
  onAddCard,
  onAddColumn,
  onAddRow,
  onApplyPack,
  onApplyEnergyLayout,
  onConfigureKpis,
  onManageRooms,
  onRedo,
  onSetLayoutMode,
  onToggleEditMode,
  onUndo,
}: HomeEditCommandBarProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isMobileCommandBar = useIsMobileCommandBar();
  const isSectioned = homeLayoutMode === 'sectioned';
  const showHomeLayoutControls = homeLayoutMode !== undefined && onSetLayoutMode !== undefined;
  const commandBarSurface =
    theme === 'light'
      ? 'bg-white'
      : theme === 'black'
        ? 'bg-black'
        : theme === 'glass'
          ? 'bg-slate-950'
          : 'bg-[#18181b]';
  const dividerClass = theme === 'light' ? 'bg-black/10' : 'bg-white/10';
  const [pendingPackId, setPendingPackId] = useState<DashboardPackId | null>(null);
  const { activeDashboard } = useDashboardSwitcher();
  const pendingPack = DASHBOARD_PACKS.find((pack) => pack.id === pendingPackId);
  const hasMobileOverflowActions =
    Boolean(onConfigureKpis) ||
    Boolean(onApplyEnergyLayout) ||
    Boolean(onManageRooms) ||
    Boolean(onApplyPack) ||
    showHomeLayoutControls ||
    Boolean(isSectioned && (onAddRow || onAddColumn));

  const handleConfirmApplyPack = () => {
    if (!pendingPackId) {
      return;
    }

    onApplyPack?.(pendingPackId);
    setPendingPackId(null);
  };

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 border-b px-3 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] shadow-2xl md:px-4 ${surface.border} ${commandBarSurface}`}
        style={{
          boxShadow: `0 18px 60px -44px ${accentColor}`,
        }}
      >
        {isMobileCommandBar ? (
          <div className="pointer-events-auto mx-auto flex w-full max-w-[calc(100vw-1.5rem)] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {hasMobileOverflowActions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      label={t('common.moreActions')}
                      icon={<MoreHorizontal className="h-4 w-4" />}
                      size="small"
                      variant="ghost"
                      className="h-10 w-10 rounded-full"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={10} className="w-64">
                    {onConfigureKpis ? (
                      <DropdownMenuItem onClick={onConfigureKpis}>
                        <SlidersHorizontal className="h-4 w-4" />
                        KPIs
                      </DropdownMenuItem>
                    ) : null}

                    {onApplyEnergyLayout ? (
                      <>
                        {onConfigureKpis ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuLabel>Energy layout</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onApplyEnergyLayout('essentials')}>
                          <LayoutTemplate className="h-4 w-4" />
                          Essentials
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onApplyEnergyLayout('balanced')}>
                          <LayoutDashboard className="h-4 w-4" />
                          Balanced
                        </DropdownMenuItem>
                      </>
                    ) : null}

                    {onManageRooms ? (
                      <DropdownMenuItem onClick={onManageRooms}>
                        <SlidersHorizontal className="h-4 w-4" />
                        {t('dashboard.roomNav.reorder')}
                      </DropdownMenuItem>
                    ) : null}

                    {onApplyPack ? (
                      <>
                        {onManageRooms ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuLabel>{t('dashboard.packs.title')}</DropdownMenuLabel>
                        {DASHBOARD_PACKS.map((pack) => (
                          <DropdownMenuItem key={pack.id} onClick={() => setPendingPackId(pack.id)}>
                            <LayoutTemplate className="h-4 w-4" />
                            {t(pack.labelKey)}
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : null}

                    {showHomeLayoutControls ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>
                          {t('dashboard.homePersonal.canvasTitle')}
                        </DropdownMenuLabel>
                        <DropdownMenuCheckboxItem
                          checked={isSectioned}
                          onCheckedChange={() => onSetLayoutMode?.('sectioned')}
                        >
                          <LayoutPanelTop className="h-4 w-4" />
                          {t('dashboard.homePersonal.mode.sectioned')}
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={!isSectioned}
                          onCheckedChange={() => onSetLayoutMode?.('flow')}
                        >
                          <LayoutTemplate className="h-4 w-4" />
                          {t('dashboard.homePersonal.mode.flow')}
                        </DropdownMenuCheckboxItem>
                      </>
                    ) : null}

                    {isSectioned && (onAddRow || onAddColumn) ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>
                          {t('dashboard.homePersonal.addSection')}
                        </DropdownMenuLabel>
                        {onAddRow ? (
                          <DropdownMenuItem onClick={onAddRow}>
                            <Rows3 className="h-4 w-4" />
                            {t('dashboard.homePersonal.addRow')}
                          </DropdownMenuItem>
                        ) : null}
                        {onAddColumn ? (
                          <DropdownMenuItem onClick={onAddColumn}>
                            <Columns2 className="h-4 w-4" />
                            {t('dashboard.homePersonal.addColumn')}
                          </DropdownMenuItem>
                        ) : null}
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {showHomeLayoutControls ? (
                <>
                  <DashboardSwitcherDropdown align="start">
                    <IconButton
                      label={activeDashboard?.name ?? t('dashboard.multiple.title')}
                      icon={<LayoutDashboard className="h-4 w-4" />}
                      size="small"
                      variant="ghost"
                      className="h-10 w-10 rounded-full"
                    />
                  </DashboardSwitcherDropdown>
                  <IconButton
                    label={t('common.undo')}
                    icon={<Undo2 className="h-4 w-4" />}
                    size="small"
                    variant="ghost"
                    disabled={!canUndo}
                    onClick={onUndo}
                    className="h-10 w-10 rounded-full"
                  />
                  <IconButton
                    label={t('common.redo')}
                    icon={<Redo2 className="h-4 w-4" />}
                    size="small"
                    variant="ghost"
                    disabled={!canRedo}
                    onClick={onRedo}
                    className="h-10 w-10 rounded-full"
                  />
                </>
              ) : null}
            </div>

            <div className="flex min-w-0 shrink-0 items-center gap-2">
              {onAddCard ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  leading={<Plus className="h-4 w-4" />}
                  onClick={onAddCard}
                  className="h-10 max-w-[9.5rem] rounded-full px-3 text-xs"
                >
                  <span className="truncate">
                    {addActionLabel ?? t('dashboard.roomNav.addCard')}
                  </span>
                </Button>
              ) : null}

              {onToggleEditMode ? (
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  onClick={onToggleEditMode}
                  className="h-10 rounded-full px-4 text-xs"
                >
                  {t('common.done')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto mx-auto flex w-full max-w-[calc(100vw-1.5rem)] items-center justify-center gap-2 overflow-x-auto md:max-w-[calc(100vw-7rem)]">
            {showHomeLayoutControls ? (
              <DashboardSwitcherDropdown align="start">
                <CommandBarMenuButton
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  label={activeDashboard?.name ?? t('dashboard.multiple.title')}
                />
              </DashboardSwitcherDropdown>
            ) : null}

            {onManageRooms ? (
              <Button
                type="button"
                variant="secondary"
                size="small"
                leading={<SlidersHorizontal className="h-4 w-4" />}
                onClick={onManageRooms}
                className="h-9 rounded-full px-3 text-xs md:text-sm"
              >
                {t('dashboard.roomNav.reorder')}
              </Button>
            ) : null}

            {onApplyPack ? (
              <>
                <div className={`hidden h-6 w-px md:block ${dividerClass}`} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <CommandBarMenuButton
                      icon={<LayoutTemplate className="h-4 w-4" />}
                      label={t('dashboard.packs.title')}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" sideOffset={8}>
                    <DropdownMenuLabel>{t('dashboard.packs.title')}</DropdownMenuLabel>
                    {DASHBOARD_PACKS.map((pack) => (
                      <DropdownMenuItem key={pack.id} onClick={() => setPendingPackId(pack.id)}>
                        <LayoutTemplate className="h-4 w-4" />
                        {t(pack.labelKey)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className={`hidden h-6 w-px md:block ${dividerClass}`} />
              </>
            ) : null}

            {showHomeLayoutControls ? (
              <div
                className="hidden items-center rounded-full border p-1 md:flex"
                style={{ borderColor: `${accentColor}30` }}
              >
                <button
                  type="button"
                  aria-pressed={isSectioned}
                  onClick={() => onSetLayoutMode('sectioned')}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                    isSectioned ? surface.textPrimary : surface.textMuted
                  }`}
                  style={isSectioned ? { backgroundColor: `${accentColor}18` } : undefined}
                >
                  <LayoutPanelTop className="h-3.5 w-3.5" />
                  {t('dashboard.homePersonal.mode.sectioned')}
                </button>
                <button
                  type="button"
                  aria-pressed={!isSectioned}
                  onClick={() => onSetLayoutMode('flow')}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                    !isSectioned ? surface.textPrimary : surface.textMuted
                  }`}
                  style={!isSectioned ? { backgroundColor: `${accentColor}18` } : undefined}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  {t('dashboard.homePersonal.mode.flow')}
                </button>
              </div>
            ) : null}

            {isSectioned ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  leading={<Rows3 className="h-4 w-4" />}
                  onClick={onAddRow}
                  disabled={!onAddRow}
                  className="h-9 rounded-full px-3 text-xs md:text-sm"
                >
                  {t('dashboard.homePersonal.addRow')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  leading={<Columns2 className="h-4 w-4" />}
                  onClick={onAddColumn}
                  disabled={!onAddColumn}
                  className="h-9 rounded-full px-3 text-xs md:text-sm"
                >
                  {t('dashboard.homePersonal.addColumn')}
                </Button>
              </>
            ) : null}

            {showHomeLayoutControls ? (
              <div className={`hidden h-6 w-px md:block ${dividerClass}`} />
            ) : null}

            {showHomeLayoutControls ? (
              <div className="flex items-center gap-1">
                <IconButton
                  label={t('common.undo')}
                  icon={<Undo2 className="h-4 w-4" />}
                  size="small"
                  variant="ghost"
                  disabled={!canUndo}
                  onClick={onUndo}
                  className="h-9 w-9 rounded-full"
                />
                <IconButton
                  label={t('common.redo')}
                  icon={<Redo2 className="h-4 w-4" />}
                  size="small"
                  variant="ghost"
                  disabled={!canRedo}
                  onClick={onRedo}
                  className="h-9 w-9 rounded-full"
                />
              </div>
            ) : null}

            {showHomeLayoutControls ? (
              <div className={`hidden h-6 w-px md:block ${dividerClass}`} />
            ) : null}

            {onConfigureKpis ? (
              <Button
                type="button"
                variant="secondary"
                size="small"
                leading={<SlidersHorizontal className="h-4 w-4" />}
                onClick={onConfigureKpis}
                className="h-9 rounded-full px-3 text-xs md:text-sm"
              >
                KPIs
              </Button>
            ) : null}

            {onApplyEnergyLayout ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <CommandBarMenuButton
                    icon={<LayoutTemplate className="h-4 w-4" />}
                    label="Layout"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" sideOffset={8}>
                  <DropdownMenuLabel>Energy layout</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onApplyEnergyLayout('essentials')}>
                    <LayoutTemplate className="h-4 w-4" />
                    Essentials
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onApplyEnergyLayout('balanced')}>
                    <LayoutDashboard className="h-4 w-4" />
                    Balanced
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {onAddCard ? (
              <Button
                type="button"
                variant="secondary"
                size="small"
                leading={<Plus className="h-4 w-4" />}
                onClick={onAddCard}
                className="h-9 rounded-full px-3 text-xs md:text-sm"
              >
                {addActionLabel ?? t('dashboard.roomNav.addCard')}
              </Button>
            ) : null}

            {onToggleEditMode ? (
              <Button
                type="button"
                variant="primary"
                size="small"
                onClick={onToggleEditMode}
                className="h-9 rounded-full px-3 text-xs md:text-sm"
              >
                {t('common.done')}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingPackId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPackId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.packs.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.packs.confirmDescription', {
                name: pendingPack ? t(pendingPack.labelKey) : t('dashboard.packs.title'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApplyPack}>
              {t('dashboard.packs.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
