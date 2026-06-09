import { getVacuumStatusLabelKey, type VacuumStatus } from './vacuum-utils';

type VacuumDisplayStatus = VacuumStatus | 'unavailable';
type VacuumSummaryFactKind = 'area' | 'battery' | 'time' | 'speed' | 'lastCleaned';

interface ResolveVacuumCardSummaryOptions {
  status: VacuumDisplayStatus;
  room?: string;
  battery?: number;
  cleanedArea?: string;
  cleaningTime?: string;
  fanSpeed?: string;
  lastCleaned?: string;
  t: (key: string) => string;
}

interface VacuumCardSummary {
  primaryText: string;
  secondaryFacts: Array<{
    kind: VacuumSummaryFactKind;
    label: string;
    value: string;
  }>;
}

function appendSummaryFact(
  facts: VacuumCardSummary['secondaryFacts'],
  kind: VacuumSummaryFactKind,
  label: string,
  value: string
) {
  if (value.trim().length === 0) {
    return;
  }

  facts.push({ kind, label, value });
}

function capitalizeSummaryValue(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function resolveVacuumCardSummary({
  status,
  room: _room,
  battery,
  cleanedArea,
  cleaningTime,
  fanSpeed,
  lastCleaned,
  t,
}: ResolveVacuumCardSummaryOptions): VacuumCardSummary {
  const facts: VacuumCardSummary['secondaryFacts'] = [];

  if (cleanedArea) {
    appendSummaryFact(facts, 'area', t('vacuum.metric.area'), cleanedArea);
  }

  if (typeof battery === 'number') {
    appendSummaryFact(facts, 'battery', t('vacuum.settings.battery'), `${battery}%`);
  }

  if (cleaningTime) {
    appendSummaryFact(facts, 'time', t('vacuum.metric.runTime'), cleaningTime);
  }

  if (fanSpeed) {
    appendSummaryFact(facts, 'speed', t('vacuum.summary.speed'), capitalizeSummaryValue(fanSpeed));
  }

  if (lastCleaned) {
    appendSummaryFact(facts, 'lastCleaned', t('vacuum.detail.lastCleaned'), lastCleaned);
  }

  return {
    primaryText:
      status === 'unavailable'
        ? t('vacuum.status.unavailable')
        : t(getVacuumStatusLabelKey(status)),
    secondaryFacts: facts,
  };
}
