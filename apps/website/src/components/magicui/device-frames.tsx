import type { HTMLAttributes, ImgHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

interface DeviceImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
}

function DeviceImage({ src, alt, className, ...props }: DeviceImageProps) {
  return <img src={src} alt={alt} className={cn('h-full w-full object-cover', className)} loading="lazy" {...props} />;
}

export interface IpadFrameProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
}

export function IpadFrame({ className, src, alt, ...props }: IpadFrameProps) {
  return (
    <div className={cn('relative aspect-[1.37/1] w-full', className)} {...props}>
      <div className="absolute inset-0 rounded-[2.5rem] bg-[linear-gradient(180deg,#15161d,#07080c)] shadow-[0_40px_110px_-56px_rgba(0,0,0,0.85)] ring-1 ring-white/12" />
      <div className="absolute inset-[10px] rounded-[2.1rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] ring-1 ring-white/8" />
      <div className="absolute inset-[18px] overflow-hidden rounded-[1.7rem] bg-black">
        <DeviceImage src={src} alt={alt} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_18%,transparent_82%,rgba(0,0,0,0.18))]" />
      </div>
      <div className="absolute left-[10px] top-1/2 h-10 w-[5px] -translate-y-1/2 rounded-full bg-white/12" />
      <div className="absolute right-[10px] top-1/2 h-16 w-[5px] -translate-y-1/2 rounded-full bg-white/12" />
      <div className="absolute left-1/2 top-[10px] h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-zinc-900 shadow-[0_0_0_2px_rgba(255,255,255,0.04)]" />
    </div>
  );
}

export interface AndroidPhoneFrameProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
}

export function AndroidPhoneFrame({ className, src, alt, ...props }: AndroidPhoneFrameProps) {
  return (
    <div className={cn('relative aspect-[412/870] w-full', className)} {...props}>
      <div className="absolute inset-0 rounded-[2.2rem] bg-[linear-gradient(180deg,#1a1b22,#090a0e)] shadow-[0_34px_90px_-46px_rgba(0,0,0,0.82)] ring-1 ring-white/10" />
      <div className="absolute inset-[8px] rounded-[1.85rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] ring-1 ring-white/7" />
      <div className="absolute inset-[15px] overflow-hidden rounded-[1.55rem] bg-black">
        <DeviceImage src={src} alt={alt} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18%,transparent_84%,rgba(0,0,0,0.15))]" />
      </div>
      <div className="absolute left-1/2 top-[13px] z-[2] h-3 w-3 -translate-x-1/2 rounded-full bg-zinc-900 shadow-[0_0_0_2px_rgba(255,255,255,0.04)]" />
      <div className="absolute right-[7px] top-[132px] h-14 w-[4px] rounded-full bg-white/10" />
      <div className="absolute left-[7px] top-[118px] h-10 w-[4px] rounded-full bg-white/10" />
    </div>
  );
}
