import { Text } from '@navet/app/components/primitives';
import { MARKETING_SCREENSHOTS } from '@navet/app/marketing/data/marketingDemoData';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { AndroidPhoneFrame, IpadFrame } from '@website/components/devices/device-frames';

export function MarketingThemeShowcaseSection({ className }: { className?: string }) {
  const wallPanelScreenshot = MARKETING_SCREENSHOTS[0];
  const phoneScreenshot = MARKETING_SCREENSHOTS[2];

  return (
    <MarketingSectionShell
      title="From wall panel to phone, the same home stays familiar."
      description="See the actual Navet Home dashboard adapt from a landscape wall panel to the same everyday controls on a phone."
      variant="editorial"
      compactMobile
      className={className}
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.018))] p-3 shadow-[0_36px_100px_-58px_rgba(0,0,0,0.92)] sm:rounded-[36px] sm:p-5 md:p-7 lg:p-9">
        <div className="pointer-events-none absolute -top-20 left-[8%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.2),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute right-[4%] bottom-[-5rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.13),transparent_72%)] blur-3xl" />

        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.32fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.3fr)] sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.27fr)] lg:gap-8">
          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            <Text className="text-xs font-medium text-white/62 sm:text-sm">Wall panel</Text>
            <IpadFrame
              src={wallPanelScreenshot.src}
              sources={wallPanelScreenshot.sources}
              alt={wallPanelScreenshot.alt}
            />
          </div>

          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            <Text className="text-xs font-medium text-white/62 sm:text-sm">Phone</Text>
            <AndroidPhoneFrame
              src={phoneScreenshot.src}
              sources={phoneScreenshot.sources}
              alt={phoneScreenshot.alt}
            />
          </div>
        </div>
      </div>
    </MarketingSectionShell>
  );
}
