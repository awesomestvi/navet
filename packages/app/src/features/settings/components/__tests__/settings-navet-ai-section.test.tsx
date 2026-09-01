import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { getSettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import type { SettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsNavetAiSection } from '../settings-navet-ai-section';

const controller = {
  styles: getSettingsSectionStyles('glass', 'yellow'),
} as SettingsSectionController;

const enabledState = {
  contract: 'navet.ai' as const,
  version: 2 as const,
  settings: {
    enabled: true,
    dailyGenerationEnabled: true,
    locale: 'en',
    modelDownloadConsented: false,
    priorityFeedEnabled: true,
    learningEnabled: false,
    historyBackfillEnabled: false,
  },
  capabilities: {
    available: true,
    readOnly: true as const,
    supportsHistoryBackfill: true,
    storageOwner: 'installation' as const,
    rawRetentionDays: 30 as const,
    aggregateRetentionMonths: 12 as const,
    model: {
      status: 'not_downloaded' as const,
      selectedId: 'qwen3.5-0.8b' as const,
      downloadBytes: 563_036_064,
    },
  },
  insights: [],
  feedback: [],
  eventCount: 4,
  lastGeneratedAt: null,
  historyBackfilledAt: null,
  priorityFeedback: [],
};

describe('SettingsNavetAiSection', () => {
  beforeEach(() => {
    useNavetAiStore.setState({
      state: enabledState,
      loading: false,
      error: null,
      reset: vi.fn(),
      updateSettings: vi.fn(),
    });
  });

  it('requires confirmation before the master shutdown', async () => {
    const reset = vi.fn();
    useNavetAiStore.setState({ reset });
    renderWithProviders(<SettingsNavetAiSection controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Turn off smart features' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'permanently deletes the local AI model, learned observations, aggregates, feedback, priority choices, and generated insights'
    );
    const actions = screen.getAllByRole('button', { name: 'Turn off smart features' });
    fireEvent.click(actions.at(-1) as HTMLButtonElement);

    await waitFor(() => expect(reset).toHaveBeenCalledOnce());
  });

  it('shows only a safe re-enable path after shutdown', () => {
    const updateSettings = vi.fn();
    useNavetAiStore.setState({
      state: {
        ...enabledState,
        settings: { ...enabledState.settings, enabled: false, priorityFeedEnabled: false },
      },
      updateSettings,
    });
    renderWithProviders(<SettingsNavetAiSection controller={controller} />);

    expect(screen.queryByText('Local model')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Turn on smart features' }));
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, priorityFeedEnabled: true })
    );
  });
});
