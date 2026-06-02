import type { HTMLAttributes } from 'react';
import { cn } from '@navet/app/components/ui/utils';
import { MarketingResponsiveImage, type MarketingResponsiveImageSource } from '@navet/app/marketing/components/MarketingResponsiveImage';

export interface IphoneProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  sources?: readonly MarketingResponsiveImageSource[];
  videoSrc?: string;
}

export function Iphone({ className, style, src, sources, videoSrc, ...props }: IphoneProps) {
  return (
    <div
      className={cn('relative aspect-[433/882] w-full', className)}
      style={style}
      {...props}
    >
      <div className="absolute inset-0 rounded-[3rem] bg-[linear-gradient(180deg,#101116,#05060a)] shadow-[0_28px_80px_-38px_rgba(0,0,0,0.78)] ring-1 ring-white/12" />
      <div className="absolute inset-[10px] rounded-[2.55rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] ring-1 ring-white/8" />
      <div className="absolute inset-[18px] overflow-hidden rounded-[2.2rem] bg-black">
        {src ? (
          <MarketingResponsiveImage
            src={src}
            sources={sources}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        {videoSrc ? (
          <video
            src={videoSrc}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_16%,transparent_84%,rgba(0,0,0,0.16))]" />
      </div>
      <div className="absolute left-1/2 top-[22px] z-[2] h-[30px] w-[138px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/8">
        <div className="absolute left-1/2 top-1/2 h-[9px] w-[9px] -translate-x-[44px] -translate-y-1/2 rounded-full bg-zinc-800 shadow-[0_0_0_2px_rgba(255,255,255,0.03)]" />
        <div className="absolute left-1/2 top-1/2 h-[8px] w-[8px] translate-x-[32px] -translate-y-1/2 rounded-full bg-zinc-900 shadow-[0_0_0_2px_rgba(255,255,255,0.02)]" />
      </div>
      <div className="absolute right-[8px] top-[120px] h-[72px] w-[4px] rounded-full bg-white/10" />
      <div className="absolute left-[8px] top-[110px] h-[28px] w-[4px] rounded-full bg-white/10" />
      <div className="absolute left-[8px] top-[148px] h-[56px] w-[4px] rounded-full bg-white/10" />
    </div>
  );
}
