import { useLayoutEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cn } from '@navet/ui/utils';
import {
  MarketingResponsiveImage,
  type MarketingResponsiveImageSource,
} from '@navet/app/marketing/components/MarketingResponsiveImage';
import 'devices.css/dist/devices.min.css';

const IPAD_LANDSCAPE_WIDTH = 778;
const IPAD_LANDSCAPE_HEIGHT = 560;
const IPHONE_WIDTH = 428;
const IPHONE_HEIGHT = 868;
const IPHONE_SAFE_AREA_TOP = 46;
const IPHONE_SAFE_AREA_BOTTOM = 18;

interface DeviceFrameProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  sources?: readonly MarketingResponsiveImageSource[];
}

interface ResponsiveDeviceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  baseWidth: number;
  baseHeight: number;
  children: (scale: number) => React.ReactNode;
}

function ResponsiveDevice({
  baseWidth,
  baseHeight,
  children,
  className,
  style,
  ...props
}: ResponsiveDeviceProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>();

  useLayoutEffect(() => {
    const frame = frameRef.current;

    if (!frame) return;

    const updateScale = () => setScale(frame.clientWidth / baseWidth);
    const observer = new ResizeObserver(updateScale);

    updateScale();
    observer.observe(frame);

    return () => observer.disconnect();
  }, [baseWidth]);

  return (
    <div
      ref={frameRef}
      className={cn('relative w-full', className)}
      style={{ aspectRatio: `${baseWidth} / ${baseHeight}`, ...style }}
      {...props}
    >
      {scale === undefined ? null : children(scale)}
    </div>
  );
}

function DeviceDetails() {
  return (
    <>
      <div className="device-stripe" aria-hidden="true" />
      <div className="device-header" aria-hidden="true" />
      <div className="device-sensors" aria-hidden="true" />
      <div className="device-btns" aria-hidden="true" />
      <div className="device-power" aria-hidden="true" />
      <div className="device-home" aria-hidden="true" />
    </>
  );
}

export function IpadFrame({ className, src, alt, sources, ...props }: DeviceFrameProps) {
  return (
    <ResponsiveDevice
      baseWidth={IPAD_LANDSCAPE_WIDTH}
      baseHeight={IPAD_LANDSCAPE_HEIGHT}
      className={className}
      {...props}
    >
      {(scale) => (
        <div
          className="device device-ipad-pro device-spacegray"
          style={{
            left: 0,
            position: 'absolute',
            top: 0,
            transform: `scale(${scale}) translateX(${IPAD_LANDSCAPE_WIDTH}px) rotate(90deg)`,
            transformOrigin: 'top left',
          }}
        >
          <div className="device-frame">
            <div className="device-screen overflow-hidden" style={{ border: 0 }}>
              <MarketingResponsiveImage
                src={src}
                sources={sources}
                alt={alt}
                className="absolute top-1/2 left-1/2 object-contain"
                loading="lazy"
                style={{
                  height: 506,
                  maxWidth: 'none',
                  objectFit: 'contain',
                  transform: 'translate(-50%, -50%) rotate(-90deg)',
                  width: 724,
                }}
              />
            </div>
          </div>
          <DeviceDetails />
        </div>
      )}
    </ResponsiveDevice>
  );
}

export function IphoneFrame({ className, src, alt, sources, ...props }: DeviceFrameProps) {
  const safeAreaBackgroundSrc =
    sources?.find(({ type }) => type === 'image/avif')?.srcSet ?? sources?.[0]?.srcSet ?? src;

  return (
    <ResponsiveDevice
      baseWidth={IPHONE_WIDTH}
      baseHeight={IPHONE_HEIGHT}
      className={className}
      {...props}
    >
      {(scale) => (
        <div
          className="device device-iphone-14-pro device-black"
          style={{
            left: 0,
            position: 'absolute',
            top: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div className="device-frame">
            <div className="device-screen overflow-hidden">
              <div className="relative h-full w-full overflow-hidden bg-[#08090c]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 scale-110 bg-cover bg-center opacity-55 blur-2xl saturate-75"
                  style={{ backgroundImage: `url(${safeAreaBackgroundSrc})` }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
                <div
                  className="relative h-full w-full"
                  style={{
                    paddingBottom: IPHONE_SAFE_AREA_BOTTOM,
                    paddingTop: IPHONE_SAFE_AREA_TOP,
                  }}
                >
                  <MarketingResponsiveImage
                    src={src}
                    sources={sources}
                    alt={alt}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    pictureClassName="h-full w-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DeviceDetails />
        </div>
      )}
    </ResponsiveDevice>
  );
}
