import { useAuthBaseUrl } from '@navet/app/auth/AuthProvider';
import { SectionCustomizeButton } from '@navet/app/components/layout/section-customize-button';
import { DashboardHeroSection } from '@navet/app/components/patterns';
import { BaseCard, InteractivePill } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { CardEditActionButton } from '@navet/app/components/shared/card-edit-action-button';
import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import {
  getInheritedDialogSectionStyle,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  getBaseCardRadiusClassName,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  AddCardDialogContainer,
  type CardTemplate,
} from '@navet/app/features/dashboard/components/add-card-dialog';
import { DashboardCardItem } from '@navet/app/features/dashboard/components/dashboard-card-item';
import { DashboardResizeTrigger } from '@navet/app/features/dashboard/components/dashboard-edit-actions';
import type { DashboardLibraryCard } from '@navet/app/features/dashboard/components/dashboard-library-list';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import type { CustomCard } from '@navet/app/features/dashboard/stores/custom-cards-store';
import { HEATING_CATEGORIES } from '@navet/app/features/energy/data/energy-constants';
import { useEnergyLoadHistory } from '@navet/app/features/energy/hooks/use-energy-load-history';
import type {
  EnergyConsumer,
  EnergyDashboardModel,
  EnergySeriesPoint,
  EnergySourceDiagnostic,
} from '@navet/app/features/energy/types/energy.types';
import {
  formatEnergyPercent,
  formatEnergyValue,
} from '@navet/app/features/energy/utils/energy-formatters';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useDeferredVisibility } from '@navet/app/hooks/use-deferred-visibility';
import { usePersistedState } from '@navet/app/hooks/use-persisted-state';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import {
  AlertTriangle,
  ExternalLink,
  EyeOff,
  Flame,
  Leaf,
  PlugZap,
  Plus,
  Sun,
  Zap,
} from 'lucide-react';
import { type CSSProperties, memo, type ReactNode, useMemo, useState } from 'react';
import { EnergyNowCardView } from '../widgets/energy-now-card-view';

interface EnergyDashboardPageProps {
  dashboard: EnergyDashboardModel;
  sourceDiagnostics: EnergySourceDiagnostic[];
  energyCustomCards?: CustomCard[];
  energyOrderedCardIds?: string[];
  isEditMode?: boolean;
  onAddCard?: (template: CardTemplate, size: CardSize) => void;
  onToggleEditMode?: () => void;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
}
const heroLegendColors = {
  generated: themeColorValues.green,
  liveLoad: themeColorValues.teal,
  gridImport: themeColorValues.orange,
  trackedDevices: themeColorValues.blue,
};
const ENERGY_WHOLE_HOME_SPARKLINE_CARD_ID = 'energy:whole-home-sparkline';
const ENERGY_SPARKLINE_ALLOWED_SIZES: CardSize[] = ['small', 'medium', 'large'];
const LOAD_ORB_DRIFT_BASE_DURATION_S = 8.5;
const LOAD_ORB_RIPPLE_KEYFRAMES = `
  @keyframes navet-load-orb-water-drift {
    0%, 100% {
      opacity: var(--load-orb-dot-opacity);
      transform:
        translate(-50%, -50%)
        translate(
          calc(var(--load-orb-dot-x) - var(--load-orb-drift-x)),
          calc(var(--load-orb-dot-y) - var(--load-orb-drift-y))
        )
        scale(0.97);
    }

    50% {
      opacity: calc(var(--load-orb-dot-opacity) * 0.9);
      transform:
        translate(-50%, -50%)
        translate(
          calc(var(--load-orb-dot-x) + var(--load-orb-drift-x)),
          calc(var(--load-orb-dot-y) + var(--load-orb-drift-y))
        )
        scale(1.03);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .navet-load-orb-dot {
      animation: none !important;
      opacity: var(--load-orb-dot-opacity) !important;
      transform: translate(-50%, -50%) translate(var(--load-orb-dot-x), var(--load-orb-dot-y)) scale(1) !important;
    }
  }
`;

export const EnergyDashboardPage = memo(function EnergyDashboardPage({
  dashboard,
  sourceDiagnostics,
  energyCustomCards = [],
  energyOrderedCardIds = [],
  isEditMode: controlledEditMode,
  onAddCard,
  onToggleEditMode,
  onDeleteCard,
  onUpdateCard,
}: EnergyDashboardPageProps) {
  const { t } = useI18n();
  const haBaseUrl = useAuthBaseUrl();
  const { theme, accentColor } = useTheme();
  const [uncontrolledEditMode, setUncontrolledEditMode] = useState(false);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [hiddenConsumerIds, setHiddenConsumerIds] = usePersistedState<string[]>(
    STORAGE_KEYS.energyHiddenConsumerIds,
    []
  );
  const [sparklineCardSizes, setSparklineCardSizes] = usePersistedState<Record<string, CardSize>>(
    STORAGE_KEYS.energySparklineCardSizes,
    {}
  );
  const surface = getThemeSurfaceTokens(theme);
  const homeAssistantEnergyUrl = resolveHomeAssistantEnergyUrl(haBaseUrl);
  const isEditMode =
    typeof controlledEditMode === 'boolean' ? controlledEditMode : uncontrolledEditMode;
  const hiddenConsumerIdSet = useMemo(() => new Set(hiddenConsumerIds), [hiddenConsumerIds]);
  const energyCardsById = useMemo(
    () => new Map(energyCustomCards.map((card) => [card.id, card])),
    [energyCustomCards]
  );
  const orderedEnergyCustomCards = useMemo(() => {
    const orderedCards = energyOrderedCardIds
      .map((cardId) => energyCardsById.get(cardId))
      .filter((card): card is CustomCard => card !== undefined);

    const seenCardIds = new Set(orderedCards.map((card) => card.id));
    const remainingCards = energyCustomCards.filter((card) => !seenCardIds.has(card.id));

    return [...orderedCards, ...remainingCards];
  }, [energyCardsById, energyCustomCards, energyOrderedCardIds]);
  const visibleConsumers = useMemo(
    () => dashboard.topConsumers.filter((consumer) => !hiddenConsumerIdSet.has(consumer.id)),
    [dashboard.topConsumers, hiddenConsumerIdSet]
  );
  const filteredDashboard = useMemo(
    () => ({
      ...dashboard,
      topConsumers: visibleConsumers,
    }),
    [dashboard, visibleConsumers]
  );
  const hiddenConsumers = useMemo(
    () => dashboard.topConsumers.filter((consumer) => hiddenConsumerIdSet.has(consumer.id)),
    [dashboard.topConsumers, hiddenConsumerIdSet]
  );
  const energyLibraryCards = useMemo<DashboardLibraryCard[]>(
    () =>
      hiddenConsumers
        .map((consumer) => ({
          id: consumer.id,
          title: consumer.name,
          subtitle: consumer.room ?? t('sidebar.energy'),
          meta:
            consumer.powerW > 0
              ? `${Math.round(consumer.powerW)} W`
              : `${formatEnergyValue(consumer.energyKWh)} kWh`,
          kind: 'device' as const,
          icon:
            consumer.category === 'water_heater'
              ? Sun
              : HEATING_CATEGORIES.has(consumer.category)
                ? Flame
                : PlugZap,
        }))
        .sort(
          (left, right) =>
            left.subtitle.localeCompare(right.subtitle) || left.title.localeCompare(right.title)
        ),
    [hiddenConsumers, t]
  );
  const liveWatts = Math.round(filteredDashboard.totals.currentLoadW);
  const importedTodayLabel = `${formatEnergyValue(dashboard.totals.importTodayKWh)} kWh`;
  const generatedTodayLabel = `${formatEnergyValue(dashboard.totals.solarTodayKWh)} kWh`;
  const toggleEditMode = () => {
    if (onToggleEditMode) {
      onToggleEditMode();
      return;
    }

    setUncontrolledEditMode((previous) => !previous);
  };
  const handleConsumerVisibilityChange = (consumerId: string, visible: boolean) => {
    setHiddenConsumerIds((previous) => {
      const nextSet = new Set(previous);
      if (visible) {
        nextSet.delete(consumerId);
      } else {
        nextSet.add(consumerId);
      }
      return [...nextSet];
    });
  };
  const updateSparklineCardSize = (cardId: string, size: CardSize) => {
    setSparklineCardSizes((previous) => ({ ...previous, [cardId]: size }));
  };
  const heroActions = (
    <div className="flex min-h-10 items-center justify-end gap-2">
      {isEditMode ? (
        <button
          type="button"
          onClick={() => setIsAddCardDialogOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-[22px] border px-2.5 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-3 md:py-2 md:text-sm ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
        >
          <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
          <span className={`hidden text-xs font-medium md:inline ${surface.textSecondary}`}>
            {t('dashboard.roomNav.addCard')}
          </span>
        </button>
      ) : null}
      <SectionCustomizeButton isEditMode={isEditMode} onToggle={toggleEditMode} />
    </div>
  );
  return (
    <div className="space-y-5">
      <DashboardHeroSection
        accentColor={accentColor}
        actions={heroActions}
        actionsClassName="md:absolute md:top-0 md:right-0 md:mt-0 md:max-w-[22rem] md:justify-end"
        description="See where power is flowing right now."
        surface={surface}
        title={t('energy.hero.title')}
      />

      <section>
        <DeviceTable
          accentColor={accentColor}
          consumers={filteredDashboard.topConsumers}
          generatedColor={heroLegendColors.generated}
          generatedTodayKWh={dashboard.totals.exportTodayKWh}
          gridImportTodayKWh={dashboard.totals.importTodayKWh}
          homeAssistantEnergyUrl={homeAssistantEnergyUrl}
          importColor={heroLegendColors.gridImport}
          loadW={liveWatts}
          openLabel={t('common.open')}
          importedTodayLabel={importedTodayLabel}
          generatedTodayLabel={generatedTodayLabel}
          sourceDiagnostics={sourceDiagnostics}
          surface={surface}
        />
      </section>

      <section>
        <CompactLoadSparklines
          accentColor={accentColor}
          cardSizes={sparklineCardSizes}
          consumers={filteredDashboard.topConsumers}
          customCards={orderedEnergyCustomCards}
          isEditMode={isEditMode}
          onHideConsumer={(consumerId) => handleConsumerVisibilityChange(consumerId, false)}
          onDeleteCard={onDeleteCard}
          onSizeChange={updateSparklineCardSize}
          onUpdateCard={onUpdateCard}
          theme={theme}
          wholeHomeCurrentW={dashboard.totals.currentLoadW}
          wholeHomePoints={dashboard.ranges[dashboard.selectedRange].liveConsumption}
          wholeHomeTodayKWh={dashboard.ranges[dashboard.selectedRange].totalUsageKWh}
        />
      </section>
      <AddCardDialogContainer
        open={isAddCardDialogOpen}
        onClose={() => setIsAddCardDialogOpen(false)}
        onAddCard={(template, size) => onAddCard?.(template, size)}
        onAddLibraryCard={(cardId) => handleConsumerVisibilityChange(cardId, true)}
        currentRoom={t('sidebar.energy')}
        libraryCards={energyLibraryCards}
        showCardsTab
        allowedTemplateIds={['energy-now', 'energy-metric']}
      />
    </div>
  );
});

function CompactLoadSparklines({
  accentColor,
  cardSizes,
  consumers,
  customCards,
  isEditMode,
  onDeleteCard,
  onHideConsumer,
  onSizeChange,
  onUpdateCard,
  theme,
  wholeHomeCurrentW,
  wholeHomePoints,
  wholeHomeTodayKWh,
}: {
  accentColor: string;
  cardSizes: Record<string, CardSize>;
  consumers: EnergyConsumer[];
  customCards: CustomCard[];
  isEditMode: boolean;
  onDeleteCard?: (cardId: string) => void;
  onHideConsumer: (consumerId: string) => void;
  onSizeChange: (cardId: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
  theme: ThemeType;
  wholeHomeCurrentW: number;
  wholeHomePoints: EnergySeriesPoint[];
  wholeHomeTodayKWh: number;
}) {
  const breakpointCols = useBreakpointCols();
  const { ref: viewportRef, isVisible } = useDeferredVisibility<HTMLDivElement>({
    rootMargin: '180px 0px',
  });
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols, false);
  const wholeHomeCardSize = resolveSparklineCardSize(
    cardSizes[ENERGY_WHOLE_HOME_SPARKLINE_CARD_ID]
  );

  return (
    <div ref={viewportRef}>
      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
            style={gridStyle as CSSProperties}
          >
            <SparklineCardFrame
              accentColor={accentColor}
              cardSize={wholeHomeCardSize}
              isEditMode={isEditMode}
              onSizeChange={(size) => onSizeChange(ENERGY_WHOLE_HOME_SPARKLINE_CARD_ID, size)}
              theme={theme}
            >
              <EnergyNowCardView
                accentColor={accentColor}
                currentLoadW={wholeHomeCurrentW}
                size={wholeHomeCardSize}
                title="Whole home"
                todayUsageKWh={wholeHomeTodayKWh}
                trend={wholeHomePoints}
              />
            </SparklineCardFrame>
            {consumers.map((consumer) => (
              <DeviceSparklineRow
                key={consumer.id}
                accentColor={accentColor}
                cardSize={resolveSparklineCardSize(
                  cardSizes[getEnergyConsumerSparklineCardId(consumer.id)]
                )}
                consumer={consumer}
                enabled={isVisible}
                isEditMode={isEditMode}
                onHideConsumer={onHideConsumer}
                onSizeChange={onSizeChange}
                theme={theme}
              />
            ))}
            {customCards.map((card) => (
              <DashboardCardItem
                key={card.id}
                id={card.id}
                size={card.size}
                isEditMode={isEditMode}
                card={card}
                handleSizeChange={(cardId, size) => onUpdateCard?.(cardId, { size })}
                onDeleteCard={onDeleteCard}
                onUpdateCard={onUpdateCard}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceSparklineRow({
  accentColor,
  cardSize,
  consumer,
  enabled,
  isEditMode,
  onHideConsumer,
  onSizeChange,
  theme,
}: {
  accentColor: string;
  cardSize: Extract<CardSize, 'small' | 'medium' | 'large'>;
  consumer: EnergyConsumer;
  enabled: boolean;
  isEditMode: boolean;
  onHideConsumer: (consumerId: string) => void;
  onSizeChange: (cardId: string, size: CardSize) => void;
  theme: ThemeType;
}) {
  const points = useEnergyLoadHistory(consumer.powerEntityId, consumer.powerW, enabled);
  const cardId = getEnergyConsumerSparklineCardId(consumer.id);

  return (
    <SparklineCardFrame
      accentColor={accentColor}
      cardSize={cardSize}
      isEditMode={isEditMode}
      onHide={() => onHideConsumer(consumer.id)}
      onSizeChange={(size) => onSizeChange(cardId, size)}
      theme={theme}
    >
      <EnergyNowCardView
        accentColor={accentColor}
        currentLoadW={consumer.powerW}
        size={cardSize}
        title={consumer.name}
        todayUsageKWh={consumer.energyKWh}
        trend={points}
      />
    </SparklineCardFrame>
  );
}

function SparklineCardFrame({
  accentColor,
  cardSize,
  children,
  isEditMode,
  onHide,
  onSizeChange,
  theme,
}: {
  accentColor: string;
  cardSize: Extract<CardSize, 'small' | 'medium' | 'large'>;
  children: ReactNode;
  isEditMode: boolean;
  onHide?: () => void;
  onSizeChange: (size: CardSize) => void;
  theme: ThemeType;
}) {
  return (
    <div className={`${getCardSpanClass(cardSize)} relative h-full min-w-0`}>
      <div className="relative h-full">
        {children}
        {isEditMode ? (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 h-24 overflow-hidden ${getBaseCardRadiusClassName(cardSize)}`}
            data-card-edit-dock="true"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  theme === 'glass'
                    ? 'linear-gradient(to top, rgba(4,8,18,0.56), rgba(8,12,20,0.3) 24%, rgba(10,14,24,0.1) 52%, transparent 78%)'
                    : 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.78) 24%, rgba(0,0,0,0.42) 52%, transparent 78%)',
              }}
              aria-hidden="true"
            />
            <div className="relative flex h-full items-end justify-center px-2 pb-3">
              <div
                className="pointer-events-auto inline-flex max-w-full items-center justify-center gap-2 rounded-full px-3 py-2"
                style={
                  theme === 'glass'
                    ? {
                        border: '1px solid rgba(255,255,255,0.16)',
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08) 22%, rgba(255,255,255,0.03) 100%)',
                        boxShadow:
                          '0 18px 38px -24px rgba(4,10,22,0.82), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -10px 18px rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(24px) saturate(1.05)',
                        WebkitBackdropFilter: 'blur(24px) saturate(1.05)',
                      }
                    : {
                        border: `1px solid ${withTintAlpha(accentColor, 0.12)}`,
                        background: '#161619',
                        boxShadow: '0 12px 24px -18px rgba(0,0,0,0.72)',
                      }
                }
              >
                {onHide ? (
                  <CardEditActionButton
                    cardSize={cardSize}
                    Icon={EyeOff}
                    inline
                    theme={theme}
                    variant="warning"
                    aria-label="Hide energy sensor"
                    title="Hide energy sensor"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onHide();
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                  />
                ) : null}
                <DashboardResizeTrigger
                  cardSize={cardSize}
                  allowedSizes={ENERGY_SPARKLINE_ALLOWED_SIZES}
                  onSizeChange={onSizeChange}
                  inline
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getEnergyConsumerSparklineCardId(consumerId: string) {
  return `energy:consumer:${consumerId}`;
}

function resolveSparklineCardSize(
  size: CardSize | undefined
): Extract<CardSize, 'small' | 'medium' | 'large'> {
  if (size === 'small' || size === 'medium' || size === 'large') {
    return size;
  }

  return 'medium';
}

function MinimalStat({
  label,
  value,
  dotColor,
  className = '',
  surfaceText,
}: {
  label: string;
  value: string;
  dotColor: string;
  className?: string;
  surfaceText: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${surfaceText} ${className}`}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function LoadOrb({
  consumers,
  generatedColor,
  generatedTodayKWh,
  importColor,
  loadW,
  todayKWh,
  surface,
}: {
  consumers: EnergyConsumer[];
  generatedColor: string;
  generatedTodayKWh: number;
  importColor: string;
  loadW: number;
  todayKWh: number;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const motionIntensity = getLoadOrbMotionIntensity(loadW);
  const dots = buildOrbDots(motionIntensity);
  const orbSegments = getLoadOrbSegments({
    consumers,
    exportedKWh: generatedTodayKWh,
    importedKWh: todayKWh,
  });

  return (
    <div className="relative flex min-h-[24rem] min-w-0 items-center justify-center overflow-visible px-2 py-4">
      <style>{LOAD_ORB_RIPPLE_KEYFRAMES}</style>
      <div className="absolute inset-0" aria-hidden="true">
        {dots.map((dot) => (
          <span
            key={dot.id}
            className="navet-load-orb-dot absolute rounded-full"
            data-ring={dot.ring}
            data-testid="load-orb-dot"
            style={{
              ['--load-orb-dot-opacity' as string]: String(dot.opacity),
              ['--load-orb-dot-x' as string]: `${dot.x}px`,
              ['--load-orb-dot-y' as string]: `${dot.y}px`,
              ['--load-orb-drift-x' as string]: `${dot.driftX}px`,
              ['--load-orb-drift-y' as string]: `${dot.driftY}px`,
              animationDelay: `${dot.delayS}s`,
              animationDuration: `${dot.durationS}s`,
              animationIterationCount: 'infinite',
              animationName: 'navet-load-orb-water-drift',
              animationTimingFunction: 'ease-in-out',
              backgroundColor: getLoadOrbDotColor({
                angle: dot.angle,
                generatedColor,
                importColor,
                segments: orbSegments,
              }),
              height: dot.size,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: dot.size,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className={`text-4xl font-semibold tracking-tight ${surface.textPrimary}`}>
          {loadW}
        </div>
        <div className={`text-sm font-medium ${surface.textSecondary}`}>Watts now</div>
        <div className={`mt-1 text-xs ${surface.textMuted}`}>
          {formatEnergyValue(todayKWh)} kWh today
        </div>
      </div>
    </div>
  );
}

function DeviceTable({
  accentColor,
  consumers,
  generatedColor,
  generatedTodayKWh,
  gridImportTodayKWh,
  homeAssistantEnergyUrl,
  importColor,
  importedTodayLabel,
  loadW,
  openLabel,
  generatedTodayLabel,
  sourceDiagnostics,
  surface,
}: {
  accentColor: string;
  consumers: EnergyConsumer[];
  generatedColor: string;
  generatedTodayKWh: number;
  gridImportTodayKWh: number;
  homeAssistantEnergyUrl: string | null;
  importColor: string;
  importedTodayLabel: string;
  loadW: number;
  openLabel: string;
  generatedTodayLabel: string;
  sourceDiagnostics: EnergySourceDiagnostic[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme } = useTheme();
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);
  const unavailableDevices = getUnavailableDeviceDiagnostics(consumers, sourceDiagnostics);
  const [contentView, setContentView] = useState<'devices' | 'sources'>('devices');
  const useSplitOrbLayout = dashboardSpaceMode === 'more_space';
  const contentLayoutClassName = useSplitOrbLayout
    ? 'grid gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]'
    : 'grid gap-8 p-5 2xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]';
  const tableOrderClassName = useSplitOrbLayout
    ? 'order-2 flex min-w-0 flex-col lg:order-1'
    : 'order-2 flex min-w-0 flex-col 2xl:order-1';
  const orbPaneClassName = useSplitOrbLayout
    ? `order-1 min-w-0 border-b pb-5 lg:order-2 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-6 ${surface.border}`
    : `order-1 min-w-0 border-b pb-5 2xl:order-2 2xl:border-b-0 2xl:border-l 2xl:pb-0 2xl:pl-6 ${surface.border}`;
  const rowDividerClassName =
    theme === 'light'
      ? 'bg-slate-300/90'
      : theme === 'glass'
        ? 'bg-white/20'
        : theme === 'black'
          ? 'bg-white/10'
          : 'bg-white/14';

  return (
    <BaseCard size="medium" fullBleed className="min-w-0 w-full" surfaceVariant="muted">
      <div
        data-testid="energy-live-layout"
        data-space-mode={dashboardSpaceMode}
        className={contentLayoutClassName}
      >
        <div className={tableOrderClassName}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
                Live Energy
              </h2>
              <p
                className={`mt-1 max-w-xl ${navetTypographyTokens.bodyCompact} ${surface.textSecondary}`}
              >
                See which devices are driving demand.
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <InteractivePill
                active={contentView === 'devices'}
                aria-pressed={contentView === 'devices'}
                size="compact"
                onClick={() => setContentView('devices')}
              >
                Devices
              </InteractivePill>
              <InteractivePill
                active={contentView === 'sources'}
                aria-pressed={contentView === 'sources'}
                size="compact"
                onClick={() => setContentView('sources')}
              >
                Sources
              </InteractivePill>
            </div>
            <div className={`hidden h-6 w-px shrink-0 md:block ${rowDividerClassName}`} />
            <MinimalStat
              label="Imported today"
              value={importedTodayLabel}
              dotColor={heroLegendColors.gridImport}
              className="min-w-[12.5rem]"
              surfaceText={surface.textSecondary}
            />
            {generatedTodayKWh > 0 ? (
              <MinimalStat
                label="Generated today"
                value={generatedTodayLabel}
                dotColor={heroLegendColors.generated}
                className="min-w-[13rem]"
                surfaceText={surface.textSecondary}
              />
            ) : null}
          </div>
          <div
            className={`min-h-0 flex-1 overflow-hidden rounded-[22px] border ${surface.border} ${surface.panelMuted}`}
          >
            {contentView === 'devices' ? (
              consumers.length === 0 ? (
                <div className={`px-4 py-5 text-sm ${surface.textMuted}`}>
                  No available device usage has been reported yet.
                </div>
              ) : (
                <>
                  <div
                    className={`hidden grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] items-center gap-3 px-4 pt-3 pb-2 text-xs font-medium sm:grid ${surface.textMuted}`}
                  >
                    <div>Device</div>
                    <div className="text-right">Now</div>
                    <div className="text-right">Today</div>
                    <div className="text-right">Status</div>
                  </div>
                  {consumers.map((consumer, index) => (
                    <div
                      key={consumer.id}
                      className={`grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] sm:items-center ${
                        index % 2 === 0 ? surface.subtleBg : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: getEnergyConsumerColor(consumer) }}
                            />
                            <div className={`truncate font-medium ${surface.textPrimary}`}>
                              {consumer.name}
                            </div>
                          </div>
                          <div className={`truncate text-xs sm:block ${surface.textMuted}`}>
                            {getDeviceUsageSubtitle(consumer, gridImportTodayKWh)}
                          </div>
                        </div>
                        <div className="flex shrink-0 justify-end sm:hidden">
                          <DeviceStatusSwitch accentColor={accentColor} status={consumer.status} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:contents">
                        <div className="min-w-0">
                          <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                            Now
                          </div>
                          <div className={`font-medium sm:text-right ${surface.textPrimary}`}>
                            {formatPowerValue(consumer.powerW)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                            Today
                          </div>
                          <div className={`sm:text-right ${surface.textSecondary}`}>
                            {formatTrackedEnergyValue(consumer.energyKWh)}
                          </div>
                        </div>
                      </div>
                      <div className="hidden justify-end sm:flex">
                        <DeviceStatusSwitch accentColor={accentColor} status={consumer.status} />
                      </div>
                    </div>
                  ))}
                </>
              )
            ) : (
              <SourceDiagnostics
                accentColor={accentColor}
                compact
                hideHeader
                homeAssistantEnergyUrl={homeAssistantEnergyUrl}
                openLabel={openLabel}
                sources={sourceDiagnostics}
                surface={surface}
              />
            )}
            {contentView === 'devices' && unavailableDevices.length > 0 ? (
              <div className={`border-t ${surface.border}`}>
                {unavailableDevices.map((device, index) => (
                  <div
                    key={device.id}
                    className={`grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] sm:items-center ${
                      consumers.length === 0 && index % 2 === 0 ? surface.subtleBg : ''
                    }`}
                  >
                    <div className="min-w-0 sm:col-span-2">
                      <div className={`truncate font-medium ${surface.textSecondary}`}>
                        {device.label}
                      </div>
                      <div className={`truncate text-xs ${surface.textMuted}`}>Unavailable</div>
                    </div>
                    <div className={`hidden text-right text-sm sm:block ${surface.textMuted}`}>
                      -
                    </div>
                    <div className={`text-xs font-medium sm:text-right ${surface.textMuted}`}>
                      Unavailable
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div
            className={`mt-4 flex items-start gap-2 text-xs leading-relaxed ${surface.textMuted}`}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {contentView === 'devices'
                ? 'Wrong sensors or missing sources should be corrected in Home Assistant Energy.'
                : 'Source selection is managed in Home Assistant Energy.'}
            </p>
          </div>
        </div>

        <div className={orbPaneClassName}>
          <div className="mb-4">
            <h3 className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
              Import Attribution
            </h3>
            <p className={`mt-1 ${navetTypographyTokens.bodyCompact} ${surface.textSecondary}`}>
              Orange shows import that is still unattributed, green shows export, and each device
              color marks tracked import usage.
            </p>
          </div>
          <div className="mx-auto flex max-w-[24rem] justify-center">
            <LoadOrb
              consumers={consumers}
              generatedColor={generatedColor}
              generatedTodayKWh={generatedTodayKWh}
              loadW={loadW}
              todayKWh={gridImportTodayKWh}
              importColor={importColor}
              surface={surface}
            />
          </div>
        </div>
      </div>
    </BaseCard>
  );
}

function getDeviceUsageSubtitle(consumer: EnergyConsumer, gridImportTodayKWh: number) {
  if (consumer.status === 'active') {
    return `Active · ${formatEnergyPercent(consumer.shareOfLoad * 100)}% of live load`;
  }

  if (consumer.energyKWh > 0) {
    const gridShare =
      gridImportTodayKWh > 0
        ? formatEnergyPercent((consumer.energyKWh / gridImportTodayKWh) * 100)
        : null;
    return gridShare
      ? `Idle · ${gridShare}% of grid consumed today`
      : `Idle · ${formatTrackedEnergyValue(consumer.energyKWh)} today`;
  }

  return 'Idle · no live draw';
}

function formatPowerValue(powerW: number) {
  return `${Math.round(powerW)} W`;
}

function formatTrackedEnergyValue(energyKWh: number) {
  if (energyKWh > 0 && energyKWh < 1) {
    return `${Math.round(energyKWh * 1000)} Wh`;
  }

  return `${formatEnergyValue(energyKWh)} kWh`;
}

function getUnavailableDeviceDiagnostics(
  consumers: EnergyConsumer[],
  sourceDiagnostics: EnergySourceDiagnostic[]
) {
  const visibleConsumerIds = new Set(consumers.map((consumer) => consumer.id));
  return sourceDiagnostics.filter(
    (source) =>
      source.id.startsWith('device:') &&
      source.status === 'configured_unavailable' &&
      source.entityId &&
      !visibleConsumerIds.has(source.entityId)
  );
}

function DeviceStatusSwitch({
  accentColor,
  status,
}: {
  accentColor: string;
  status: EnergyConsumer['status'];
}) {
  return (
    <span
      className="inline-flex h-5 w-9 items-center rounded-full bg-white/18 p-0.5"
      style={status === 'active' ? { backgroundColor: `${accentColor}cc` } : undefined}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition-transform ${
          status === 'active' ? 'translate-x-4' : ''
        }`}
      />
    </span>
  );
}

function SourceDiagnostics({
  accentColor,
  compact = false,
  hideHeader = false,
  homeAssistantEnergyUrl,
  openLabel,
  sources,
  surface,
}: {
  accentColor: string;
  compact?: boolean;
  hideHeader?: boolean;
  homeAssistantEnergyUrl: string | null;
  openLabel: string;
  sources: EnergySourceDiagnostic[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme } = useTheme();
  const sourceRows = getSourceDiagnostics(sources);
  const sectionStyle = getInheritedDialogSectionStyle(theme, accentColor, accentColor);
  const rowDividerClassName = theme === 'light' ? 'border-slate-200/80' : surface.border;
  const sectionClassName =
    theme === 'light'
      ? 'bg-white/60'
      : theme === 'glass'
        ? 'bg-white/[0.03]'
        : theme === 'black'
          ? 'bg-white/[0.02]'
          : 'bg-white/[0.025]';

  return (
    <div data-testid="energy-sources-card" className="w-full">
      {!hideHeader ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <EntityCardHeaderIcon
                IconComponent={Zap}
                isActive
                size="medium"
                tone="primary"
                baseColor={accentColor}
              />
              <div className={`text-base font-semibold ${surface.textPrimary}`}>Sources</div>
            </div>
            <p className={`mt-1 text-sm ${surface.textMuted}`}>
              Manage source selection in Home Assistant Energy
            </p>
          </div>
          {homeAssistantEnergyUrl ? (
            <a
              href={homeAssistantEnergyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                theme === 'light' ? 'bg-white/88 hover:bg-white' : 'bg-black/18 hover:bg-black/24'
              }`}
              style={{
                borderColor: `${accentColor}${theme === 'light' ? '33' : '29'}`,
                color: accentColor,
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{openLabel}</span>
            </a>
          ) : null}
        </div>
      ) : null}
      <div
        className={`grid gap-2 overflow-hidden ${
          hideHeader
            ? `px-4 ${compact ? 'py-3' : 'py-4'}`
            : `rounded-[1.25rem] border px-3 ${compact ? 'py-3' : 'py-4'}`
        } ${hideHeader ? '' : `${surface.border} ${sectionClassName}`}`}
        style={sectionStyle}
      >
        {sourceRows.map((source) => (
          <div
            key={source.id}
            className={`flex min-w-0 items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0 text-sm ${rowDividerClassName}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <SourceIcon source={source} accentColor={accentColor} />
              <div className="min-w-0">
                <div className={`truncate font-medium ${surface.textPrimary}`}>{source.label}</div>
                <div className={`truncate text-xs ${surface.textMuted}`}>
                  {source.entityId ?? source.liveEntityId}
                </div>
              </div>
            </div>
            <div
              className={`shrink-0 text-right text-xs font-medium ${
                source.status === 'configured_unavailable'
                  ? theme === 'light'
                    ? 'text-amber-700'
                    : 'text-amber-200'
                  : surface.textSecondary
              }`}
            >
              {formatDiagnosticStatus(source)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceIcon({
  accentColor,
  source,
}: {
  accentColor: string;
  source: EnergySourceDiagnostic;
}) {
  const { theme } = useTheme();
  const iconWrapClassName =
    source.status === 'configured_unavailable'
      ? theme === 'light'
        ? 'bg-amber-100'
        : 'bg-amber-300/16'
      : source.id === 'grid-import'
        ? theme === 'light'
          ? 'bg-orange-100'
          : 'bg-orange-400/16'
        : source.id === 'grid-export'
          ? theme === 'light'
            ? 'bg-amber-100'
            : 'bg-amber-300/16'
          : source.id === 'solar'
            ? theme === 'light'
              ? 'bg-yellow-100'
              : 'bg-yellow-300/16'
            : source.id === 'gas'
              ? theme === 'light'
                ? 'bg-red-100'
                : 'bg-red-400/16'
              : theme === 'light'
                ? 'bg-emerald-100'
                : 'bg-emerald-400/16';

  const iconClassName = 'h-3.5 w-3.5 shrink-0';
  const iconNode =
    source.status === 'configured_unavailable' ? (
      <AlertTriangle
        className={`${iconClassName} ${theme === 'light' ? 'text-amber-700' : 'text-amber-200'}`}
      />
    ) : source.id === 'grid-import' ? (
      <Zap className={iconClassName} style={{ color: accentColor }} />
    ) : source.id === 'grid-export' ? (
      <PlugZap
        className={`${iconClassName} ${theme === 'light' ? 'text-amber-700' : 'text-amber-200'}`}
      />
    ) : source.id === 'solar' ? (
      <Sun className={iconClassName} style={{ color: themeColorValues.yellow }} />
    ) : source.id === 'gas' ? (
      <Flame className={iconClassName} style={{ color: themeColorValues.red }} />
    ) : (
      <Leaf className={iconClassName} style={{ color: themeColorValues.green }} />
    );

  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconWrapClassName}`}
    >
      {iconNode}
    </div>
  );
}

function getSourceDiagnostics(sourceDiagnostics: EnergySourceDiagnostic[]) {
  return sourceDiagnostics.filter((source) => !source.id.startsWith('device:'));
}

function formatDiagnosticStatus(source: EnergySourceDiagnostic) {
  if (source.status === 'configured_unavailable') {
    return 'Unavailable';
  }

  if (source.status === 'configured_idle') {
    return 'Idle';
  }

  if (source.status === 'not_configured') {
    return 'Not configured';
  }

  if (typeof source.currentPowerW === 'number' && source.currentPowerW > 0) {
    return `${Math.round(source.currentPowerW)} W`;
  }

  if (typeof source.todayKWh === 'number') {
    return `${source.todayKWh.toFixed(1)} kWh`;
  }

  return 'Available';
}

function resolveHomeAssistantEnergyUrl(haBaseUrl: string | null): string | null {
  const energyPath = '/config/energy/dashboard';

  if (haBaseUrl) {
    try {
      return new URL(energyPath, haBaseUrl).toString();
    } catch {
      return energyPath;
    }
  }

  if (typeof window !== 'undefined' && window.location.pathname.includes('/api/hassio_ingress/')) {
    return energyPath;
  }

  return null;
}

function getLoadOrbMotionIntensity(loadW: number) {
  return Math.max(0.7, Math.min(1.9, 0.82 + loadW / 2200));
}

function buildOrbDots(motionIntensity = 1) {
  const dots: Array<{
    angle: number;
    delayS: number;
    driftX: number;
    driftY: number;
    durationS: number;
    id: string;
    opacity: number;
    ring: number;
    size: number;
    x: number;
    y: number;
  }> = [];
  const spokeCount = 26;

  for (let ring = 0; ring < 5; ring += 1) {
    const radius = 84 + ring * 21;
    const driftAmplitude = Math.max(1.4, 2.3 - ring * 0.18) * motionIntensity;
    const durationScale = Math.max(0.62, 1.18 - (motionIntensity - 0.7) * 0.28);
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = (index / spokeCount) * Math.PI * 2 - Math.PI / 2;
      const durationBase = LOAD_ORB_DRIFT_BASE_DURATION_S + ring * 0.4 + (index % 4) * 0.18;
      dots.push({
        angle,
        delayS: -((index / spokeCount) * durationBase * durationScale),
        driftX: Math.cos(angle) * driftAmplitude,
        driftY: Math.sin(angle) * driftAmplitude,
        durationS: durationBase * durationScale,
        id: `${ring}:${index}`,
        opacity: 0.92 - ring * 0.08,
        ring,
        size: 6.2 + (4 - ring) * 0.7,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
  }

  return dots;
}

function getLoadOrbDotColor({
  angle,
  generatedColor,
  importColor,
  segments,
}: {
  angle: number;
  generatedColor: string;
  importColor: string;
  segments: LoadOrbSegment[];
}) {
  const progress = (angle + Math.PI) / (Math.PI * 2);

  for (const segment of segments) {
    if (progress <= segment.end) {
      if (segment.kind === 'export') {
        return generatedColor;
      }
      if (segment.kind === 'import') {
        return importColor;
      }
      return segment.color;
    }
  }

  return importColor;
}

interface LoadOrbSegment {
  color: string;
  end: number;
  kind: 'device' | 'export' | 'import';
  start: number;
}

function getLoadOrbSegments({
  consumers,
  exportedKWh,
  importedKWh,
}: {
  consumers: EnergyConsumer[];
  exportedKWh: number;
  importedKWh: number;
}): LoadOrbSegment[] {
  const exported = Math.max(0, exportedKWh);
  const imported = Math.max(0, importedKWh);
  const trackedConsumers = consumers
    .filter((consumer) => consumer.energyKWh > 0)
    .sort((left, right) => right.energyKWh - left.energyKWh);
  const trackedTotal = trackedConsumers.reduce((sum, consumer) => sum + consumer.energyKWh, 0);
  const deviceTracked = Math.min(trackedTotal, imported);
  const remainingImport = Math.max(0, imported - deviceTracked);
  const total = exported + remainingImport + deviceTracked;

  if (total <= 0) {
    return [{ kind: 'import', color: '', start: 0, end: 1 }];
  }

  const segmentInputs: Array<{
    color: string;
    kind: LoadOrbSegment['kind'];
    value: number;
  }> = [];

  if (exported > 0) {
    segmentInputs.push({ kind: 'export', color: '', value: exported });
  }

  if (remainingImport > 0) {
    segmentInputs.push({ kind: 'import', color: '', value: remainingImport });
  }

  const trackedScale = trackedTotal > 0 ? deviceTracked / trackedTotal : 0;
  for (const consumer of trackedConsumers) {
    const value = consumer.energyKWh * trackedScale;
    if (value <= 0) {
      continue;
    }
    segmentInputs.push({
      kind: 'device',
      color: getEnergyConsumerColor(consumer),
      value,
    });
  }

  const minVisibleShare = 0.035;
  const reserved = segmentInputs.length * minVisibleShare;
  const flexible = Math.max(0, 1 - reserved);
  let cursor = 0;

  return segmentInputs.map((segment) => {
    const share = minVisibleShare + (segment.value / total) * flexible;
    const start = cursor;
    cursor += share;
    return {
      color: segment.color,
      kind: segment.kind,
      start,
      end: Math.min(1, cursor),
    };
  });
}

function getEnergyConsumerColor(consumer: EnergyConsumer) {
  const seed = `${consumer.id}:${consumer.name}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const palette = [
    '#60a5fa',
    '#a78bfa',
    '#f472b6',
    '#38bdf8',
    '#e879f9',
    '#fb7185',
    '#818cf8',
    '#22d3ee',
    '#c084fc',
    '#f9a8d4',
  ] as const;
  return palette[hash % palette.length];
}
