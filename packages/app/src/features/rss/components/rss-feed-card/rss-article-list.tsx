import { OverlayScrollArea } from '@navet/app/components/primitives';
import { sanitizeExternalUrl } from '@navet/app/utils/url-security';
import type { ReactNode } from 'react';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSItem } from './types';

function RSSArticleLink({
  children,
  className,
  handleArticleClick,
  inEditMode,
  item,
  rssSurface,
}: {
  children: ReactNode;
  className: string;
  handleArticleClick: (url: string) => void;
  inEditMode: boolean;
  item: RSSItem;
  rssSurface: RSSFeedCardSurfaceTokens;
}) {
  const safeUrl = sanitizeExternalUrl(item.url);

  return (
    <a
      href={safeUrl ?? undefined}
      target={safeUrl ? '_blank' : undefined}
      rel={safeUrl ? 'noopener noreferrer' : undefined}
      className={`${className} ${!inEditMode && safeUrl ? `cursor-pointer ${rssSurface.hoverClassName}` : ''}`}
      onClick={(event) => {
        event.preventDefault();
        if (inEditMode) return;
        event.stopPropagation();
        if (!safeUrl) return;
        handleArticleClick(safeUrl);
      }}
    >
      {children}
    </a>
  );
}

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
    <RSSArticleLink
      item={item}
      inEditMode={inEditMode}
      rssSurface={rssSurface}
      handleArticleClick={handleArticleClick}
      className="group/item -m-1 block min-w-0 rounded-lg px-1 py-1 text-left no-underline transition-colors"
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
    </RSSArticleLink>
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
        <RSSArticleLink
          key={item.id}
          item={item}
          inEditMode={inEditMode}
          rssSurface={rssSurface}
          handleArticleClick={handleArticleClick}
          className="group/item -m-1 block min-w-0 rounded-lg px-1 py-1.5 text-left no-underline transition-colors"
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
        </RSSArticleLink>
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
        <RSSArticleLink
          key={item.id}
          item={item}
          inEditMode={inEditMode}
          rssSurface={rssSurface}
          handleArticleClick={handleArticleClick}
          className="group/item -m-2 block min-w-0 rounded-xl p-2 text-left no-underline transition-colors"
        >
          <div className="flex gap-3">
            {item.imageUrl && (
              <div
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg ${rssSurface.thumbnailClassName}`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover opacity-80 transition-opacity group-hover/item:opacity-100"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
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
        </RSSArticleLink>
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
