import {
  BaseCardDialog,
  Button,
  IconButton,
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
      contentClassName={cn(
        'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2',
        surface.shellPanel,
        surface.border
      )}
      shellBodyClassName="h-full min-h-0"
    >
      <RoomsWorkspace
        viewModel={viewModel}
        labels={labels}
        actions={actions}
        layout={layout}
        headerTrailing={
          <IconButton
            variant="ghost"
            label={labels.closeSheet}
            icon={<X className={navetIconSizeTokens.sm} aria-hidden="true" />}
            onClick={() => onOpenChange(false)}
            className={cn(
              'min-h-11 min-w-11 motion-reduce:transition-none',
              surface.subtleBg,
              surface.hoverBg
            )}
          />
        }
        className={cn(
          'h-full min-h-0 max-h-full rounded-none border-0 bg-transparent shadow-none',
          className
        )}
      />
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
  const selectedRoom = viewModel.rooms.find((room) => room.id === viewModel.selectedRoomId);

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={labels.manageDevices}
      description={selectedRoom?.name ?? labels.devicesDescription}
      theme={theme}
      maxWidth="lg"
      height="tall"
      bodyPadding={false}
    >
      <div className="flex h-[min(76dvh,46rem)] min-h-0 flex-col">
        <SheetSurfaceHeader
          title={labels.manageDevices}
          description={
            selectedRoom
              ? `${selectedRoom.name} · ${selectedRoom.deviceSummary}`
              : viewModel.selectionSummary
          }
          closeLabel={labels.closeSheet}
          onClose={() => onOpenChange(false)}
          className="px-4 pt-4 pb-3 [&_button]:min-h-11 [&_button]:min-w-11"
        />
        <div className={cn('min-h-0 flex-1 border-t', surface.border)}>
          <RoomDeviceSelectionPanel
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
