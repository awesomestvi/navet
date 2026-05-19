import { OverlayScrollArea } from '@/app/components/primitives';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSItem } from './types';

interface RSSArticleListItemProps {
  item: RSSItem;
  index: number;
  totalItems: number;
  inEditMode: boolean;
  rssSurface: RSSFeedCardSurfaceTokens;
  handleArticleClick: (url: string) => void;
}

export function RSSArticleListItem({
  item,
  index,
  totalItems,
  inEditMode,
  rssSurface,
  handleArticleClick,
}: RSSArticleListItemProps) {
  return (
    <a
      key={item.id}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group/item -m-1 block min-w-0 rounded-lg px-1 py-1 text-left no-underline transition-colors ${
        inEditMode ? '' : `cursor-pointer ${rssSurface.hoverClassName}`
      }`}
      onClick={(e) => {
        if (inEditMode) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleArticleClick(item.url);
      }}
    >
      <h3
        className="text-left text-xs font-semibold leading-[1.35] line-clamp-2"
        style={{ color: rssSurface.textPrimaryColor }}
      >
        {item.title}
      </h3>
      <div className="mt-0.5 flex items-center gap-1 text-xs leading-none">
        <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
        <span className={rssSurface.dotClassName}>•</span>
        <span style={{ color: rssSurface.textSecondaryColor }}>{item.timeAgo}</span>
      </div>
      {index < Math.min(totalItems, 4) - 1 ? (
        <div className={`mt-1.5 h-px ${rssSurface.dividerClassName}`} />
      ) : null}
    </a>
  );
}

interface RSSArticleListSmallProps {
  items: RSSItem[];
  inEditMode: boolean;
  rssSurface: RSSFeedCardSurfaceTokens;
  handleArticleClick: (url: string) => void;
}

export function RSSArticleListSmall({
  items,
  inEditMode,
  rssSurface,
  handleArticleClick,
}: RSSArticleListSmallProps) {
  return (
    <OverlayScrollArea className="flex-1" contentClassName="space-y-1.5 pr-3">
      {items.slice(0, 4).map((item, index) => (
        <RSSArticleListItem
          key={item.id}
          item={item}
          index={index}
          totalItems={items.length}
          inEditMode={inEditMode}
          rssSurface={rssSurface}
          handleArticleClick={handleArticleClick}
        />
      ))}
    </OverlayScrollArea>
  );
}

interface RSSArticleListMediumProps {
  items: RSSItem[];
  inEditMode: boolean;
  rssSurface: RSSFeedCardSurfaceTokens;
  handleArticleClick: (url: string) => void;
}

export function RSSArticleListMedium({
  items,
  inEditMode,
  rssSurface,
  handleArticleClick,
}: RSSArticleListMediumProps) {
  return (
    <OverlayScrollArea className="flex-1" contentClassName="space-y-2 pr-3">
      {items.map((item, index) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group/item -m-1 block min-w-0 rounded-lg px-1 py-1.5 text-left no-underline transition-colors ${
            inEditMode ? '' : `cursor-pointer ${rssSurface.hoverClassName}`
          }`}
          onClick={(e) => {
            if (inEditMode) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            handleArticleClick(item.url);
          }}
        >
          <h3
            className="mb-0.5 text-left text-sm font-semibold leading-tight line-clamp-2 transition-colors"
            style={{ color: rssSurface.textPrimaryColor }}
          >
            {item.title}
          </h3>
          <div className="flex items-center gap-1 text-xs leading-none">
            <span style={{ color: rssSurface.sourceColor }}>{item.source}</span>
            <span className={rssSurface.dotClassName}>•</span>
            <span style={{ color: rssSurface.textSecondaryColor }}>{item.timeAgo}</span>
          </div>
          {index < items.length - 1 && (
            <div className={`mt-2 h-px ${rssSurface.dividerClassName}`} />
          )}
        </a>
      ))}
    </OverlayScrollArea>
  );
}

interface RSSArticleListLargeProps {
  items: RSSItem[];
  inEditMode: boolean;
  rssSurface: RSSFeedCardSurfaceTokens;
  handleArticleClick: (url: string) => void;
}

export function RSSArticleListLarge({
  items,
  inEditMode,
  rssSurface,
  handleArticleClick,
}: RSSArticleListLargeProps) {
  return (
    <OverlayScrollArea className="flex-1" contentClassName="space-y-2 pr-3">
      {items.map((item, index) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group/item -m-2 block min-w-0 rounded-xl p-2 text-left no-underline transition-colors ${
            inEditMode ? '' : `cursor-pointer ${rssSurface.hoverClassName}`
          }`}
          onClick={(e) => {
            if (inEditMode) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            handleArticleClick(item.url);
          }}
        >
          <div className="flex gap-3">
            {item.imageUrl && (
              <div
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg ${rssSurface.thumbnailClassName}`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover/item:opacity-100"
                />
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <h3
                className="mb-1.5 text-left text-sm font-semibold leading-[1.3] line-clamp-2 transition-colors"
                style={{ color: rssSurface.textPrimaryColor }}
              >
                {item.title}
              </h3>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] leading-none">
                <span className="font-medium" style={{ color: rssSurface.metadataSourceColor }}>
                  {item.source}
                </span>
                <span
                  className={rssSurface.dotClassName}
                  style={{ color: rssSurface.metadataTimeColor }}
                >
                  •
                </span>
                <span style={{ color: rssSurface.metadataTimeColor }}>{item.timeAgo}</span>
              </div>
              {item.excerpt ? (
                <p
                  className={`line-clamp-4 text-left text-xs whitespace-normal wrap-break-word leading-[1.5] ${rssSurface.excerptClassName}`}
                  style={{ color: rssSurface.excerptColor }}
                >
                  {truncateExcerpt(item.excerpt)}
                </p>
              ) : null}
            </div>
          </div>
          {index < items.length - 1 && (
            <div className={`mt-2 h-px ${rssSurface.dividerClassName}`} />
          )}
        </a>
      ))}
    </OverlayScrollArea>
  );
}

function truncateExcerpt(value: string, maxLength = 420) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}
