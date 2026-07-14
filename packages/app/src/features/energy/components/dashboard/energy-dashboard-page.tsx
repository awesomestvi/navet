import { useAuthBaseUrl } from '@navet/app/auth/AuthProvider';
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
import { DashboardCardItem } from '@navet/app/features/dashboard/components/dashboard-card-item';
import { DashboardResizeTrigger } from '@navet/app/features/dashboard/components/dashboard-edit-actions';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import type { CustomCard } from '@navet/app/features/dashboard/stores/custom-cards-store';
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
  Sun,
  SunMedium,
  UtilityPole,
  Zap,
} from 'lucide-react';
import {
  type CSSProperties,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { EnergyNowCardView } from '../widgets/energy-now-card-view';
import { EnergyInsightCard } from './energy-insight-card';

interface EnergyDashboardPageProps {
  dashboard: EnergyDashboardModel;
  sourceDiagnostics: EnergySourceDiagnostic[];
  energyCustomCards?: CustomCard[];
  energyOrderedCardIds?: string[];
  isEditMode?: boolean;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
}
const ENERGY_CONSUMER_COLORS = [
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#d946ef',
  '#06b6d4',
  '#f43f5e',
  '#84cc16',
  '#8b5cf6',
  '#eab308',
  '#14b8a6',
] as const;
const UNTRACKED_CONSUMPTION_COLOR = '#94a3b8';
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
  onDeleteCard,
  onUpdateCard,
}: EnergyDashboardPageProps) {
  const { t } = useI18n();
  const haBaseUrl = useAuthBaseUrl();
  const { theme, accentColor } = useTheme();
  const [uncontrolledEditMode] = useState(false);
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
  const liveWatts = Math.round(filteredDashboard.totals.currentLoadW);
  const importedTodayLabel = `${formatEnergyValue(dashboard.totals.importTodayKWh)} kWh`;
  const generatedTodayLabel = `${formatEnergyValue(dashboard.totals.solarTodayKWh)} kWh`;
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
  return (
    <div className="space-y-5">
      <section>
        <DeviceTable
          accentColor={accentColor}
          consumers={filteredDashboard.topConsumers}
          generatedTodayKWh={dashboard.totals.solarTodayKWh}
          homeAssistantEnergyUrl={homeAssistantEnergyUrl}
          loadW={liveWatts}
          openLabel={t('common.open')}
          importedTodayLabel={importedTodayLabel}
          generatedTodayLabel={generatedTodayLabel}
          sourceDiagnostics={sourceDiagnostics}
          surface={surface}
          totalConsumptionTodayKWh={dashboard.ranges[dashboard.selectedRange].totalUsageKWh}
        />
      </section>

      {dashboard.explanations.length > 0 ? (
        <section className="space-y-3" aria-label={t('energy.explainability.title')}>
          <div className="flex flex-col gap-1">
            <h2 className={`text-base font-semibold ${surface.textPrimary}`}>
              {t('energy.explainability.title')}
            </h2>
            <p className={`text-sm ${surface.textSecondary}`}>
              {t('energy.explainability.description')}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {dashboard.explanations.map((explanation) => (
              <EnergyInsightCard
                key={explanation.id}
                title={explanation.title}
                description={explanation.description}
                severity={explanation.tone === 'warn' ? 'warning' : 'default'}
              />
            ))}
          </div>
        </section>
      ) : null}

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
  const [consumerTrends, setConsumerTrends] = useState<Record<string, EnergySeriesPoint[]>>({});
  const handleConsumerTrendChange = useCallback(
    (consumerId: string, points: EnergySeriesPoint[]) => {
      setConsumerTrends((current) =>
        current[consumerId] === points ? current : { ...current, [consumerId]: points }
      );
    },
    []
  );
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols, false);
  const wholeHomeCardSize = resolveSparklineCardSize(
    cardSizes[ENERGY_WHOLE_HOME_SPARKLINE_CARD_ID]
  );
  const trackedTodayKWh = consumers.reduce(
    (total, consumer) => total + Math.max(0, consumer.energyKWh),
    0
  );
  const trackedCurrentW = consumers.reduce(
    (total, consumer) => total + Math.max(0, consumer.powerW),
    0
  );
  const untrackedTodayKWh = wholeHomeTodayKWh - trackedTodayKWh;
  const untrackedCurrentW = Math.max(0, wholeHomeCurrentW - trackedCurrentW);
  const untrackedTrend = buildUntrackedTrend({
    consumerTrends,
    consumers,
    wholeHomeCurrentW,
    wholeHomePoints,
  });

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
            {untrackedTodayKWh > 0 ? (
              <SparklineCardFrame
                accentColor={accentColor}
                cardSize={wholeHomeCardSize}
                isEditMode={isEditMode}
                onSizeChange={(size) => onSizeChange(ENERGY_WHOLE_HOME_SPARKLINE_CARD_ID, size)}
                theme={theme}
              >
                <EnergyNowCardView
                  accentColor={accentColor}
                  currentLoadW={untrackedCurrentW}
                  size={wholeHomeCardSize}
                  title="Untracked"
                  todayUsageKWh={untrackedTodayKWh}
                  trend={untrackedTrend}
                />
              </SparklineCardFrame>
            ) : null}
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
                onTrendChange={handleConsumerTrendChange}
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
  onTrendChange,
  theme,
}: {
  accentColor: string;
  cardSize: Extract<CardSize, 'small' | 'medium' | 'large'>;
  consumer: EnergyConsumer;
  enabled: boolean;
  isEditMode: boolean;
  onHideConsumer: (consumerId: string) => void;
  onSizeChange: (cardId: string, size: CardSize) => void;
  onTrendChange: (consumerId: string, points: EnergySeriesPoint[]) => void;
  theme: ThemeType;
}) {
  const points = useEnergyLoadHistory(consumer.powerEntityId, consumer.powerW, enabled);
  const cardId = getEnergyConsumerSparklineCardId(consumer.id);

  useEffect(() => {
    onTrendChange(consumer.id, points);
  }, [consumer.id, onTrendChange, points]);

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

export function buildUntrackedTrend({
  consumerTrends,
  consumers,
  wholeHomeCurrentW,
  wholeHomePoints,
}: {
  consumerTrends: Readonly<Record<string, EnergySeriesPoint[]>>;
  consumers: EnergyConsumer[];
  wholeHomeCurrentW: number;
  wholeHomePoints: EnergySeriesPoint[];
}) {
  const latestWholeHomeValue = wholeHomePoints.at(-1)?.value ?? 0;
  const wholeHomeScale = latestWholeHomeValue > 0 ? wholeHomeCurrentW / latestWholeHomeValue : 0;

  return wholeHomePoints.map((point, pointIndex) => {
    const wholeHomePowerW = point.value * wholeHomeScale;
    const trackedPowerW = consumers.reduce((total, consumer) => {
      const trend = consumerTrends[consumer.id] ?? [];
      if (trend.length === 0) {
        return total + Math.max(0, consumer.powerW);
      }

      const alignedIndex =
        wholeHomePoints.length <= 1
          ? trend.length - 1
          : Math.round((pointIndex / (wholeHomePoints.length - 1)) * (trend.length - 1));
      const alignedValue = trend[alignedIndex]?.value ?? 0;
      const latestValue = trend.at(-1)?.value ?? 0;
      const trendScale = latestValue > 0 ? Math.max(0, consumer.powerW) / latestValue : 0;

      return total + Math.max(0, alignedValue * trendScale);
    }, 0);

    return {
      ...point,
      value: Math.max(0, wholeHomePowerW - trackedPowerW),
      minValue: undefined,
      maxValue: undefined,
    };
  });
}

function MinimalStat({
  icon,
  label,
  value,
  className = '',
  surfaceText,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
  surfaceText: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${surfaceText} ${className}`}>
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function LoadOrb({
  consumerColors,
  consumers,
  loadW,
  surface,
  untrackedPowerW,
  untrackedTodayKWh,
}: {
  consumerColors: ReadonlyMap<string, string>;
  consumers: EnergyConsumer[];
  loadW: number;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  untrackedPowerW: number;
  untrackedTodayKWh: number;
}) {
  const motionIntensity = getLoadOrbMotionIntensity(loadW);
  const dots = buildOrbDots(motionIntensity);
  const orbSegments = getLoadOrbSegments({
    consumerColors,
    consumers,
    untrackedPowerW,
  });
  const consumedTodayKWh =
    consumers.reduce((total, consumer) => total + Math.max(0, consumer.energyKWh), 0) +
    untrackedTodayKWh;

  return (
    <div className="relative flex min-h-[24rem] min-w-0 items-center justify-center overflow-visible px-2 py-4">
      <style>{LOAD_ORB_RIPPLE_KEYFRAMES}</style>
      <div className="absolute inset-0" aria-hidden="true">
        {orbSegments.length > 0
          ? dots.map((dot) => (
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
                    segments: orbSegments,
                  }),
                  height: dot.size,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: dot.size,
                }}
              />
            ))
          : null}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className={`text-4xl font-semibold tracking-tight ${surface.textPrimary}`}>
          {loadW}
        </div>
        <div className={`text-sm font-medium ${surface.textSecondary}`}>Watts now</div>
        <div className={`mt-1 text-xs ${surface.textMuted}`} data-testid="load-orb-consumption">
          {formatEnergyValue(consumedTodayKWh)} kWh today
        </div>
      </div>
    </div>
  );
}

function DeviceTable({
  accentColor,
  consumers,
  generatedTodayKWh,
  homeAssistantEnergyUrl,
  importedTodayLabel,
  loadW,
  openLabel,
  generatedTodayLabel,
  sourceDiagnostics,
  surface,
  totalConsumptionTodayKWh,
}: {
  accentColor: string;
  consumers: EnergyConsumer[];
  generatedTodayKWh: number;
  homeAssistantEnergyUrl: string | null;
  importedTodayLabel: string;
  loadW: number;
  openLabel: string;
  generatedTodayLabel: string;
  sourceDiagnostics: EnergySourceDiagnostic[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  totalConsumptionTodayKWh: number;
}) {
  const { theme } = useTheme();
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);
  const unavailableDevices = getUnavailableDeviceDiagnostics(consumers, sourceDiagnostics);
  const consumerColors = useMemo(() => buildEnergyConsumerColorMap(consumers), [consumers]);
  const trackedConsumptionTodayKWh = useMemo(
    () => consumers.reduce((total, consumer) => total + Math.max(0, consumer.energyKWh), 0),
    [consumers]
  );
  const untrackedTodayKWh = Math.max(0, totalConsumptionTodayKWh - trackedConsumptionTodayKWh);
  const trackedPowerW = consumers.reduce(
    (total, consumer) => total + Math.max(0, consumer.powerW),
    0
  );
  const untrackedPowerW = Math.max(0, loadW - trackedPowerW);
  const [contentView, setContentView] = useState<'devices' | 'sources'>('devices');
  const useSplitOrbLayout = dashboardSpaceMode === 'more_space';
  const contentLayoutClassName = useSplitOrbLayout
    ? 'grid gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]'
    : 'grid gap-8 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]';
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
        <div className="flex min-w-0 flex-col">
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
              icon={<UtilityPole aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
              label="Imported today"
              value={importedTodayLabel}
              className="min-w-[12.5rem]"
              surfaceText={surface.textSecondary}
            />
            {generatedTodayKWh > 0 ? (
              <MinimalStat
                icon={<SunMedium aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                label="Generated today"
                value={generatedTodayLabel}
                className="min-w-[13rem]"
                surfaceText={surface.textSecondary}
              />
            ) : null}
          </div>
          <div
            className={`min-h-0 flex-1 overflow-hidden rounded-[22px] border ${surface.border} ${surface.panelMuted}`}
          >
            {contentView === 'devices' ? (
              consumers.length === 0 && untrackedTodayKWh <= 0 ? (
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
                              style={{ backgroundColor: consumerColors.get(consumer.id) }}
                            />
                            <div className={`truncate font-medium ${surface.textPrimary}`}>
                              {consumer.name}
                            </div>
                          </div>
                          <div className={`truncate text-xs sm:block ${surface.textMuted}`}>
                            {getDeviceUsageSubtitle(consumer, trackedConsumptionTodayKWh)}
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
                  {untrackedTodayKWh > 0 ? (
                    <div
                      className={`grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] sm:items-center ${
                        consumers.length % 2 === 0 ? surface.subtleBg : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: UNTRACKED_CONSUMPTION_COLOR }}
                          />
                          <div className={`truncate font-medium ${surface.textPrimary}`}>
                            Untracked
                          </div>
                        </div>
                        <div className={`truncate text-xs ${surface.textMuted}`}>
                          Not assigned to a tracked device
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                          Now
                        </div>
                        <div className={`font-medium sm:text-right ${surface.textPrimary}`}>
                          {formatPowerValue(untrackedPowerW)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                          Today
                        </div>
                        <div className={`sm:text-right ${surface.textSecondary}`}>
                          {formatTrackedEnergyValue(untrackedTodayKWh)}
                        </div>
                      </div>
                      <div className={`text-xs font-medium sm:text-right ${surface.textMuted}`}>
                        Untracked
                      </div>
                    </div>
                  ) : null}
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

        <div className="flex min-w-0 items-center justify-center">
          <div className="flex w-full max-w-[24rem] justify-center">
            <LoadOrb
              consumerColors={consumerColors}
              consumers={consumers}
              loadW={loadW}
              surface={surface}
              untrackedPowerW={untrackedPowerW}
              untrackedTodayKWh={untrackedTodayKWh}
            />
          </div>
        </div>
      </div>
    </BaseCard>
  );
}

function getDeviceUsageSubtitle(consumer: EnergyConsumer, trackedConsumptionTodayKWh: number) {
  const statusLabel = consumer.status === 'active' ? 'Active' : 'Idle';

  if (consumer.energyKWh > 0) {
    const consumptionShare =
      trackedConsumptionTodayKWh > 0
        ? formatEnergyPercent((consumer.energyKWh / trackedConsumptionTodayKWh) * 100)
        : null;
    return consumptionShare
      ? `${statusLabel} · ${consumptionShare}% of consumption today`
      : `${statusLabel} · ${formatTrackedEnergyValue(consumer.energyKWh)} today`;
  }

  return `${statusLabel} · no consumption today`;
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

function getLoadOrbDotColor({ angle, segments }: { angle: number; segments: LoadOrbSegment[] }) {
  const progress = (angle + Math.PI) / (Math.PI * 2);

  for (const segment of segments) {
    if (progress <= segment.end) {
      return segment.color;
    }
  }

  return segments.at(-1)?.color ?? 'transparent';
}

interface LoadOrbSegment {
  color: string;
  end: number;
}

function getLoadOrbSegments({
  consumerColors,
  consumers,
  untrackedPowerW,
}: {
  consumerColors: ReadonlyMap<string, string>;
  consumers: EnergyConsumer[];
  untrackedPowerW: number;
}): LoadOrbSegment[] {
  const trackedConsumers = consumers
    .filter((consumer) => consumer.status === 'active' && consumer.powerW > 0)
    .sort((left, right) => right.powerW - left.powerW);
  const trackedTotal = trackedConsumers.reduce((sum, consumer) => sum + consumer.powerW, 0);
  const totalConsumption = trackedTotal + untrackedPowerW;

  if (totalConsumption <= 0) {
    return [];
  }

  const segmentInputs: Array<{
    color: string;
    value: number;
  }> = [];

  if (untrackedPowerW > 0) {
    segmentInputs.push({
      color: UNTRACKED_CONSUMPTION_COLOR,
      value: untrackedPowerW,
    });
  }

  for (const consumer of trackedConsumers) {
    segmentInputs.push({
      color: consumerColors.get(consumer.id) ?? ENERGY_CONSUMER_COLORS[0],
      value: consumer.powerW,
    });
  }

  const minVisibleShare = 0.035;
  const reserved = segmentInputs.length * minVisibleShare;
  const flexible = Math.max(0, 1 - reserved);
  let cursor = 0;

  return segmentInputs.map((segment) => {
    const share = minVisibleShare + (segment.value / totalConsumption) * flexible;
    cursor += share;
    return {
      color: segment.color,
      end: Math.min(1, cursor),
    };
  });
}

function buildEnergyConsumerColorMap(consumers: EnergyConsumer[]) {
  return new Map(
    consumers.map((consumer, index) => [
      consumer.id,
      ENERGY_CONSUMER_COLORS[index % ENERGY_CONSUMER_COLORS.length],
    ])
  );
}
