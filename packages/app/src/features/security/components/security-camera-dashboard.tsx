import {
  type CardSize,
  getCardGridAutoRowsStyle,
  getDashboardGridColumnCount,
} from '@navet/app/components/shared/card-size-selector';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { DashboardCardItem, DashboardEditActions } from '@navet/app/features/dashboard';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { AlertTriangle } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CameraDashboardModel } from '../utils/security-camera-dashboard-model';

interface SecurityCameraDashboardProps {
  model: CameraDashboardModel;
  isEditMode: boolean;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onRemoveEntity?: (entityId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  labels: {
    primaryTitle: string;
    stillTitle: string;
    stillDescription: string;
    noPrimaryTitle: string;
    noPrimaryDescription: string;
    locksTitle: string;
  };
}

function asCameraDevice(camera: CameraDashboardModel['primaryCameras'][number]): DeviceWithType {
  return { ...camera, type: 'cameras' } as DeviceWithType;
}

function asLockDevice(lock: CameraDashboardModel['locks'][number]): DeviceWithType {
  return { ...lock, type: 'locks' } as DeviceWithType;
}

function getDefaultCameraSize(index: number): CardSize {
  return index === 0 ? 'extra-large' : 'large';
}

function CameraGrid({
  cameras,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
}: {
  cameras: CameraDashboardModel['primaryCameras'];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const breakpointCols = useBreakpointCols();

  return (
    <DashboardEditActions isEditMode={isEditMode} onRemoveEntity={onRemoveEntity}>
      <div
        className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
        style={
          {
            ...getCardGridAutoRowsStyle(breakpointCols),
            gridTemplateColumns: `repeat(${getDashboardGridColumnCount(breakpointCols)}, minmax(0, 1fr))`,
          } as CSSProperties
        }
      >
        {cameras.map((camera, index) => {
          const size = cardSizes[camera.id] ?? getDefaultCameraSize(index);

          return (
            <DashboardCardItem
              key={camera.id}
              id={camera.id}
              device={asCameraDevice(camera)}
              size={size}
              isEditMode={isEditMode}
              handleSizeChange={updateCardSize}
              onRemoveEntity={onRemoveEntity}
              allowEntityRemoval
              usesHideAction
            />
          );
        })}
      </div>
    </DashboardEditActions>
  );
}

function LockGrid({
  locks,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
}: {
  locks: CameraDashboardModel['locks'];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const breakpointCols = useBreakpointCols();

  return (
    <DashboardEditActions isEditMode={isEditMode} onRemoveEntity={onRemoveEntity}>
      <div
        className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
        style={
          {
            ...getCardGridAutoRowsStyle(breakpointCols),
            gridTemplateColumns: `repeat(${getDashboardGridColumnCount(breakpointCols)}, minmax(0, 1fr))`,
          } as CSSProperties
        }
      >
        {locks.map((lock) => {
          const size = cardSizes[lock.id] ?? 'small';

          return (
            <DashboardCardItem
              key={lock.id}
              id={lock.id}
              device={asLockDevice(lock)}
              size={size}
              isEditMode={isEditMode}
              handleSizeChange={updateCardSize}
              onRemoveEntity={onRemoveEntity}
              allowEntityRemoval
              usesHideAction
            />
          );
        })}
      </div>
    </DashboardEditActions>
  );
}

export function SecurityCameraDashboard({
  model,
  isEditMode,
  cardSizes,
  updateCardSize,
  onRemoveEntity,
  surface,
  labels,
}: SecurityCameraDashboardProps) {
  const { primaryCameras, stillImageCameras, locks } = model;
  const hasOtherSecurityContent = stillImageCameras.length > 0 || locks.length > 0;

  return (
    <div className="space-y-5 md:space-y-6">
      {primaryCameras.length > 0 ? (
        <section className="space-y-3">
          <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
            {labels.primaryTitle}
          </h2>
          <CameraGrid
            cameras={primaryCameras}
            cardSizes={cardSizes}
            updateCardSize={updateCardSize}
            isEditMode={isEditMode}
            onRemoveEntity={onRemoveEntity}
          />
        </section>
      ) : hasOtherSecurityContent ? null : (
        <section
          className={`flex min-h-52 flex-col items-center justify-center rounded-[28px] border border-dashed p-6 text-center ${surface.border} ${surface.panelMuted}`}
        >
          <AlertTriangle className={`h-9 w-9 ${surface.textMuted}`} />
          <h2 className={`mt-3 text-lg font-semibold ${surface.textPrimary}`}>
            {labels.noPrimaryTitle}
          </h2>
          <p className={`mt-2 max-w-md text-sm ${surface.textSecondary}`}>
            {labels.noPrimaryDescription}
          </p>
        </section>
      )}

      {stillImageCameras.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
              {labels.stillTitle}
            </h2>
            <p className={`mt-1 max-w-2xl text-sm ${surface.textSecondary}`}>
              {labels.stillDescription}
            </p>
          </div>
          <CameraGrid
            cameras={stillImageCameras}
            cardSizes={cardSizes}
            updateCardSize={updateCardSize}
            isEditMode={isEditMode}
            onRemoveEntity={onRemoveEntity}
          />
        </section>
      ) : null}

      {locks.length > 0 ? (
        <section className="space-y-3">
          <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
            {labels.locksTitle}
          </h2>
          <LockGrid
            locks={locks}
            cardSizes={cardSizes}
            updateCardSize={updateCardSize}
            isEditMode={isEditMode}
            onRemoveEntity={onRemoveEntity}
          />
        </section>
      ) : null}
    </div>
  );
}
