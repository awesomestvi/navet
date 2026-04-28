import { type CardSize, getCardSizeOverlayStyle } from '@/app/components/shared/card-size-selector';
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
  card?: CustomCard;
  isEditMode?: boolean;
}) {
  const safeCard = card ?? buildCustomCard('button', 'medium');

  return (
    <div style={getCardSizeOverlayStyle(safeCard.size)}>
      <WidgetCard card={safeCard} isEditMode={isEditMode} />
    </div>
  );
}
