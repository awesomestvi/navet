import { type CardSize, cardSizeOverlayClass } from '@/app/components/shared/card-size-selector';
import { WidgetCard } from '@/app/features/dashboard/components/widget-card';
import type { CustomCard } from '@/app/features/dashboard/stores/custom-cards-store';

export function buildCustomCard(
  type: CustomCard['type'],
  size: CardSize,
  data?: Record<string, unknown>
): CustomCard {
  return {
    id: `story-${type}-${size}`,
    type,
    size,
    room: 'Home',
    createdAt: 1711929600000,
    data,
  };
}

export function CustomWidgetStoryFrame({
  card,
  isEditMode = false,
}: {
  card: CustomCard;
  isEditMode?: boolean;
}) {
  return (
    <div className={cardSizeOverlayClass[card.size]}>
      <WidgetCard card={card} isEditMode={isEditMode} />
    </div>
  );
}
