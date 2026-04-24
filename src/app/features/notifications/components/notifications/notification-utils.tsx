import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import type { PrimaryColor } from '@/app/hooks';
import type { Notification } from './use-notifications';

export const formatTimestamp = (
  date: Date,
  labels: {
    daysAgo: string;
    hoursAgo: string;
    justNow: string;
    minutesAgo: string;
  }
): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return labels.justNow;
  if (diffMins < 60) return labels.minutesAgo.replace('{count}', String(diffMins));
  if (diffHours < 24) return labels.hoursAgo.replace('{count}', String(diffHours));
  return labels.daysAgo.replace('{count}', String(diffDays));
};

export const getColorValue = getThemeColorValue;

export function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertCircle;
    case 'error':
      return AlertCircle;
    default:
      return Info;
  }
}

export function getNotificationColor(
  type: Notification['type'],
  primaryColor: PrimaryColor
): string {
  switch (type) {
    case 'success':
      return '#22c55e';
    case 'warning':
      return '#eab308';
    case 'error':
      return '#ef4444';
    default:
      return getColorValue(primaryColor);
  }
}

function resolveNotificationAssetUrl(url: string, hassUrl?: string): string {
  if (!url) {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  if (!hassUrl) {
    return url;
  }

  try {
    return new URL(url, hassUrl).toString();
  } catch {
    return url;
  }
}

function renderInlineMarkdown(
  content: string,
  hassUrl?: string,
  imageAltText?: string
): ReactNode[] {
  const pattern =
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match = pattern.exec(content);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const [raw, imageAlt, imageUrl, linkLabel, linkUrl, boldText, codeText, italicText] = match;

    if (imageUrl) {
      parts.push(
        <ImageWithFallback
          key={`${imageUrl}-${match.index}`}
          src={resolveNotificationAssetUrl(imageUrl, hassUrl)}
          alt={imageAlt || imageAltText || ''}
          className="mt-2 max-h-36 w-full rounded-2xl border border-white/10 object-cover"
        />
      );
    } else if (linkUrl && linkLabel) {
      parts.push(
        <a
          key={`${linkUrl}-${match.index}`}
          href={resolveNotificationAssetUrl(linkUrl, hassUrl)}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/25 underline-offset-4 transition-opacity hover:opacity-80"
        >
          {linkLabel}
        </a>
      );
    } else if (boldText) {
      parts.push(
        <strong key={`${raw}-${match.index}`} className="font-semibold text-inherit">
          {boldText}
        </strong>
      );
    } else if (codeText) {
      parts.push(
        <code
          key={`${raw}-${match.index}`}
          className="rounded-md border border-white/10 bg-black/10 px-1 py-0.5 text-[0.92em]"
        >
          {codeText}
        </code>
      );
    } else if (italicText) {
      parts.push(
        <em key={`${raw}-${match.index}`} className="italic">
          {italicText}
        </em>
      );
    }

    lastIndex = match.index + raw.length;
    match = pattern.exec(content);
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

export function renderNotificationMarkdown(
  message: string,
  hassUrl?: string,
  imageAltText?: string
): ReactNode {
  const blocks = message
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block.split('\n').map((line) => line.trimEnd());
    const isBulletList = lines.every((line) => /^[-*+]\s+/.test(line));

    if (isBulletList) {
      return (
        <ul key={`list-${blockIndex}`} className="ml-4 list-disc space-y-1">
          {lines.map((line, lineIndex) => (
            <li key={`item-${blockIndex}-${lineIndex}`}>
              {renderInlineMarkdown(line.replace(/^[-*+]\s+/, ''), hassUrl, imageAltText)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div key={`paragraph-${blockIndex}`} className="space-y-1">
        {lines.map((line, lineIndex) => (
          <Fragment key={`line-${blockIndex}-${lineIndex}`}>
            {(() => {
              const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
              if (headingMatch) {
                const [, hashes, headingText] = headingMatch;
                const headingClassName =
                  hashes.length <= 2
                    ? 'text-sm font-semibold text-inherit'
                    : 'text-sm font-semibold text-inherit';

                return (
                  <p className={headingClassName}>
                    {renderInlineMarkdown(headingText, hassUrl, imageAltText)}
                  </p>
                );
              }

              if (!line.trim()) {
                return null;
              }

              return (
                <p className="text-inherit">{renderInlineMarkdown(line, hassUrl, imageAltText)}</p>
              );
            })()}
          </Fragment>
        ))}
      </div>
    );
  });
}
