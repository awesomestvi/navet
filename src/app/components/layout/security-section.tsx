import { Video } from 'lucide-react';
import { useDevices, useI18n } from '@/app/hooks';
import { DeviceSectionLayout } from './device-section-layout';

export function SecuritySection() {
  const { t } = useI18n();
  const devices = useDevices();
  return (
    <DeviceSectionLayout
      devices={devices.cameras.map((d) => ({ ...d, type: 'cameras' as const }))}
      rawDevices={devices}
      emptyIcon={Video}
      emptyTitle={t('sections.security.emptyTitle')}
      emptyDescription={t('sections.security.emptyDescription')}
      title={t('sections.security.title')}
      singularLabel={t('sections.security.singular')}
      pluralLabel={t('sections.security.plural')}
      customizable
    />
  );
}
