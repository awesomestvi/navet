import type { NavetAiState } from '@navet/app/features/navet-ai/navet-ai.contract';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavetAiSection } from './navet-ai-section';

const state: NavetAiState = {
  contract: 'navet.ai',
  version: 1,
  settings: {
    enabled: true,
    dailyGenerationEnabled: true,
    locale: 'en',
    modelDownloadConsented: false,
  },
  capabilities: {
    available: true,
    readOnly: true,
    supportsHistoryBackfill: true,
    storageOwner: 'installation',
    rawRetentionDays: 30,
    aggregateRetentionMonths: 12,
    model: { status: 'not_downloaded', selectedId: 'qwen3.5-0.8b', downloadBytes: 563_036_064 },
  },
  insights: [],
  feedback: [],
  eventCount: 0,
  lastGeneratedAt: null,
  historyBackfilledAt: null,
};

describe('NavetAiSection', () => {
  beforeEach(() => {
    useNavetAiStore.setState({ state, loading: false, error: null });
  });

  it('keeps deterministic generation available before the optional model is downloaded', () => {
    renderWithProviders(<NavetAiSection />);
    expect(screen.getByRole('button', { name: 'Generate now' })).toBeEnabled();
    expect(screen.getByText('Read and suggest only')).toBeInTheDocument();
  });

  it('shows byte-backed model progress and a cancel action while downloading', () => {
    useNavetAiStore.setState({
      state: {
        ...state,
        capabilities: {
          ...state.capabilities,
          model: {
            ...state.capabilities.model,
            status: 'downloading',
            downloadedBytes: 140_759_040,
          },
        },
      },
      cancelModelDownload: vi.fn(),
    });

    renderWithProviders(<NavetAiSection />);

    expect(screen.getByRole('progressbar', { name: 'Model download progress' })).toHaveAttribute(
      'aria-valuenow',
      '25'
    );
    expect(screen.getByRole('button', { name: 'Cancel download' })).toBeInTheDocument();
  });

  it('offers feedback but never a device, routine, automation, or notification action', () => {
    useNavetAiStore.setState({
      state: {
        ...state,
        insights: [
          {
            id: 'insight:one',
            evidenceId: 'one',
            detectorId: 'manual_light_routine',
            category: 'routine',
            observation: 'activation_pattern',
            title: 'A repeated pattern',
            summary: 'Observed three samples around 07:00.',
            confidence: 0.8,
            confidenceLabel: 'high',
            facts: ['Observed 3 similar events.'],
            entityIds: ['home_assistant:light.kitchen'],
            status: 'new',
            createdAt: '2026-08-30T05:30:00.000Z',
          },
        ],
      },
      addFeedback: vi.fn(),
    });
    renderWithProviders(<NavetAiSection />);
    expect(screen.getByRole('button', { name: 'Helpful' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /turn|run|create|notify|automat/i })
    ).not.toBeInTheDocument();
  });
});
