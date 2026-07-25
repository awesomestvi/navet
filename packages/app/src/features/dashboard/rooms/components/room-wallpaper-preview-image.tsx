import { resolveWallpaperPreviewSources } from '@navet/app/constants/built-in-wallpapers';
import { sanitizeImageUrl } from '@navet/app/utils/url-security';
import { useEffect, useState } from 'react';

export interface RoomWallpaperPreviewImageProps {
  value: string;
  alt: string;
  className?: string;
}

export function RoomWallpaperPreviewImage({
  value,
  alt,
  className,
}: RoomWallpaperPreviewImageProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const preview = resolveWallpaperPreviewSources(value);

  useEffect(() => {
    setHasFailed(false);
  }, [value]);

  if (!preview || hasFailed) {
    return null;
  }

  if (preview.kind === 'custom') {
    const safeSource = sanitizeImageUrl(
      preview.imgSrc,
      typeof window === 'undefined' ? undefined : window.location.href
    );
    if (!safeSource) {
      return null;
    }

    return (
      <img
        src={safeSource}
        alt={alt}
        width={1600}
        height={900}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasFailed(true)}
      />
    );
  }

  return (
    <picture>
      <source srcSet={preview.avifSrc} type="image/avif" />
      <source srcSet={preview.webpSrc} type="image/webp" />
      <img
        src={preview.imgSrc}
        alt={alt}
        width={1600}
        height={900}
        className={className}
        loading="lazy"
        onError={() => setHasFailed(true)}
      />
    </picture>
  );
}
