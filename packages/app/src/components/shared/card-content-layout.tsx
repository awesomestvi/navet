import { memo, type ReactNode } from 'react';

interface CardContentLayoutProps {
  /** Primary value to display (e.g., "72%", "21°C") */
  primaryValue: string;
  /** Color class for primary value (e.g., "text-white", "text-gray-500") */
  primaryValueColor?: string;
  /** Caption text or JSX to display below primary value */
  caption: ReactNode;
  /** Action buttons to display at the bottom */
  actions: ReactNode;
  /** Layout type: "end" for small cards, "between" for medium/large cards */
  layout?: 'end' | 'between';
}

/**
 * Reusable card content layout component for primary value, caption, and action buttons.
 * Used across HVAC, vacuum, and other cards with similar layouts.
 *
 * @example
 * ```tsx
 * <CardContentLayout
 *   primaryValue="72%"
 *   primaryValueColor="text-white"
 *   caption={<span className="text-xs text-gray-300">Battery</span>}
 *   actions={<button>Start</button>}
 *   layout="between"
 * />
 * ```
 */
export const CardContentLayout = memo(function CardContentLayout({
  primaryValue,
  primaryValueColor = 'text-white',
  caption,
  actions,
  layout = 'between',
}: CardContentLayoutProps) {
  const justifyClass = layout === 'end' ? 'justify-end' : 'justify-between';

  return (
    <div className={`flex-1 flex flex-col ${justifyClass} gap-2`}>
      {/* Primary value and caption section */}
      <div>
        <div
          className={`mb-1.5 text-3xl font-bold ${primaryValueColor} leading-none transition-colors duration-500`}
        >
          {primaryValue}
        </div>
        <div className="text-xs">{caption}</div>
      </div>

      {/* Action buttons section */}
      {layout === 'between' && <div className="flex items-center gap-2">{actions}</div>}

      {layout === 'end' && <div className="flex gap-2 items-center">{actions}</div>}
    </div>
  );
});
