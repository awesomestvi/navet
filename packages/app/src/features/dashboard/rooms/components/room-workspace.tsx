import { NavigationWorkspace } from '@navet/app/components/patterns';
import { Button, coverSheetHeaderClassName } from '@navet/app/components/primitives';
import {
  getThemeSurfaceTokens,
  navetIconSizeTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useMediaQuery, useTheme } from '@navet/app/hooks';
import { ArrowLeft, Edit3 } from 'lucide-react';
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
    <NavigationWorkspace.Frame
      aria-label={labels.title}
      className={cn('h-[min(82dvh,54rem)] max-h-full', className)}
      data-room-workspace
      data-room-workspace-layout="status"
    >
      <NavigationWorkspace.Header
        className={cn(
          coverSheetHeaderClassName,
          'flex min-w-0 items-start justify-between gap-3 pb-3 pl-[calc(env(safe-area-inset-left,0px)+1rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:gap-4 sm:px-5 sm:py-4'
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
      </NavigationWorkspace.Header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RoomWorkspaceStatusPanel status={viewModel.status} labels={labels} actions={actions} />
      </div>
    </NavigationWorkspace.Frame>
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
    <NavigationWorkspace.Frame
      aria-label={labels.title}
      className={cn('h-[min(78dvh,54rem)] max-h-full', className)}
      data-room-workspace
      data-room-workspace-layout="desktop"
    >
      <RoomWorkspaceHeader {...panelProps} trailingAction={headerTrailing} />
      <NavigationWorkspace.Body className="grid-cols-[minmax(16rem,0.64fr)_minmax(0,1.36fr)]">
        <NavigationWorkspace.Sidebar>
          <RoomOutline {...panelProps} />
        </NavigationWorkspace.Sidebar>
        <NavigationWorkspace.Content>
          <RoomWorkspaceActivePanel {...panelProps} />
        </NavigationWorkspace.Content>
      </NavigationWorkspace.Body>
    </NavigationWorkspace.Frame>
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
    <NavigationWorkspace.Frame
      aria-label={labels.title}
      className={cn('h-[min(82dvh,54rem)] max-h-full', className)}
      data-room-workspace
      data-room-workspace-layout="tablet"
    >
      <RoomWorkspaceHeader {...panelProps} trailingAction={headerTrailing} />
      <NavigationWorkspace.Body className="grid-cols-[minmax(15rem,0.64fr)_minmax(0,1.36fr)]">
        <NavigationWorkspace.Sidebar>
          <RoomOutline {...panelProps} />
        </NavigationWorkspace.Sidebar>
        <NavigationWorkspace.Content>
          <RoomWorkspaceActivePanel {...panelProps} />
        </NavigationWorkspace.Content>
      </NavigationWorkspace.Body>
    </NavigationWorkspace.Frame>
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
    <NavigationWorkspace.Frame
      aria-label={labels.title}
      className={cn('h-[min(88dvh,54rem)] max-h-full', className)}
      data-room-workspace
      data-room-workspace-layout="phone"
    >
      <RoomWorkspaceHeader {...panelProps} trailingAction={headerTrailing} showModeAction={false} />
      <main className="min-h-0 flex-1">
        {showBrowseOutline || showManageOutline ? (
          <RoomOutline {...panelProps} />
        ) : (
          <RoomWorkspaceActivePanel {...panelProps} />
        )}
      </main>
      <footer className={cn('border-t px-4 py-3', surface.border)} data-room-workspace-phone-footer>
        <div
          className={cn(
            'flex items-center gap-3',
            showBrowseBack || showManageBack ? 'justify-between' : 'justify-end'
          )}
        >
          {showBrowseBack || showManageBack ? (
            <Button
              variant="secondary"
              onClick={() => {
                if (showManageBack) {
                  actions.onStageChange('structure');
                } else {
                  actions.onSelectRoom(null);
                }
              }}
              leading={<ArrowLeft className={navetIconSizeTokens.sm} />}
              className="shrink-0 motion-reduce:transition-none"
            >
              {labels.back}
            </Button>
          ) : null}
          <Button
            variant={viewModel.mode === 'manage' ? 'secondary' : 'primary'}
            leading={
              viewModel.mode === 'manage' ? (
                <ArrowLeft className={navetIconSizeTokens.sm} aria-hidden="true" />
              ) : (
                <Edit3 className={navetIconSizeTokens.sm} aria-hidden="true" />
              )
            }
            onClick={() => actions.onModeChange(viewModel.mode === 'manage' ? 'browse' : 'manage')}
            className="shrink-0 motion-reduce:transition-none"
          >
            {viewModel.mode === 'manage' ? labels.browseMode : labels.manageMode}
          </Button>
        </div>
      </footer>
    </NavigationWorkspace.Frame>
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
