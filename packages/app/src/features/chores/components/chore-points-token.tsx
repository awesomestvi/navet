import { useI18n, useTheme } from '@navet/app/hooks';
import { Star } from 'lucide-react';

export function ChorePointsToken({
  points,
  showPlus = true,
  total,
  color,
}: {
  points: number;
  showPlus?: boolean;
  total?: number;
  color?: string;
}) {
  const { t } = useI18n();
  const { accentColor } = useTheme();
  const resolvedColor = color ?? accentColor;
  const label =
    total === undefined
      ? t('household.card.points', { count: points })
      : `${t('household.card.points', { count: points })} / ${t('household.card.points', { count: total })}`;

  return (
    <span
      className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border pr-2 pl-1 text-xs font-semibold tabular-nums"
      style={{
        backgroundColor: `${resolvedColor}14`,
        borderColor: `${resolvedColor}52`,
        color: resolvedColor,
      }}
      title={label}
    >
      <span
        aria-hidden="true"
        className="flex h-4 w-4 items-center justify-center rounded-full text-white shadow-sm"
        style={{ backgroundColor: resolvedColor }}
      >
        <Star className="h-2.5 w-2.5 fill-current" />
      </span>
      <span aria-hidden="true">
        {showPlus ? '+' : ''}
        {points}
        {total === undefined ? null : `/${total}`}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
