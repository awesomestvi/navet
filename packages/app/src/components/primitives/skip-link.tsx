import { useI18n } from '@navet/app/i18n';

type SkipLinkProps = {
  targetId: string;
};

export function SkipLink({ targetId }: SkipLinkProps) {
  const { t } = useI18n();
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:not-sr-only focus:rounded-lg focus:bg-slate-950 focus:px-4 focus:py-3 focus:text-white focus:ring-2 focus:ring-orange-400"
    >
      {t('common.skipToMainContent')}
    </a>
  );
}
