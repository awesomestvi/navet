import { useEffect, useState } from 'react';
import type { CameraCardImageSource } from './types';

interface CameraSnapshotImageProps {
  src: string;
  sources?: readonly CameraCardImageSource[];
  alt: string;
  className: string;
  onError: () => void;
}

function isVersionedCameraProxySnapshot(src: string) {
  return src.includes('/api/camera_proxy/') && src.includes('_t=');
}

export function CameraSnapshotImage({
  src,
  sources,
  alt,
  className,
  onError,
}: CameraSnapshotImageProps) {
  const [displayedSrc, setDisplayedSrc] = useState(src);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setDisplayedSrc(src);
      setPendingSrc(null);
      return;
    }

    if (!displayedSrc) {
      setDisplayedSrc(src);
      setPendingSrc(null);
      return;
    }

    if (isVersionedCameraProxySnapshot(src)) {
      setDisplayedSrc(src);
      setPendingSrc(null);
      return;
    }

    if (src === displayedSrc) {
      setPendingSrc(null);
      return;
    }

    setPendingSrc(src);
  }, [displayedSrc, src]);

  return (
    <>
      {displayedSrc ? (
        <picture>
          {sources?.map((source) => (
            <source
              key={`${source.type}:${source.srcSet}`}
              srcSet={source.srcSet}
              type={source.type}
            />
          ))}
          <img
            src={displayedSrc}
            alt={alt}
            className={`${className} [backface-visibility:hidden] [transform:translateZ(0)]`}
            style={{ imageRendering: 'auto' }}
            draggable={false}
            onError={onError}
          />
        </picture>
      ) : null}
      {pendingSrc ? (
        <picture>
          {sources?.map((source) => (
            <source
              key={`pending:${source.type}:${source.srcSet}`}
              srcSet={source.srcSet}
              type={source.type}
            />
          ))}
          <img
            src={pendingSrc}
            alt=""
            aria-hidden="true"
            className="hidden [backface-visibility:hidden] [transform:translateZ(0)]"
            style={{ imageRendering: 'auto' }}
            draggable={false}
            onLoad={() => {
              setDisplayedSrc(pendingSrc);
              setPendingSrc(null);
            }}
            onError={onError}
          />
        </picture>
      ) : null}
    </>
  );
}
