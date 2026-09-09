import { Button } from '@navet/app/components/primitives/button';
import { Text } from '@navet/app/components/primitives/text';
import { MARKETING_URLS } from '@navet/app/marketing/constants/marketingLinks';
import { MARKETING_TEASER_CONTENT } from '@navet/app/marketing/data/marketingContent';
import { Play, X } from 'lucide-react';
import { lazy, Suspense, useRef, useState } from 'react';

const TeaserModal = lazy(async () => {
  const [{ ModalSurface }, { I18nProvider }] = await Promise.all([
    import('@navet/app/components/primitives/modal-surface'),
    import('@navet/app/i18n/i18n-provider'),
  ]);
  return {
    default: ({ onClose }: { onClose: () => void }) => (
      <I18nProvider>
        <ModalSurface
          isOpen
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          title={MARKETING_TEASER_CONTENT.videoTitle}
          contentClassName="w-[calc(100vw-2rem)] sm:max-w-4xl"
          bodyClassName="overflow-hidden p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Text as="span" className="text-sm font-medium">
              1-minute tour
            </Text>
            <Button variant="ghost" size="compact" iconOnly label="Close tour" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <iframe
            className="block aspect-video h-auto w-full rounded-xl border-0 bg-black"
            src={MARKETING_URLS.teaserEmbed}
            title={MARKETING_TEASER_CONTENT.videoTitle}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            allowFullScreen
          />
        </ModalSurface>
      </I18nProvider>
    ),
  };
});

export function MarketingTeaserButton() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTour = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        className="w-full justify-center sm:w-auto"
        leading={<Play className="h-4 w-4" aria-hidden="true" />}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        {MARKETING_TEASER_CONTENT.cta}
      </Button>
      {isOpen ? (
        <Suspense fallback={null}>
          <TeaserModal onClose={closeTour} />
        </Suspense>
      ) : null}
    </>
  );
}
