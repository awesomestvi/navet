import { summarizeActionSequence } from './automation-action-formatter';
import { summarizeCondition } from './automation-condition-formatter';
import type { AutomationConfigSections } from './automation-config-sections';
import type { AutomationConfigSummaryOptions } from './automation-formatter-helpers';
import { summarizeTrigger } from './automation-trigger-formatter';

function ensureArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? [] : [value];
}

function buildOverview({
  description,
  actions,
  triggers,
}: Pick<AutomationConfigSections, 'description' | 'actions' | 'triggers'>): string | undefined {
  if (description?.trim()) {
    return description.trim();
  }

  const action = actions[0];
  const trigger = triggers[0];

  if (action && trigger) {
    return `${action} when ${trigger.charAt(0).toLowerCase()}${trigger.slice(1)}`;
  }

  return action ?? trigger ?? undefined;
}

export function buildAutomationConfigSections(
  config: Record<string, unknown>,
  options: AutomationConfigSummaryOptions = {}
): AutomationConfigSections {
  const triggers = ensureArray(config.triggers ?? config.trigger)
    .map((trigger) => summarizeTrigger(trigger, options))
    .filter((value): value is string => Boolean(value));
  const conditions = ensureArray(config.conditions ?? config.condition)
    .map((condition) => summarizeCondition(condition, options))
    .filter((value): value is string => Boolean(value));
  const actions = summarizeActionSequence(config.actions ?? config.action, options);
  const description =
    typeof config.description === 'string' && config.description.trim()
      ? config.description
      : undefined;

  return {
    overview: buildOverview({ description, actions, triggers }),
    description,
    triggers,
    conditions,
    actions,
  };
}
