import type { ReactNode } from 'react';
import { Component, lazy, Suspense } from 'react';
import { RSSFeedCard } from '@/app/features/rss';
import type { CustomCard } from '../stores/custom-cards-store';

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

interface WidgetCardProps {
  card: CustomCard;
  isEditMode: boolean;
  onUpdate?: (cardId: string, updates: Partial<Omit<CustomCard, 'id' | 'createdAt'>>) => void;
}

function WidgetFallback() {
  return <div className="h-full rounded-2xl border border-white/10 bg-white/5 animate-pulse" />;
}

export function WidgetCard({ card, isEditMode, onUpdate }: WidgetCardProps) {
  const handleNoteChange = (note: string) => {
    if (onUpdate) {
      onUpdate(card.id, { data: { ...card.data, note } });
    }
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
          onRoomChange={onUpdate ? (room) => onUpdate(card.id, { room }) : undefined}
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={
            onUpdate
              ? (tintColor) => onUpdate(card.id, { data: { ...card.data, tintColor } })
              : undefined
          }
        />
      );
      break;
    case 'photo':
      widgetContent = (
        <PhotoFrameWidget
          size={card.size}
          photoUrls={card.data?.photoUrls as string[] | undefined}
          shuffleEnabled={(card.data?.shuffleEnabled as boolean | undefined) ?? true}
          onUpdateUrls={
            onUpdate
              ? (urls) => onUpdate(card.id, { data: { ...card.data, photoUrls: urls } })
              : undefined
          }
          onShuffleEnabledChange={
            onUpdate
              ? (shuffleEnabled) => onUpdate(card.id, { data: { ...card.data, shuffleEnabled } })
              : undefined
          }
          tintColor={card.data?.tintColor as string | undefined}
          onTintColorChange={
            onUpdate
              ? (tintColor) => onUpdate(card.id, { data: { ...card.data, tintColor } })
              : undefined
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
          onTintColorChange={
            onUpdate
              ? (tintColor) => onUpdate(card.id, { data: { ...card.data, tintColor } })
              : undefined
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
          onUpdate={
            onUpdate ? (data) => onUpdate(card.id, { data: { ...card.data, ...data } }) : undefined
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
