import { BorderBeam } from '@website/components/magicui/border-beam';
import { useCallback, useEffect, useRef } from 'react';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { cn } from '@/app/components/ui/utils';
import { CalendarCard } from '@/app/features/calendar';
import { HVACCard } from '@/app/features/climate';
import { NoteWidget, PhotoFrameWidget } from '@/app/features/dashboard/components/widgets';
import { BatteryOverviewWidget } from '@/app/features/dashboard/components/widgets/battery-overview-widget';
import { MapWidget } from '@/app/features/dashboard/components/widgets/map-widget';
import { EnergyNowCardView } from '@/app/features/energy';
import { FanCard, LightCard, SwitchCard } from '@/app/features/lighting';
import { MediaCard } from '@/app/features/media';
import { PersonCard } from '@/app/features/person';
import { RSSFeedCardView } from '@/app/features/rss/components/rss-feed-card/view';
import { SceneCard } from '@/app/features/scenes';
import { CoverCard, LockCard } from '@/app/features/security';
import { GroupedSensorCard, InfoCard } from '@/app/features/sensors';
import { VacuumCard } from '@/app/features/vacuum';
import { WeatherCard } from '@/app/features/weather';
import { useTheme } from '@/app/hooks';
import {
  MARKETING_BENTO_CARDS,
  MARKETING_BENTO_ENERGY_TREND,
  MARKETING_BENTO_RSS_ITEMS,
  MARKETING_BENTO_RSS_PROVIDERS,
  MARKETING_BENTO_WIDGETS,
  MARKETING_PREVIEW_CARDS,
} from '@/app/marketing/data/marketingDemoData';
import { MarketingSectionShell } from '@/app/marketing/shell/MarketingSectionShell';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { type BentoCardKey, getMarketingBentoCardSize } from './bento-card-size';

const noopCardSizeChange = () => undefined;
const BENTO_GAP_PX = 12;
const BENTO_GRID_GAP_PX = 12;
const BENTO_SMALL_CARD_WIDTH_PX = 208;
const BENTO_SMALL_CARD_HEIGHT_PX = 176;
const BENTO_MICRO_COLUMN_WIDTH_PX = (BENTO_SMALL_CARD_WIDTH_PX - BENTO_GRID_GAP_PX) / 2;
const BENTO_ROW_HEIGHT_PX = (BENTO_SMALL_CARD_HEIGHT_PX - BENTO_GRID_GAP_PX) / 2;

type BentoPlacement = {
  cardKey: BentoCardKey;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
};

type BentoBoard = {
  id: string;
  microColumns: 4 | 8;
  cards: readonly BentoPlacement[];
};

type BentoSequenceCard = BentoPlacement & {
  boardId: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const BENTO_BOARDS: readonly BentoBoard[] = [
  {
    id: 'headline',
    microColumns: 8,
    cards: [
      { cardKey: 'weather', colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 4 },
      { cardKey: 'media', colStart: 5, colSpan: 4, rowStart: 1, rowSpan: 2 },
      { cardKey: 'rss', colStart: 5, colSpan: 4, rowStart: 3, rowSpan: 4 },
      { cardKey: 'hvac', colStart: 1, colSpan: 4, rowStart: 5, rowSpan: 2 },
    ],
  },
  {
    id: 'surfaces',
    microColumns: 8,
    cards: [
      { cardKey: 'light', colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 },
      { cardKey: 'groupedSensors', colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 2 },
      { cardKey: 'energyNow', colStart: 5, colSpan: 4, rowStart: 1, rowSpan: 2 },
      { cardKey: 'cover', colStart: 1, colSpan: 2, rowStart: 3, rowSpan: 2 },
      { cardKey: 'lightColor', colStart: 3, colSpan: 2, rowStart: 3, rowSpan: 2 },
      { cardKey: 'vacuum', colStart: 5, colSpan: 4, rowStart: 3, rowSpan: 2 },
      { cardKey: 'person', colStart: 1, colSpan: 2, rowStart: 5, rowSpan: 2 },
      { cardKey: 'lock', colStart: 3, colSpan: 2, rowStart: 5, rowSpan: 2 },
      { cardKey: 'batteryOverview', colStart: 5, colSpan: 4, rowStart: 5, rowSpan: 2 },
    ],
  },
  {
    id: 'lifestyle',
    microColumns: 8,
    cards: [
      { cardKey: 'note', colStart: 1, colSpan: 4, rowStart: 1, rowSpan: 2 },
      { cardKey: 'map', colStart: 5, colSpan: 4, rowStart: 1, rowSpan: 2 },
      { cardKey: 'photo', colStart: 5, colSpan: 4, rowStart: 3, rowSpan: 2 },
      { cardKey: 'calendar', colStart: 1, colSpan: 4, rowStart: 3, rowSpan: 4 },
      { cardKey: 'scene', colStart: 5, colSpan: 2, rowStart: 5, rowSpan: 2 },
      { cardKey: 'temperature', colStart: 7, colSpan: 2, rowStart: 5, rowSpan: 2 },
    ],
  },
  {
    id: 'controls',
    microColumns: 8,
    cards: [
      { cardKey: 'switch', colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2 },
      { cardKey: 'fan', colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 2 },
      { cardKey: 'scene', colStart: 5, colSpan: 2, rowStart: 1, rowSpan: 2 },
      { cardKey: 'temperature', colStart: 7, colSpan: 2, rowStart: 1, rowSpan: 2 },
      { cardKey: 'person', colStart: 1, colSpan: 2, rowStart: 3, rowSpan: 2 },
      { cardKey: 'lock', colStart: 3, colSpan: 2, rowStart: 3, rowSpan: 2 },
      { cardKey: 'airQuality', colStart: 5, colSpan: 2, rowStart: 3, rowSpan: 2 },
      { cardKey: 'motion', colStart: 7, colSpan: 2, rowStart: 3, rowSpan: 2 },
      { cardKey: 'cover', colStart: 1, colSpan: 2, rowStart: 5, rowSpan: 2 },
      { cardKey: 'lightColor', colStart: 3, colSpan: 2, rowStart: 5, rowSpan: 2 },
      { cardKey: 'switch', colStart: 5, colSpan: 2, rowStart: 5, rowSpan: 2 },
      { cardKey: 'fan', colStart: 7, colSpan: 2, rowStart: 5, rowSpan: 2 },
    ],
  },
] as const;

function getBoardWidthPx(microColumns: 4 | 8) {
  return microColumns * BENTO_MICRO_COLUMN_WIDTH_PX + (microColumns - 1) * BENTO_GRID_GAP_PX;
}

const BENTO_SEQUENCE_WIDTH_PX =
  BENTO_BOARDS.reduce((total, board) => total + getBoardWidthPx(board.microColumns), 0) +
  BENTO_GAP_PX * Math.max(0, BENTO_BOARDS.length - 1);
// The marquee track is a flex row with `gap`, so one repeated sequence occupies
// its full width plus the inter-sequence gap. The wrap distance must match that
// rendered span exactly or the loop will visibly hitch at every reset.
const BENTO_LOOP_SPAN_PX = BENTO_SEQUENCE_WIDTH_PX + BENTO_GAP_PX;
const BENTO_SEQUENCE_HEIGHT_PX = BENTO_ROW_HEIGHT_PX * 6 + BENTO_GRID_GAP_PX * 5;

const BENTO_SEQUENCE_CARDS: readonly BentoSequenceCard[] = (() => {
  let offsetLeft = 0;

  return BENTO_BOARDS.flatMap((board, boardIndex) => {
    const boardCards = board.cards.map((card) => ({
      ...card,
      boardId: board.id,
      left: offsetLeft + (card.colStart - 1) * (BENTO_MICRO_COLUMN_WIDTH_PX + BENTO_GRID_GAP_PX),
      top: (card.rowStart - 1) * (BENTO_ROW_HEIGHT_PX + BENTO_GRID_GAP_PX),
      width: card.colSpan * BENTO_MICRO_COLUMN_WIDTH_PX + (card.colSpan - 1) * BENTO_GRID_GAP_PX,
      height: card.rowSpan * BENTO_ROW_HEIGHT_PX + (card.rowSpan - 1) * BENTO_GRID_GAP_PX,
    }));

    offsetLeft += getBoardWidthPx(board.microColumns);
    if (boardIndex < BENTO_BOARDS.length - 1) {
      offsetLeft += BENTO_GAP_PX;
    }

    return boardCards;
  });
})();

export function MarketingProductPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      inert
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_45%,rgba(5,10,18,0.85)_100%)] shadow-[0_34px_80px_-48px_rgba(2,8,20,0.9)] backdrop-blur-xl',
        compact ? 'p-3 sm:p-4' : 'mx-auto w-full max-w-[960px] p-4 md:p-5'
      )}
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-300/28 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(249,115,22,0.16),transparent_28%)] opacity-80" />
      <BorderBeam duration={8} size={40} />
      <BorderBeam
        reverse
        duration={10}
        delay={1.2}
        size={52}
        colorFrom="#4aa8ff"
        colorTo="#ffaa40"
        className="opacity-60"
      />
      <div
        className={cn(
          'relative z-[1] grid gap-4',
          compact ? 'lg:grid-cols-2' : 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'
        )}
      >
        <WeatherCard {...MARKETING_PREVIEW_CARDS.weather} onSizeChange={noopCardSizeChange} />
        <div className="grid gap-4">
          <MediaCard {...MARKETING_PREVIEW_CARDS.media} onSizeChange={noopCardSizeChange} />
          <HVACCard {...MARKETING_PREVIEW_CARDS.hvac} onSizeChange={noopCardSizeChange} />
        </div>
        {!compact ? (
          <div className="lg:col-span-2">
            <CalendarCard {...MARKETING_PREVIEW_CARDS.calendar} onSizeChange={noopCardSizeChange} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MarketingBentoCard({ cardKey }: { cardKey: BentoCardKey }) {
  const { theme, accentColor } = useTheme();
  const cardSize = getMarketingBentoCardSize(cardKey);

  if (cardKey === 'rss') {
    return (
      <RSSFeedCardView
        size={cardSize}
        theme={theme}
        accentColor={accentColor}
        colors={{
          rss: {
            gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
            border: 'border-white/10',
            glow: 'from-sky-300/20',
          },
        }}
        tintColor="#3b82f6"
        isSmall={isCompactCardSize(cardSize)}
        isMedium={cardSize === 'medium'}
        latestArticle={MARKETING_BENTO_RSS_ITEMS[0]}
        items={[...MARKETING_BENTO_RSS_ITEMS]}
        selectedProviders={[...MARKETING_BENTO_RSS_PROVIDERS]}
        activeProviderId="all"
        onActiveProviderChange={() => undefined}
        handleArticleClick={() => undefined}
        isLoading={false}
        error={null}
        hasConfiguredProviders={true}
        hasSelectedProviders={true}
        onOpenSettings={() => undefined}
      />
    );
  }
  if (cardKey === 'note') {
    return <NoteWidget {...MARKETING_BENTO_WIDGETS.note} />;
  }
  if (cardKey === 'map') {
    return <MapWidget {...MARKETING_BENTO_WIDGETS.map} />;
  }
  if (cardKey === 'photo') {
    return <PhotoFrameWidget {...MARKETING_BENTO_WIDGETS.photo} />;
  }
  if (cardKey === 'media') {
    return <MediaCard {...MARKETING_PREVIEW_CARDS.media} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'hvac') {
    return <HVACCard {...MARKETING_PREVIEW_CARDS.hvac} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'batteryOverview') {
    return <BatteryOverviewWidget size="medium" />;
  }
  if (cardKey === 'lightColor') {
    return (
      <div className="marketing-bento-light-card h-full w-full">
        <LightCard {...MARKETING_BENTO_CARDS.lightColor} onSizeChange={noopCardSizeChange} />
      </div>
    );
  }
  if (cardKey === 'cover') {
    return <CoverCard {...MARKETING_BENTO_CARDS.cover} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'weather') {
    return <WeatherCard {...MARKETING_BENTO_CARDS.weather} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'calendar') {
    return <CalendarCard {...MARKETING_BENTO_CARDS.calendar} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'light') {
    return (
      <div className="marketing-bento-light-card h-full w-full">
        <LightCard {...MARKETING_BENTO_CARDS.light} onSizeChange={noopCardSizeChange} />
      </div>
    );
  }
  if (cardKey === 'switch') {
    return <SwitchCard {...MARKETING_BENTO_CARDS.switch} />;
  }
  if (cardKey === 'fan') {
    return <FanCard {...MARKETING_BENTO_CARDS.fan} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'scene') {
    return <SceneCard {...MARKETING_BENTO_CARDS.scene} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'person') {
    return <PersonCard {...MARKETING_BENTO_CARDS.person} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'temperature') {
    return <InfoCard {...MARKETING_BENTO_CARDS.temperature} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'energyNow') {
    return (
      <EnergyNowCardView
        title="Energy today"
        subtitle="Widget"
        currentLoadW={316}
        todayUsageKWh={14.6}
        trend={[...MARKETING_BENTO_ENERGY_TREND]}
        accentColor="#f97316"
        size="medium"
      />
    );
  }
  if (cardKey === 'airQuality') {
    return <InfoCard {...MARKETING_BENTO_CARDS.airQuality} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'motion') {
    return <InfoCard {...MARKETING_BENTO_CARDS.motion} onSizeChange={noopCardSizeChange} />;
  }
  if (cardKey === 'groupedSensors') {
    return (
      <GroupedSensorCard
        {...MARKETING_BENTO_CARDS.groupedSensors}
        onSizeChange={noopCardSizeChange}
      />
    );
  }
  if (cardKey === 'lock') {
    return <LockCard {...MARKETING_BENTO_CARDS.lock} />;
  }
  return <VacuumCard {...MARKETING_BENTO_CARDS.vacuum} onSizeChange={noopCardSizeChange} />;
}

function MarketingLightEntitySeed() {
  useEffect(() => {
    const previousState = homeAssistantStore.getState();

    homeAssistantStore.setState({
      ...previousState,
      connected: true,
      connection: previousState.connection ?? ({} as never),
      entities: {
        ...(previousState.entities ?? {}),
        'light.kitchen_pendants': {
          entity_id: 'light.kitchen_pendants',
          state: 'on',
          attributes: {
            friendly_name: 'Kitchen Pendants',
            brightness: 184,
            supported_color_modes: ['brightness', 'color_temp'],
            color_mode: 'color_temp',
            color_temp_kelvin: 3200,
          },
          last_changed: '2026-05-30T12:00:00.000Z',
          last_updated: '2026-05-30T12:00:00.000Z',
          context: { id: 'marketing-light-1', parent_id: null, user_id: null },
        },
        'light.reading_nook': {
          entity_id: 'light.reading_nook',
          state: 'on',
          attributes: {
            friendly_name: 'Reading Nook',
            brightness: 199,
            supported_color_modes: ['rgb', 'color_temp'],
            color_mode: 'rgb',
            rgb_color: [255, 132, 72],
            hs_color: [18, 72],
          },
          last_changed: '2026-05-30T12:05:00.000Z',
          last_updated: '2026-05-30T12:05:00.000Z',
          context: { id: 'marketing-light-2', parent_id: null, user_id: null },
        },
        'sensor.front_door_sensor_battery': {
          entity_id: 'sensor.front_door_sensor_battery',
          state: '18',
          attributes: {
            friendly_name: 'Front Door Sensor',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
          last_changed: '2026-05-30T12:10:00.000Z',
          last_updated: '2026-05-30T12:10:00.000Z',
          context: { id: 'marketing-battery-1', parent_id: null, user_id: null },
        },
        'sensor.kitchen_remote_battery': {
          entity_id: 'sensor.kitchen_remote_battery',
          state: '42',
          attributes: {
            friendly_name: 'Kitchen Remote',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
          last_changed: '2026-05-30T12:10:00.000Z',
          last_updated: '2026-05-30T12:10:00.000Z',
          context: { id: 'marketing-battery-2', parent_id: null, user_id: null },
        },
        'sensor.living_room_motion_battery': {
          entity_id: 'sensor.living_room_motion_battery',
          state: '67',
          attributes: {
            friendly_name: 'Living Room Motion',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
          last_changed: '2026-05-30T12:10:00.000Z',
          last_updated: '2026-05-30T12:10:00.000Z',
          context: { id: 'marketing-battery-3', parent_id: null, user_id: null },
        },
        'sensor.thermostat_battery': {
          entity_id: 'sensor.thermostat_battery',
          state: '91',
          attributes: {
            friendly_name: 'Hall Thermostat',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
          last_changed: '2026-05-30T12:10:00.000Z',
          last_updated: '2026-05-30T12:10:00.000Z',
          context: { id: 'marketing-battery-4', parent_id: null, user_id: null },
        },
      },
    });

    return () => {
      homeAssistantStore.setState(previousState);
    };
  }, []);

  return null;
}

function MarketingBentoSequence({ sequenceIndex }: { sequenceIndex: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: `${BENTO_SEQUENCE_WIDTH_PX}px`, height: `${BENTO_SEQUENCE_HEIGHT_PX}px` }}
    >
      {BENTO_SEQUENCE_CARDS.map((card) => (
        <div
          key={`${sequenceIndex}-${card.boardId}-${card.cardKey}-${card.colStart}-${card.rowStart}`}
          className="absolute min-h-0 min-w-0 [filter:none]"
          style={{
            left: `${card.left}px`,
            top: `${card.top}px`,
            width: `${card.width}px`,
            height: `${card.height}px`,
          }}
          data-card-size={getMarketingBentoCardSize(card.cardKey)}
        >
          <MarketingBentoCard cardKey={card.cardKey} />
        </div>
      ))}
    </div>
  );
}

export function MarketingProductPreviewSection() {
  const marqueeViewportRef = useRef<HTMLDivElement | null>(null);
  const marqueeTrackRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startOffset: number;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const autoplayFrameRef = useRef<number | null>(null);
  const autoplayLastTimeRef = useRef<number | null>(null);
  const marqueeOffsetRef = useRef(-BENTO_LOOP_SPAN_PX);

  const applyMarqueeTransform = useCallback(() => {
    const track = marqueeTrackRef.current;
    if (!track) {
      return;
    }

    track.style.transform = `translate3d(${marqueeOffsetRef.current}px, 0, 0)`;
  }, []);

  const normalizeMarqueeOffset = useCallback(() => {
    while (marqueeOffsetRef.current < -BENTO_LOOP_SPAN_PX * 1.5) {
      marqueeOffsetRef.current += BENTO_LOOP_SPAN_PX;
    }

    while (marqueeOffsetRef.current > -BENTO_LOOP_SPAN_PX * 0.5) {
      marqueeOffsetRef.current -= BENTO_LOOP_SPAN_PX;
    }
  }, []);

  useEffect(() => {
    if (!marqueeViewportRef.current || !marqueeTrackRef.current) {
      return;
    }

    marqueeOffsetRef.current = -BENTO_LOOP_SPAN_PX;
    applyMarqueeTransform();
    const autoplaySpeedPxPerMs = BENTO_LOOP_SPAN_PX / 280000;

    const step = (time: number) => {
      if (!marqueeTrackRef.current) {
        return;
      }

      if (autoplayLastTimeRef.current == null) {
        autoplayLastTimeRef.current = time;
      }

      const elapsed = time - autoplayLastTimeRef.current;
      autoplayLastTimeRef.current = time;

      if (!isDraggingRef.current) {
        marqueeOffsetRef.current -= elapsed * autoplaySpeedPxPerMs;
        normalizeMarqueeOffset();
        applyMarqueeTransform();
      }

      autoplayFrameRef.current = window.requestAnimationFrame(step);
    };

    autoplayFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (autoplayFrameRef.current != null) {
        window.cancelAnimationFrame(autoplayFrameRef.current);
      }
      autoplayFrameRef.current = null;
      autoplayLastTimeRef.current = null;
    };
  }, [applyMarqueeTransform, normalizeMarqueeOffset]);

  return (
    <MarketingSectionShell
      eyebrow="Product preview"
      title="See Navet as the product"
      description="The preview uses real Navet cards with static demo data so the marketing site feels like the actual dashboard, not a generic smart-home mockup."
    >
      <MarketingLightEntitySeed />
      <div
        ref={marqueeViewportRef}
        className="marketing-bento-marquee relative -mx-16 overflow-hidden px-16 py-2 cursor-grab select-none active:cursor-grabbing touch-none lg:-mx-28 lg:px-28 xl:-mx-36 xl:px-36"
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0, rgba(0,0,0,0.08) 48px, rgba(0,0,0,0.45) 112px, black 184px, black calc(100% - 184px), rgba(0,0,0,0.45) calc(100% - 112px), rgba(0,0,0,0.08) calc(100% - 48px), transparent 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0, rgba(0,0,0,0.08) 48px, rgba(0,0,0,0.45) 112px, black 184px, black calc(100% - 184px), rgba(0,0,0,0.45) calc(100% - 112px), rgba(0,0,0,0.08) calc(100% - 48px), transparent 100%)',
        }}
        onPointerDown={(event) => {
          const viewport = marqueeViewportRef.current;
          if (!viewport) {
            return;
          }

          dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startOffset: marqueeOffsetRef.current,
          };
          viewport.setPointerCapture(event.pointerId);
          isDraggingRef.current = true;
          viewport.dataset.dragging = 'true';
        }}
        onPointerMove={(event) => {
          const viewport = marqueeViewportRef.current;
          const dragState = dragStateRef.current;
          if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          marqueeOffsetRef.current = dragState.startOffset + (event.clientX - dragState.startX);
          normalizeMarqueeOffset();
          applyMarqueeTransform();
        }}
        onPointerUp={(event) => {
          const viewport = marqueeViewportRef.current;
          const dragState = dragStateRef.current;
          if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          viewport.releasePointerCapture(event.pointerId);
          dragStateRef.current = null;
          isDraggingRef.current = false;
          normalizeMarqueeOffset();
          applyMarqueeTransform();
          viewport.dataset.dragging = 'false';
          autoplayLastTimeRef.current = null;
        }}
        onPointerCancel={(event) => {
          const viewport = marqueeViewportRef.current;
          const dragState = dragStateRef.current;
          if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          viewport.releasePointerCapture(event.pointerId);
          dragStateRef.current = null;
          isDraggingRef.current = false;
          normalizeMarqueeOffset();
          applyMarqueeTransform();
          viewport.dataset.dragging = 'false';
          autoplayLastTimeRef.current = null;
        }}
        onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-40 bg-[linear-gradient(90deg,rgba(6,8,13,0.95),rgba(6,8,13,0.55)_38%,rgba(6,8,13,0))] blur-[10px] lg:w-52 xl:w-64" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-40 bg-[linear-gradient(270deg,rgba(6,8,13,0.95),rgba(6,8,13,0.55)_38%,rgba(6,8,13,0))] blur-[10px] lg:w-52 xl:w-64" />
        <div
          ref={marqueeTrackRef}
          className="marketing-bento-marquee-track flex w-max"
          style={{
            gap: `${BENTO_GAP_PX}px`,
          }}
        >
          {Array.from({ length: 3 }, (_, index) => (
            <MarketingBentoSequence key={`sequence-${index}`} sequenceIndex={index} />
          ))}
        </div>
      </div>
    </MarketingSectionShell>
  );
}
