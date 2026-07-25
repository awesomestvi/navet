import {
  BaseCardDialog,
  Button,
  SheetSurface,
  SheetSurfaceHeader,
} from '@navet/app/components/primitives';
import { getThemeSurfaceTokens, navetIconSizeTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { X } from 'lucide-react';
import { RoomsWorkspace } from './room-workspace';
import type { RoomWorkspaceComponentProps, RoomWorkspaceLayout } from './room-workspace.types';
import { RoomDeviceSelectionPanel, RoomImpactReviewPanel } from './room-workspace-panels';

export interface RoomsWorkspaceDialogProps extends RoomWorkspaceComponentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: RoomWorkspaceLayout;
}

export function RoomsWorkspaceDialog({
  isOpen,
  onOpenChange,
  layout = 'responsive',
  viewModel,
  labels,
  actions,
  className,
}: RoomsWorkspaceDialogProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={labels.title}
      description={labels.description}
      theme={theme}
      contentClassName={cn(surface.shellPanel, surface.border)}
      shellBodyClassName="h-full min-h-0"
    >
      <div className="h-full min-h-0 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pr-[calc(env(safe-area-inset-right,0px)+0.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pl-[calc(env(safe-area-inset-left,0px)+0.5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:pr-[calc(env(safe-area-inset-right,0px)+0.75rem)] md:pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pl-[calc(env(safe-area-inset-left,0px)+0.75rem)]">
        <RoomsWorkspace
          viewModel={viewModel}
          labels={labels}
          actions={actions}
          layout={layout}
          headerTrailing={
            <Button
              variant="ghost"
              iconOnly
              label={labels.closeSheet}
              onClick={() => onOpenChange(false)}
              className="min-h-11 min-w-11 motion-reduce:transition-none"
            >
              <X className={navetIconSizeTokens.sm} />
            </Button>
          }
          className={cn('h-full min-h-0 max-h-full shadow-none', className)}
        />
      </div>
    </BaseCardDialog>
  );
}

export interface RoomDeviceSelectionSheetProps extends RoomWorkspaceComponentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomDeviceSelectionSheet({
  isOpen,
  onOpenChange,
  viewModel,
  labels,
  actions,
}: RoomDeviceSelectionSheetProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <SheetSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={labels.devicesTitle}
      description={labels.devicesDescription}
      accentColor={accentColor}
      contentClassName="max-w-2xl"
      bodyClassName="[&>button:first-child]:min-h-11"
    >
      <SheetSurfaceHeader
        title={labels.devicesTitle}
        description={viewModel.selectionSummary}
        closeLabel={labels.closeSheet}
        onClose={() => onOpenChange(false)}
        className="px-4 pb-3 [&_button]:min-h-11 [&_button]:min-w-11"
      />
      <div className={cn('h-[min(76dvh,46rem)] min-h-0 border-t', surface.border)}>
        <RoomDeviceSelectionPanel
          viewModel={viewModel}
          labels={labels}
          actions={actions}
          surface={surface}
          accentColor={accentColor}
        />
      </div>
    </SheetSurface>
  );
}

export interface RoomImpactReviewDialogProps extends RoomWorkspaceComponentProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomImpactReviewDialog({
  isOpen,
  onOpenChange,
  viewModel,
  labels,
  actions,
}: RoomImpactReviewDialogProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={labels.impactTitle}
      description={labels.impactDescription}
      theme={theme}
      maxWidth="lg"
      height="tall"
      bodyPadding={false}
    >
      <div className="relative h-[min(76dvh,46rem)] min-h-0">
        <Button
          variant="ghost"
          iconOnly
          label={labels.closeSheet}
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 min-h-11 min-w-11 motion-reduce:transition-none"
        >
          <X className={navetIconSizeTokens.sm} />
        </Button>
        <div className="h-full min-h-0 pr-12">
          <RoomImpactReviewPanel
            viewModel={viewModel}
            labels={labels}
            actions={actions}
            surface={surface}
            accentColor={accentColor}
          />
        </div>
      </div>
    </BaseCardDialog>
  );
}
