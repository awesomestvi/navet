import type { ReactNode } from 'react';
import { Component, lazy, Suspense } from 'react';
import type { RSSCardData } from '@/app/features/rss';
import { RSSFeedCard } from '@/app/features/rss';
import type { CustomCard } from '../stores/custom-cards-store';
import { useCustomCardsStore } from '../stores/custom-cards-store';
import type { PhotoFrameSourceMode } from './widgets/photo-frame-types';

class WidgetErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs text-white/40">
          Widget failed to load
        </div>
      );
    }
    return this.props.children;
  }
}

const NoteWidget = lazy(async () => {
  const module = await import('./widgets/note-widget');
  return { default: module.NoteWidget };
});

const PhotoFrameWidget = lazy(async () => {
  const module = await import('./widgets/photo-frame-widget');
  return { default: module.PhotoFrameWidget };
});

const BatteryOverviewWidget = lazy(async () => {
  const module = await import('./widgets/battery-overview-widget');
  return { default: module.BatteryOverviewWidget };
});

const ButtonWidget = lazy(async () => {
  const module = await import('./widgets/button-widget');
  return { default: module.ButtonWidget };
});

const MapWidget = lazy(async () => {
  const module = await import('./widgets/map-widget');
  return { default: module.MapWidget };
});

interface WidgetCardProps {
  card: CustomCard;
  isEditMode: boolean;
  onUpdate?: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
}

function WidgetFallback() {
  return <div className="h-full rounded-2xl border border-white/10 bg-white/5 animate-pulse" />;
}

export function WidgetCard({ card, isEditMode, onUpdate }: WidgetCardProps) {
  const updateCustomCard = useCustomCardsStore((state) => state.updateCard);
  const handleCardUpdate = onUpdate ?? updateCustomCard;

  const handleNoteChange = (note: string) => {
    handleCardUpdate(card.id, { data: { ...card.data, note } });
  };

  let widgetContent: React.ReactNode;
  switch (card.type) {
    case 'rss':
      widgetContent = (
        <RSSFeedCard
          cardId={card.id}
          inEditMode={isEditMode}
          size={card.size}
          room={card.room}
          data={card.data as RSSCardData | undefined}
          onRoomChange={(room) => handleCardUpdate(card.id, { room })}
          onDataChange={(data) => handleCardUpdate(card.id, { data: { ...card.data, ...data } })}
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
        />
      );
      break;
    case 'photo':
      widgetContent = (
        <PhotoFrameWidget
          size={card.size}
          sourceMode={card.data?.sourceMode as PhotoFrameSourceMode | undefined}
          photoUrls={card.data?.photoUrls as string[] | undefined}
          mediaSourceId={card.data?.mediaSourceId as string | undefined}
          shuffleEnabled={(card.data?.shuffleEnabled as boolean | undefined) ?? true}
          onUpdateUrls={(urls) =>
            handleCardUpdate(card.id, { data: { ...card.data, photoUrls: urls } })
          }
          onSourceModeChange={(sourceMode) =>
            handleCardUpdate(card.id, { data: { ...card.data, sourceMode } })
          }
          onMediaSourceIdChange={(mediaSourceId) =>
            handleCardUpdate(card.id, { data: { ...card.data, mediaSourceId } })
          }
          onShuffleEnabledChange={(shuffleEnabled) =>
            handleCardUpdate(card.id, { data: { ...card.data, shuffleEnabled } })
          }
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
          isEditMode={isEditMode}
        />
      );
      break;
    case 'note':
      widgetContent = (
        <NoteWidget
          initialNote={card.data?.note as string}
          onNoteChange={handleNoteChange}
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
        />
      );
      break;
    case 'battery':
      widgetContent = <BatteryOverviewWidget size={card.size} />;
      break;
    case 'button':
      widgetContent = (
        <ButtonWidget
          data={
            card.data as
              | {
                  label?: string;
                  service?: string;
                  entityId?: string;
                  icon?: string;
                  serviceData?: Record<string, unknown>;
                }
              | undefined
          }
          onUpdate={(data) => handleCardUpdate(card.id, { data: { ...card.data, ...data } })}
          isEditMode={isEditMode}
        />
      );
      break;
    case 'map':
      widgetContent = (
        <MapWidget
          size={card.size}
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={(tintColor) =>
            handleCardUpdate(card.id, { data: { ...card.data, tintColor } })
          }
          isEditMode={isEditMode}
        />
      );
      break;
    default:
      widgetContent = null;
  }

  return (
    <div className="relative h-full">
      <WidgetErrorBoundary>
        <Suspense fallback={<WidgetFallback />}>{widgetContent}</Suspense>
      </WidgetErrorBoundary>
    </div>
  );
}
