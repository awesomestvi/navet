import { Text } from '@navet/app/components/primitives';
import { MarketingReveal } from '@navet/app/marketing/components/MarketingReveal';
import { MARKETING_SCREENSHOTS } from '@navet/app/marketing/data/marketingDemoData';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { IpadFrame, IphoneFrame } from '@website/components/devices/device-frames';

export function MarketingThemeShowcaseSection({ className }: { className?: string }) {
  const wallPanelScreenshot = MARKETING_SCREENSHOTS[0];
  const phoneScreenshot = MARKETING_SCREENSHOTS[2];

  return (
    <MarketingSectionShell
      title="At home on every screen."
      description="The same familiar controls, from the hallway wall to the phone in your hand."
      variant="editorial"
      compactMobile
      className={className}
    >
      <MarketingReveal className="marketing-device-showcase relative px-2 py-5 sm:px-5 sm:py-8 lg:px-8">
        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.32fr)] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.3fr)] sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.27fr)] lg:gap-10">
          <div className="marketing-device-tablet min-w-0 space-y-2.5 sm:space-y-3">
            <Text className="text-xs font-medium text-white/62 sm:text-sm">Wall panel</Text>
            <IpadFrame
              src={wallPanelScreenshot.src}
              sources={wallPanelScreenshot.sources}
              alt={wallPanelScreenshot.alt}
            />
          </div>

          <div className="marketing-device-phone min-w-0 space-y-2.5 sm:space-y-3">
            <Text className="text-xs font-medium text-white/62 sm:text-sm">Phone</Text>
            <IphoneFrame
              src={phoneScreenshot.src}
              sources={phoneScreenshot.sources}
              alt={phoneScreenshot.alt}
            />
          </div>
        </div>
      </MarketingReveal>
    </MarketingSectionShell>
  );
}
