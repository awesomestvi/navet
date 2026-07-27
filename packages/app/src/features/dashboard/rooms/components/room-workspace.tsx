import { Button } from '@navet/app/components/primitives';
import {
  getThemeSurfaceTokens,
  navetIconSizeTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useMediaQuery, useTheme } from '@navet/app/hooks';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RoomWorkspaceComponentProps, RoomWorkspaceLayout } from './room-workspace.types';
import {
  RoomOutline,
  RoomWorkspaceActivePanel,
  RoomWorkspaceHeader,
  RoomWorkspaceStatusPanel,
} from './room-workspace-panels';

export interface RoomsWorkspaceProps extends RoomWorkspaceComponentProps {
  layout?: RoomWorkspaceLayout;
  headerTrailing?: ReactNode;
}

function useWorkspacePresentation() {
  const { theme, accentColor } = useTheme();
  return {
    accentColor,
    surface: getThemeSurfaceTokens(theme),
  };
}

function WorkspaceStatus({
  viewModel,
  labels,
  actions,
  className,
  headerTrailing,
}: RoomsWorkspaceProps) {
  const { surface } = useWorkspacePresentation();

  if (viewModel.status.kind === 'ready') {
    return null;
  }

  return (
    <section
      aria-label={labels.title}
      className={cn(
        'flex h-[min(82dvh,54rem)] min-h-0 max-h-full w-full flex-col overflow-hidden rounded-[28px] border',
        surface.shellPanel,
        surface.border,
        surface.cardShadow,
        className
      )}
      data-room-workspace
      data-room-workspace-layout="status"
    >
      <header
        className={cn(
          'flex min-w-0 items-start justify-between gap-3 border-b px-4 py-4 md:px-5',
          surface.border
        )}
      >
        <div className="min-w-0">
          <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
            {labels.title}
          </h1>
          <p className={cn('mt-1 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}>
            {labels.description}
          </p>
        </div>
        {headerTrailing ? <div className="shrink-0">{headerTrailing}</div> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RoomWorkspaceStatusPanel status={viewModel.status} labels={labels} actions={actions} />
      </div>
    </section>
  );
}

export function RoomsWorkspaceDesktop(props: RoomsWorkspaceProps) {
  const { viewModel, labels, className, headerTrailing } = props;
  const { surface, accentColor } = useWorkspacePresentation();

  if (viewModel.status.kind !== 'ready') {
    return <WorkspaceStatus {...props} headerTrailing={headerTrailing} />;
  }

  const panelProps = { ...props, surface, accentColor, showInlineSaveBar: true };

  return (
    <section
      aria-label={labels.title}
      className={cn(
        'flex h-[min(78dvh,54rem)] min-h-0 max-h-full w-full flex-col overflow-hidden rounded-[28px] border',
        surface.shellPanel,
        surface.border,
        surface.cardShadow,
        className
      )}
      data-room-workspace
      data-room-workspace-layout="desktop"
    >
      <RoomWorkspaceHeader {...panelProps} trailingAction={headerTrailing} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(16rem,0.64fr)_minmax(0,1.36fr)]">
        <RoomOutline {...panelProps} />
        <main className={cn('min-h-0 border-l', surface.border)}>
          <RoomWorkspaceActivePanel {...panelProps} />
        </main>
      </div>
    </section>
  );
}

export function RoomsWorkspaceTablet(props: RoomsWorkspaceProps) {
  const { viewModel, labels, className, headerTrailing } = props;
  const { surface, accentColor } = useWorkspacePresentation();

  if (viewModel.status.kind !== 'ready') {
    return <WorkspaceStatus {...props} headerTrailing={headerTrailing} />;
  }

  const panelProps = { ...props, surface, accentColor, showInlineSaveBar: true };

  return (
    <section
      aria-label={labels.title}
      className={cn(
        'flex h-[min(82dvh,54rem)] min-h-0 max-h-full w-full flex-col overflow-hidden rounded-[28px] border',
        surface.shellPanel,
        surface.border,
        surface.cardShadow,
        className
      )}
      data-room-workspace
      data-room-workspace-layout="tablet"
    >
      <RoomWorkspaceHeader {...panelProps} trailingAction={headerTrailing} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(15rem,0.64fr)_minmax(0,1.36fr)]">
        <RoomOutline {...panelProps} />
        <main className={cn('min-h-0 border-l', surface.border)}>
          <RoomWorkspaceActivePanel {...panelProps} />
        </main>
      </div>
    </section>
  );
}

export function RoomsWorkspacePhone(props: RoomsWorkspaceProps) {
  const { viewModel, labels, actions, className, headerTrailing } = props;
  const { surface, accentColor } = useWorkspacePresentation();

  if (viewModel.status.kind !== 'ready') {
    return <WorkspaceStatus {...props} headerTrailing={headerTrailing} />;
  }

  const panelProps = { ...props, surface, accentColor, showInlineSaveBar: true };
  const showBrowseOutline = viewModel.mode === 'browse' && viewModel.selectedRoomId === null;
  const showBrowseBack = viewModel.mode === 'browse' && viewModel.selectedRoomId !== null;
  const showManageOutline = viewModel.mode === 'manage' && viewModel.stage === 'structure';
  const showManageBack =
    viewModel.mode === 'manage' &&
    viewModel.stage !== 'structure' &&
    viewModel.stage !== 'impact-review';

  return (
    <section
      aria-label={labels.title}
      className={cn(
        'flex h-[min(88dvh,54rem)] min-h-0 max-h-full w-full flex-col overflow-hidden rounded-[28px] border',
        surface.shellPanel,
        surface.border,
        surface.cardShadow,
        className
      )}
      data-room-workspace
      data-room-workspace-layout="phone"
    >
      <RoomWorkspaceHeader {...panelProps} trailingAction={headerTrailing} />
      {showBrowseBack || showManageBack ? (
        <div className={cn('border-b px-3 py-2', surface.border)}>
          <Button
            variant="ghost"
            onClick={() => {
              if (showManageBack) {
                actions.onStageChange('structure');
              } else {
                actions.onSelectRoom(null);
              }
            }}
            leading={<ArrowLeft className={navetIconSizeTokens.sm} />}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.back}
          </Button>
        </div>
      ) : null}
      <main className="min-h-0 flex-1">
        {showBrowseOutline || showManageOutline ? (
          <RoomOutline {...panelProps} />
        ) : (
          <RoomWorkspaceActivePanel {...panelProps} />
        )}
      </main>
    </section>
  );
}

export function RoomsWorkspace({ layout = 'responsive', ...props }: RoomsWorkspaceProps) {
  const isDesktop = useMediaQuery('(min-width: 1200px)');
  const isTablet = useMediaQuery('(min-width: 768px)');
  const resolvedLayout =
    layout === 'responsive' ? (isDesktop ? 'desktop' : isTablet ? 'tablet' : 'phone') : layout;

  if (resolvedLayout === 'desktop') {
    return <RoomsWorkspaceDesktop {...props} />;
  }
  if (resolvedLayout === 'tablet') {
    return <RoomsWorkspaceTablet {...props} />;
  }
  return <RoomsWorkspacePhone {...props} />;
}
