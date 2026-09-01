import { useI18n, useIntegrationStore } from '@navet/app/hooks';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { INTEGRATION_PROVIDER_IDS, type IntegrationProviderId } from '@navet/app/types/provider';
import { MessageCircle } from 'lucide-react';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';

const AssistDialog = lazy(async () => {
  const module = await import('@navet/app/features/dashboard/components/widgets/assist-dialog');
  return { default: module.AssistDialog };
});

function supportsAssist(providerId: IntegrationProviderId) {
  return Boolean(getProviderRuntimeRegistration(providerId).conversationFeatureService);
}

interface HeaderAssistActionProps {
  hoverBg?: string;
  renderTrigger?: (props: { isOpen: boolean; onClick: () => void }) => ReactNode;
  textSecondary?: string;
}

export function HeaderAssistAction({
  hoverBg = '',
  renderTrigger,
  textSecondary = '',
}: HeaderAssistActionProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState<string>();
  const providerId = useIntegrationStore((state) => {
    const candidates = [
      state.currentProviderId,
      ...INTEGRATION_PROVIDER_IDS.filter((id) => id !== state.currentProviderId),
    ];

    return (
      candidates.find(
        (id) =>
          Boolean(state.providerSessions[id]) &&
          state.providerHealth[id]?.connected === true &&
          supportsAssist(id)
      ) ?? null
    );
  });

  useEffect(() => {
    if (!providerId) setIsOpen(false);
  }, [providerId]);

  if (!providerId) return null;

  const trigger = renderTrigger ? (
    renderTrigger({ isOpen, onClick: () => setIsOpen(true) })
  ) : (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[22px] ${hoverBg} transition-colors`}
      aria-label={t('widgets.assist.open')}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      <MessageCircle className={`h-5 w-5 ${textSecondary}`} />
    </button>
  );

  return (
    <>
      {trigger}

      {isOpen ? (
        <Suspense fallback={null}>
          <AssistDialog
            open
            onOpenChange={setIsOpen}
            providerId={providerId}
            pipelineId={pipelineId}
            onPipelineChange={setPipelineId}
          />
        </Suspense>
      ) : null}
    </>
  );
}
