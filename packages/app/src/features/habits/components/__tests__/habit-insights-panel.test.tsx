import { useHabitStore } from '@navet/app/features/habits/habit-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { HabitInsight, HabitRule } from '@navet/core/habits';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HabitInsightsPanel } from '../habit-insights-panel';

const { createAutomationFromHabitRuleMock } = vi.hoisted(() => ({
  createAutomationFromHabitRuleMock: vi.fn(async () => ({
    automationId: 'navet_morning_lights',
    entityId: 'automation.navet_morning_lights',
  })),
}));

vi.mock('@navet/app/services/integration-task.service', () => ({
  integrationTaskService: {
    createAutomationFromHabitRule: createAutomationFromHabitRuleMock,
  },
}));

const suggestedRule = {
  id: 'habit-rule:morning-lights',
  sourceCandidateId: 'habit-candidate:morning-lights',
  enabled: true,
  scope: 'navet_local',
  trigger: {
    days: [1, 2, 3, 4, 5],
    startMinute: 420,
    endMinute: 480,
    presence: 'home',
  },
  action: {
    type: 'turn_on',
    entityIds: ['light.kitchen', 'switch.coffee'],
  },
  safety: {
    allowDomains: ['light', 'switch'],
    requireUserCreated: true,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies HabitRule;

const insight = {
  id: 'habit-insight:morning-lights',
  candidateId: 'habit-candidate:morning-lights',
  title: 'Morning lights',
  summary: 'Kitchen lights are usually turned on around breakfast.',
  confidence: 0.82,
  confidenceLabel: 'high',
  evidence: ['Seen 5 times on weekdays', 'Usually happens between 07:00 and 08:00'],
  suggestedRule,
  status: 'new',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies HabitInsight;

describe('HabitInsightsPanel', () => {
  beforeEach(async () => {
    await resetAppStores();
    createAutomationFromHabitRuleMock.mockClear();
  });

  it('asks for confirmation before creating a provider automation from a suggested rule', async () => {
    const addFeedback = vi.fn(async () => ({
      id: 'feedback:created-rule',
      timestamp: '2026-01-01T00:01:00.000Z',
      insightId: insight.id,
      candidateId: insight.candidateId,
      outcome: 'created_rule' as const,
    }));
    const saveRule = vi.fn(async () => undefined);
    useHabitStore.setState({
      enabled: true,
      initialized: true,
      insights: [insight],
      addFeedback,
      saveRule,
    });

    renderWithProviders(<HabitInsightsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }));

    expect(createAutomationFromHabitRuleMock).not.toHaveBeenCalled();
    expect(addFeedback).not.toHaveBeenCalled();
    expect(saveRule).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Create this automation?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Morning lights/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/07:00-08:00/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Turn selected devices on/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/2 device/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/High confidence/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create automation' }));

    await waitFor(() => {
      expect(createAutomationFromHabitRuleMock).toHaveBeenCalledWith(suggestedRule, {
        name: insight.title,
        description: insight.summary,
      });
      expect(addFeedback).toHaveBeenCalledWith({
        insightId: insight.id,
        candidateId: insight.candidateId,
        outcome: 'created_rule',
      });
      expect(saveRule).not.toHaveBeenCalled();
    });
  });

  it('saves a suggested rule locally when provider automation creation is unsupported', async () => {
    createAutomationFromHabitRuleMock.mockRejectedValueOnce(
      new Error('Creating automations is not supported for the current integration yet')
    );
    const addFeedback = vi.fn(async () => ({
      id: 'feedback:created-rule',
      timestamp: '2026-01-01T00:01:00.000Z',
      insightId: insight.id,
      candidateId: insight.candidateId,
      outcome: 'created_rule' as const,
    }));
    const saveRule = vi.fn(async () => undefined);
    useHabitStore.setState({
      enabled: true,
      initialized: true,
      insights: [insight],
      addFeedback,
      saveRule,
    });

    renderWithProviders(<HabitInsightsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Create rule' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Create automation',
      })
    );

    await waitFor(() => {
      expect(createAutomationFromHabitRuleMock).toHaveBeenCalledWith(suggestedRule, {
        name: insight.title,
        description: insight.summary,
      });
      expect(saveRule).toHaveBeenCalledWith({
        ...suggestedRule,
        name: insight.title,
        description: insight.summary,
      });
      expect(addFeedback).toHaveBeenCalledWith({
        insightId: insight.id,
        candidateId: insight.candidateId,
        outcome: 'created_rule',
      });
    });
  });
});
