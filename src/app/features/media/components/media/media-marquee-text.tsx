import type { CSSProperties } from 'react';
import { memo } from 'react';

interface MediaMarqueeTextProps {
  text: string;
  className: string;
  threshold?: number;
  style?: CSSProperties;
}

export const MediaMarqueeText = memo(function MediaMarqueeText({
  text,
  className,
  threshold = 22,
  style,
}: MediaMarqueeTextProps) {
  const shouldMarquee = text.length > threshold;

  if (!shouldMarquee) {
    return (
      <div className={`truncate ${className}`} style={style}>
        {text}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div
        className={`flex min-w-max items-center whitespace-nowrap motion-safe:animate-[media-track-marquee_18s_linear_infinite] ${className}`}
        style={style}
      >
        <span className="flex shrink-0 items-center">
          <span>{text}</span>
          <span className="px-6 opacity-50">•</span>
        </span>
        <span className="flex shrink-0 items-center">
          <span>{text}</span>
          <span className="px-6 opacity-50">•</span>
        </span>
      </div>
    </div>
  );
});
