import {
  getPortalActionDockAnchorRect,
  PortalActionDock,
  type PortalActionDockAnchorRect,
} from '@navet/app/components/patterns/portal-action-dock';
import { CardEditActionButton } from '@navet/app/components/shared/card-edit-action-button';
import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { dispatchEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { withTintAlpha } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getBaseCardRadiusClassName } from '@navet/app/components/system/tokens';
import { useAccentColor, useI18n } from '@navet/app/hooks';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { EyeOff, Lock, Settings2, SlidersHorizontal, Unlock, X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { lazy, memo, Suspense, useEffect, useState } from 'react';
import type { CustomCard } from '../stores/custom-cards-store';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';
import { renderCard } from '../utils/card-renderer';
import type { ZoneName } from '../zones/zone-types';
import { DashboardResizeTrigger } from './dashboard-edit-actions';
import { WidgetCard } from './widget-card';

interface DashboardCardItemProps {
  id: string;
  size: CardSize;
  isEditMode: boolean;
  handleSizeChange: (id: string, size: CardSize) => void;
  device?: DeviceWithType;
  card?: CustomCard;
  zone?: ZoneName;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout?: (cardId: string) => void;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  allowExtraLargeSizes?: boolean;
  usesHideAction?: boolean;
  headerSubtitleOverride?: string;
}

const DashboardCardItemDraggable = lazy(async () => {
  const module = await import('./dashboard-card-item-draggable');
  return { default: module.DashboardCardItemDraggable };
});

export const DashboardCardItem = memo(function DashboardCardItem({
  id,
  size,
  isEditMode,
  handleSizeChange,
  device,
  card,
  zone,
  onDeleteCard,
  onUpdateCard,
  onRemoveFromLayout,
  onRemoveEntity,
  allowEntityRemoval = false,
  allowExtraLargeSizes = zone === 'hero' || zone === undefined,
  usesHideAction = false,
  headerSubtitleOverride,
}: DashboardCardItemProps) {
  const { t } = useI18n();
  const accentColor = useAccentColor();
  const ambientLightBleed = useSettingsStore(settingsSelectors.ambientLightBleed);
  const isLocked = useDashboardEntitiesStore((state) => state.lockedCardIds.includes(id));
  const toggleCardLock = useDashboardEntitiesStore((state) => state.toggleCardLock);
  const [isTinyEditDockOpen, setIsTinyEditDockOpen] = useState(false);
  const [tinyEditDockAnchorRect, setTinyEditDockAnchorRect] =
    useState<PortalActionDockAnchorRect | null>(null);
  const RemoveActionIcon = usesHideAction ? EyeOff : X;
  const removeAriaLabel = t('dashboard.edit.removeEntityFromDashboard');
  const allowedSizes = getAllowedSizes(device, card, allowExtraLargeSizes);
  const resolvedSize = resolveAllowedSize(size, allowedSizes);
  const spanClass = getCardSpanClass(resolvedSize);
  const editControlSize =
    device?.type === 'media' && resolvedSize === 'medium-vertical' ? 'medium' : resolvedSize;
  const usesTinyEditDockLauncher = isEditMode && editControlSize === 'tiny';

  // Drag is only enabled in edit mode when the card is inside a zone band.
  const draggable = isEditMode && zone !== undefined;
  const isInteractionLocked = isLocked && !isEditMode;
  const lockAriaLabel = isLocked ? t('dashboard.edit.unlockCard') : t('dashboard.edit.lockCard');
  const handleLockToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCardLock(id);
  };
  const canOpenEditModeSettings = device
    ? supportsEditModeSettingsDock(device)
    : supportsCustomCardEditModeSettingsDock(card);
  const tinyEditOverlayTitle = device?.name ?? getCustomCardEditLabel(card, t);
  const tinyEditOverlaySubtitle = device
    ? getDeviceTypeEditLabel(device.type, t)
    : t('widgets.common.widget');
  const handleEditModeSettingsOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dispatchEditModeSettingsRequest(id);
    setIsTinyEditDockOpen(false);
  };
  useEffect(() => {
    if (!usesTinyEditDockLauncher) {
      setIsTinyEditDockOpen(false);
      setTinyEditDockAnchorRect(null);
    }
  }, [usesTinyEditDockLauncher]);
  const renderedCard = device ? (
    renderCard({
      device: device as Parameters<typeof renderCard>[0]['device'],
      size: resolvedSize as CardSize,
      handleSizeChange,
      isEditMode,
      headerSubtitleOverride,
    })
  ) : card ? (
    <WidgetCard
      card={{ ...card, size: resolvedSize }}
      isEditMode={isEditMode}
      onUpdate={onUpdateCard}
    />
  ) : null;
  const lockedCardContent = (
    <LockedCardInteractionFrame
      isLocked={isInteractionLocked}
      label={t('dashboard.edit.lockedCard')}
    >
      {renderedCard}
    </LockedCardInteractionFrame>
  );

  const cardContent = (
    <>
      {isEditMode ? <EditModeCardBackdrop size={resolvedSize} /> : null}
      {isEditMode ? (
        usesTinyEditDockLauncher ? (
          isTinyEditDockOpen ? (
            <TinyEditModeDockOverlay
              accentColor={accentColor}
              anchorRect={tinyEditDockAnchorRect}
              subtitle={tinyEditOverlaySubtitle}
              title={tinyEditOverlayTitle}
              onClose={() => {
                setIsTinyEditDockOpen(false);
                setTinyEditDockAnchorRect(null);
              }}
            >
              {renderEditModeDockActions({
                allowedSizes,
                allowEntityRemoval,
                canOpenEditModeSettings,
                card,
                cardId: id,
                cardSize: editControlSize,
                entityName: device?.name ?? card?.id ?? '',
                handleEditModeSettingsOpen,
                handleLockToggle,
                handleSizeChange,
                hasDevice: Boolean(device),
                isLocked,
                lockAriaLabel,
                onDeleteCard,
                onRemoveEntity,
                onRemoveFromLayout,
                removeAriaLabel,
                RemoveActionIcon,
                resolvedSize,
                t,
                usesHideAction,
              })}
            </TinyEditModeDockOverlay>
          ) : (
            <TinyEditModeDockLauncher
              onOpen={(event) => {
                setTinyEditDockAnchorRect(getPortalActionDockAnchorRect(event.currentTarget));
                setIsTinyEditDockOpen(true);
              }}
              title={t('common.moreActions')}
            />
          )
        ) : (
          <EditModeActionDock cardSize={editControlSize} accentColor={accentColor}>
            {renderEditModeDockActions({
              allowedSizes,
              allowEntityRemoval,
              canOpenEditModeSettings,
              card,
              cardId: id,
              cardSize: editControlSize,
              entityName: device?.name ?? card?.id ?? '',
              handleEditModeSettingsOpen,
              handleLockToggle,
              handleSizeChange,
              hasDevice: Boolean(device),
              isLocked,
              lockAriaLabel,
              onDeleteCard,
              onRemoveEntity,
              onRemoveFromLayout,
              removeAriaLabel,
              RemoveActionIcon,
              resolvedSize,
              t,
              usesHideAction,
            })}
          </EditModeActionDock>
        )
      ) : null}
      {isLocked && !isEditMode ? <LockedCardBadge label={t('dashboard.edit.lockedCard')} /> : null}
      {lockedCardContent}
    </>
  );

  const containerClassName = `relative h-full ${
    device?.type === 'lights' && ambientLightBleed
      ? '[contain:layout_style]'
      : '[contain:layout_style_paint]'
  } ${spanClass} [&>*]:cursor-inherit`;

  if (draggable && zone) {
    return (
      <Suspense
        fallback={
          <div className={`${containerClassName} touch-none cursor-grab active:cursor-grabbing`}>
            {cardContent}
          </div>
        }
      >
        <DashboardCardItemDraggable
          id={id}
          zone={zone}
          spanClass={spanClass}
          ambientLightBleed={device?.type === 'lights' && ambientLightBleed}
        >
          {cardContent}
        </DashboardCardItemDraggable>
      </Suspense>
    );
  }

  return (
    <div className={`${containerClassName} cursor-inherit`} data-card-nodrag="true">
      {cardContent}
    </div>
  );
}, areDashboardCardItemPropsEqual);

function EditModeCardBackdrop({ size }: { size: CardSize }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-300 ${getBaseCardRadiusClassName(size)} bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.52),transparent_54%),radial-gradient(circle_at_top_right,rgba(0,0,0,0.56),transparent_50%),linear-gradient(to_bottom,rgba(0,0,0,0.28),rgba(0,0,0,0.12)_30%,rgba(0,0,0,0.16)_56%,rgba(0,0,0,0.52))]`}
      aria-hidden="true"
    />
  );
}

function EditModeActionDock({
  cardSize,
  accentColor,
  children,
}: {
  cardSize: CardSize;
  accentColor: string;
  children: ReactNode;
}) {
  const compact = cardSize === 'tiny' || cardSize === 'extra-small';
  const narrowDock = compact || cardSize === 'small';
  const radiusClassName = getBaseCardRadiusClassName(cardSize);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-500 h-24 overflow-hidden ${radiusClassName}`}
      data-card-edit-dock="true"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.78) 24%, rgba(0,0,0,0.42) 52%, transparent 78%)',
        }}
        aria-hidden="true"
      />
      <div
        className={`relative flex h-full items-end justify-center ${narrowDock ? 'px-2' : 'px-3'} ${compact ? 'pb-2.5' : 'pb-3'}`}
      >
        <div
          className={`pointer-events-auto inline-flex max-w-full items-center justify-center ${narrowDock ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2'} rounded-full`}
          style={{
            border: `1px solid ${withTintAlpha(accentColor, 0.12)}`,
            background: '#161619',
            boxShadow: '0 12px 24px -18px rgba(0,0,0,0.72)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function TinyEditModeDockLauncher({
  onOpen,
  title,
}: {
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
  title: string;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-500 flex justify-center px-2 pb-2">
      <CardEditActionButton
        cardSize="tiny"
        Icon={SlidersHorizontal}
        inline
        variant="accent"
        aria-label={title}
        title={title}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen(event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      />
    </div>
  );
}

function TinyEditModeDockOverlay({
  accentColor,
  anchorRect,
  children,
  onClose,
  subtitle,
  title,
}: {
  accentColor: string;
  anchorRect: PortalActionDockAnchorRect | null;
  children: ReactNode;
  onClose: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <PortalActionDock
      accentColor={accentColor}
      anchorRect={anchorRect}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
    >
      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
    </PortalActionDock>
  );
}

function renderEditModeDockActions({
  allowedSizes,
  allowEntityRemoval,
  canOpenEditModeSettings,
  card,
  cardId,
  cardSize,
  entityName,
  handleEditModeSettingsOpen,
  handleLockToggle,
  handleSizeChange,
  hasDevice,
  isLocked,
  lockAriaLabel,
  onDeleteCard,
  onRemoveEntity,
  onRemoveFromLayout,
  removeAriaLabel,
  RemoveActionIcon,
  resolvedSize,
  t,
  usesHideAction,
}: {
  allowedSizes: CardSize[];
  allowEntityRemoval: boolean;
  canOpenEditModeSettings: boolean;
  card?: CustomCard;
  cardId: string;
  cardSize: CardSize;
  entityName: string;
  handleEditModeSettingsOpen: (event: MouseEvent<HTMLButtonElement>) => void;
  handleLockToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  handleSizeChange: (id: string, size: CardSize) => void;
  hasDevice: boolean;
  isLocked: boolean;
  lockAriaLabel: string;
  onDeleteCard?: (cardId: string) => void;
  onRemoveEntity?: (entityId: string) => void;
  onRemoveFromLayout?: (cardId: string) => void;
  removeAriaLabel: string;
  RemoveActionIcon: typeof EyeOff;
  resolvedSize: CardSize;
  t: ReturnType<typeof useI18n>['t'];
  usesHideAction: boolean;
}) {
  return (
    <>
      {!onRemoveFromLayout && hasDevice && allowEntityRemoval && onRemoveEntity ? (
        <CardEditActionButton
          cardSize={cardSize}
          Icon={RemoveActionIcon}
          inline
          variant={usesHideAction ? 'warning' : 'destructive'}
          data-dashboard-edit-action="remove-entity"
          data-card-id={cardId}
          aria-label={removeAriaLabel}
        />
      ) : null}
      {onRemoveFromLayout ? (
        <CardEditActionButton
          cardSize={cardSize}
          Icon={X}
          inline
          variant="warning"
          data-dashboard-edit-action="remove-layout"
          data-card-id={cardId}
          aria-label={t('dashboard.edit.removeFromHome')}
        />
      ) : null}
      {!onRemoveFromLayout && card && onDeleteCard ? (
        <CardEditActionButton
          cardSize={cardSize}
          Icon={X}
          inline
          variant="destructive"
          data-dashboard-edit-action="delete-card"
          data-card-id={cardId}
          aria-label={t('widgets.delete')}
        />
      ) : null}
      <CardEditActionButton
        cardSize={cardSize}
        Icon={isLocked ? Lock : Unlock}
        inline
        variant={isLocked ? 'locked' : 'success'}
        aria-pressed={isLocked}
        aria-label={lockAriaLabel}
        title={lockAriaLabel}
        onClick={handleLockToggle}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      />
      <DashboardResizeTrigger
        cardSize={resolvedSize}
        triggerSize={cardSize}
        allowedSizes={allowedSizes}
        onSizeChange={(nextSize) => handleSizeChange(cardId, nextSize)}
        inline
      />
      {canOpenEditModeSettings ? (
        <CardEditActionButton
          cardSize={cardSize}
          Icon={Settings2}
          inline
          variant="accent"
          aria-label={t('entityCardInteraction.openSettings', {
            name: entityName,
          })}
          title={t('entityCardInteraction.openSettings', {
            name: entityName,
          })}
          onClick={handleEditModeSettingsOpen}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
      ) : null}
    </>
  );
}

function LockedCardBadge({ label }: { label: string }) {
  return (
    <div
      className="pointer-events-none absolute right-3 bottom-3 z-400 flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-black/78 text-white shadow-[0_12px_26px_-14px_rgba(0,0,0,0.95)] ring-1 ring-black/35 backdrop-blur-xl"
      aria-label={label}
      role="img"
      title={label}
    >
      <Lock className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]" aria-hidden="true" />
    </div>
  );
}

function LockedCardInteractionFrame({
  children,
  isLocked,
  label,
}: {
  children: ReactNode;
  isLocked: boolean;
  label: string;
}) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full w-full" data-card-locked="true">
      <div inert className="h-full w-full">
        {children}
      </div>
      <button
        type="button"
        className="absolute inset-0 z-300 cursor-not-allowed rounded-[inherit] border-0 bg-transparent p-0"
        data-card-lock-overlay="true"
        aria-label={label}
        tabIndex={-1}
        title={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    </div>
  );
}

function getAllowedSizes(
  device?: DeviceWithType,
  card?: CustomCard,
  extraLargeAllowed = true
): CardSize[] {
  if (card) {
    if (card.type === 'info' && isSingleSensorInfoCard(card)) {
      return ['extra-small', 'small', 'medium', 'large'];
    }
    if (card.type === 'button') {
      return ['tiny', 'extra-small', 'small'];
    }
    if (extraLargeAllowed && (card.type === 'photo' || card.type === 'rss')) {
      return ['small', 'medium', 'large', 'extra-large'];
    }
    if (card.type === 'energy-now') {
      return ['small', 'medium', 'large'];
    }
    if (card.type === 'map') {
      return ['small', 'medium', 'large'];
    }
    if (card.type === 'ups') {
      return ['small', 'medium', 'large'];
    }
    return ['small', 'medium', 'large'];
  }

  switch (device?.type) {
    case 'cameras':
      return ['medium', 'large', 'extra-large'];
    case 'media':
      return ['small', 'medium', 'medium-vertical', 'large'];
    case 'grouped-sensors':
      return ['small', 'medium'];
    case 'sensors':
      return ['extra-small', 'small'];
    case 'hvac':
    case 'climate':
      return ['small', 'medium'];
    case 'calendars':
      return ['small', 'medium', 'large'];
    case 'weather':
      return ['small', 'medium', 'large'];
    case 'vacuums':
      return ['small', 'medium'];
    case 'switches':
      return ['tiny', 'extra-small', 'small'];
    case 'helpers':
      return ['tiny', 'extra-small', 'small'];
    case 'lights':
      return ['extra-small', 'small', 'medium'];
    case 'fans':
      return ['small', 'medium'];
    case 'persons':
      return ['tiny', 'extra-small', 'small'];
    case 'locks':
      return ['small'];
    case 'scenes':
      return ['tiny', 'extra-small', 'small', 'medium'];
    default:
      return ['extra-small', 'small', 'medium', 'large'];
  }
}

function isSingleSensorInfoCard(card: CustomCard) {
  if (card.type !== 'info') {
    return false;
  }

  const sensorEntityIds = Array.isArray(card.data?.sensorEntityIds)
    ? card.data.sensorEntityIds.filter((value): value is string => typeof value === 'string')
    : [];

  if (sensorEntityIds.length > 0) {
    return sensorEntityIds.length === 1;
  }

  return typeof card.data?.entityId === 'string';
}

function supportsEditModeSettingsDock(device: DeviceWithType) {
  return [
    'lights',
    'fans',
    'switches',
    'helpers',
    'climate',
    'hvac',
    'weather',
    'cameras',
    'covers',
    'media',
    'vacuums',
    'calendars',
    'grouped-sensors',
    'sensors',
  ].includes(device.type);
}

function supportsCustomCardEditModeSettingsDock(card?: CustomCard) {
  if (!card) {
    return false;
  }

  return ['info', 'rss', 'photo', 'battery', 'ups', 'energy-now', 'button'].includes(card.type);
}

function getDeviceTypeEditLabel(type: DeviceWithType['type'], t: ReturnType<typeof useI18n>['t']) {
  switch (type) {
    case 'lights':
      return t('lighting.type.light');
    case 'switches':
    case 'helpers':
      return t('lighting.type.switch');
    case 'fans':
      return 'Fan';
    case 'climate':
    case 'hvac':
      return 'Climate';
    case 'weather':
      return t('deviceType.weather');
    case 'cameras':
      return t('deviceType.camera');
    case 'covers':
      return t('deviceType.cover');
    case 'media':
      return 'Media';
    case 'vacuums':
      return t('deviceType.vacuum');
    case 'calendars':
      return 'Calendar';
    case 'grouped-sensors':
      return t('deviceType.sensorGroup');
    case 'sensors':
      return t('deviceType.sensor');
    case 'persons':
      return t('deviceType.person');
    case 'scenes':
      return t('deviceType.scene');
    default:
      return t('widgets.common.widget');
  }
}

function getCustomCardEditLabel(card: CustomCard | undefined, t: ReturnType<typeof useI18n>['t']) {
  if (!card) {
    return t('widgets.common.widget');
  }

  const dataLabel =
    typeof card.data?.label === 'string' && card.data.label.trim().length > 0
      ? card.data.label.trim()
      : typeof card.data?.name === 'string' && card.data.name.trim().length > 0
        ? card.data.name.trim()
        : undefined;

  if (dataLabel) {
    return dataLabel;
  }

  return typeof card.id === 'string' && card.id.length > 0 ? card.id : t('widgets.common.widget');
}

function resolveAllowedSize(size: CardSize, allowedSizes: CardSize[]) {
  if (allowedSizes.includes(size)) {
    return size;
  }

  if (
    allowedSizes.length === 3 &&
    allowedSizes.includes('tiny') &&
    allowedSizes.includes('extra-small') &&
    allowedSizes.includes('small')
  ) {
    return 'small';
  }

  if (
    allowedSizes.length === 2 &&
    allowedSizes.includes('extra-small') &&
    allowedSizes.includes('small')
  ) {
    return 'small';
  }

  if (
    (size === 'large' || size === 'extra-large' || size === 'medium-vertical') &&
    allowedSizes.includes('medium')
  ) {
    return 'medium';
  }

  return allowedSizes[0] ?? size;
}

function areDashboardCardItemPropsEqual(
  previous: DashboardCardItemProps,
  next: DashboardCardItemProps
) {
  return (
    previous.id === next.id &&
    previous.size === next.size &&
    previous.isEditMode === next.isEditMode &&
    previous.device === next.device &&
    previous.card === next.card &&
    previous.zone === next.zone &&
    previous.handleSizeChange === next.handleSizeChange &&
    previous.onDeleteCard === next.onDeleteCard &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.onRemoveFromLayout === next.onRemoveFromLayout &&
    previous.onRemoveEntity === next.onRemoveEntity &&
    previous.allowEntityRemoval === next.allowEntityRemoval &&
    previous.allowExtraLargeSizes === next.allowExtraLargeSizes &&
    previous.usesHideAction === next.usesHideAction &&
    previous.headerSubtitleOverride === next.headerSubtitleOverride
  );
}
