import { getRSSSkeletonStyles } from '@navet/app/components/shared/theme/rss-widget-surface-tokens';
import type { ThemeType } from '@navet/app/hooks';

interface RSSFeedLoadingSkeletonProps {
  isSmall: boolean;
  isMedium: boolean;
  theme: ThemeType;
  accentColor: string;
}

export function RSSFeedLoadingSkeleton({
  isSmall,
  isMedium,
  theme,
  accentColor,
}: RSSFeedLoadingSkeletonProps) {
  const skeletonStyles = getRSSSkeletonStyles({ theme, accentColor });
  const blockStyle = skeletonStyles.block;
  const lineStyle = skeletonStyles.line;
  const dividerStyle = skeletonStyles.divider;

  return (
    <div className="flex flex-1 flex-col animate-pulse">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex gap-1 overflow-hidden pb-0.5">
            <div className="h-6 w-11 shrink-0 rounded-full border" style={skeletonStyles.pill} />
            <div className="h-6 w-14 shrink-0 rounded-full border" style={skeletonStyles.pill} />
            <div className="h-6 w-12 shrink-0 rounded-full border" style={skeletonStyles.pill} />
          </div>
        </div>
        <div className="h-6 w-7 shrink-0 rounded-full border" style={skeletonStyles.pill} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isSmall ? (
          <RSSSkeletonSmall
            blockStyle={blockStyle}
            lineStyle={lineStyle}
            dividerStyle={dividerStyle}
          />
        ) : isMedium ? (
          <RSSSkeletonMedium
            blockStyle={blockStyle}
            lineStyle={lineStyle}
            dividerStyle={dividerStyle}
          />
        ) : (
          <RSSSkeletonLarge
            blockStyle={blockStyle}
            lineStyle={lineStyle}
            dividerStyle={dividerStyle}
          />
        )}
      </div>
    </div>
  );
}

function RSSSkeletonSmall({
  blockStyle,
  lineStyle,
  dividerStyle,
}: {
  blockStyle: React.CSSProperties;
  lineStyle: React.CSSProperties;
  dividerStyle: React.CSSProperties;
}) {
  return (
    <div className="space-y-1.5 pr-1">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg px-1 py-1">
          <div className="h-3 w-full rounded" style={lineStyle} />
          <div className="mt-1 h-3 w-4/5 rounded" style={lineStyle} />
          <div className="mt-1.5 flex items-center gap-1">
            <div className="h-2.5 w-12 rounded" style={blockStyle} />
            <div className="h-2.5 w-1 rounded-full" style={blockStyle} />
            <div className="h-2.5 w-10 rounded" style={blockStyle} />
          </div>
          {index < 3 ? <div className="mt-1.5 h-px" style={dividerStyle} /> : null}
        </div>
      ))}
    </div>
  );
}

function RSSSkeletonMedium({
  blockStyle,
  lineStyle,
  dividerStyle,
}: {
  blockStyle: React.CSSProperties;
  lineStyle: React.CSSProperties;
  dividerStyle: React.CSSProperties;
}) {
  return (
    <div className="space-y-2 pr-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg px-1 py-1.5">
          <div className="h-3 w-full rounded" style={lineStyle} />
          <div className="mt-1 h-3 w-3/4 rounded" style={lineStyle} />
          <div className="mt-1.5 flex items-center gap-1">
            <div className="h-2.5 w-14 rounded" style={blockStyle} />
            <div className="h-2.5 w-1 rounded-full" style={blockStyle} />
            <div className="h-2.5 w-12 rounded" style={blockStyle} />
          </div>
          {index < 4 ? <div className="mt-2 h-px" style={dividerStyle} /> : null}
        </div>
      ))}
    </div>
  );
}

function RSSSkeletonLarge({
  blockStyle,
  lineStyle,
  dividerStyle,
}: {
  blockStyle: React.CSSProperties;
  lineStyle: React.CSSProperties;
  dividerStyle: React.CSSProperties;
}) {
  return (
    <div className="space-y-2 pr-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl p-2">
          <div className="flex gap-3">
            <div className="h-20 w-20 shrink-0 rounded-lg" style={blockStyle} />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-full rounded" style={lineStyle} />
              <div className="mt-1 h-3 w-4/5 rounded" style={lineStyle} />
              <div className="mt-1.5 flex items-center gap-1">
                <div className="h-2.5 w-14 rounded" style={blockStyle} />
                <div className="h-2.5 w-1 rounded-full" style={blockStyle} />
                <div className="h-2.5 w-12 rounded" style={blockStyle} />
              </div>
              <div className="mt-2 h-2.5 w-full rounded" style={blockStyle} />
              <div className="mt-1 h-2.5 w-11/12 rounded" style={blockStyle} />
              <div className="mt-1 h-2.5 w-2/3 rounded" style={blockStyle} />
            </div>
          </div>
          {index < 2 ? <div className="mt-2 h-px" style={dividerStyle} /> : null}
        </div>
      ))}
    </div>
  );
}
