import { Lock } from 'lucide-react';
import { useDevices, useI18n } from '@/app/hooks';
import { DeviceSectionLayout } from './device-section-layout';

export function LocksSection() {
  const { t } = useI18n();
  const devices = useDevices();
  return (
    <DeviceSectionLayout
      devices={devices.locks.map((d) => ({ ...d, type: 'locks' as const }))}
      rawDevices={devices}
      emptyIcon={Lock}
      emptyTitle={t('sections.locks.emptyTitle')}
      emptyDescription={t('sections.locks.emptyDescription')}
      title={t('sections.locks.title')}
      singularLabel={t('sections.locks.singular')}
      pluralLabel={t('sections.locks.plural')}
      customizable
    />
  );
}
