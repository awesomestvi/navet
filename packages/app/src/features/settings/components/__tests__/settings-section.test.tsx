import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSection } from '../settings-section';

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    window.__NAVET_PANEL__ = undefined;
    document.documentElement.style.scrollbarGutter = '';
  });

  it('shows Smart features as a first-class settings destination', () => {
    useNavetAiStore.setState({
      loading: false,
      error: null,
      state: {
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
          model: { status: 'not_downloaded', selectedId: 'qwen3.5-0.8b' },
        },
        insights: [],
        feedback: [],
        eventCount: 0,
        lastGeneratedAt: null,
        historyBackfilledAt: null,
      },
    });
    renderWithProviders(<SettingsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Smart features' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Smart features' })).toBeInTheDocument();
    expect(screen.getByText(/help Navet notice, prioritize, and explain/i)).toBeInTheDocument();
    expect(screen.getByText(/model not downloaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/not_downloaded/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toHaveClass('h-9', 'rounded-full');
  });

  it('does not offer Smart features in the browser-only Home Assistant panel', () => {
    window.__NAVET_PANEL__ = true;
    renderWithProviders(<SettingsSection />);
    expect(screen.queryByRole('button', { name: 'Smart features' })).not.toBeInTheDocument();
  });

  it('shows model download progress and cancellation in settings', () => {
    useNavetAiStore.setState({
      loading: false,
      error: null,
      state: {
        contract: 'navet.ai',
        version: 1,
        settings: {
          enabled: true,
          dailyGenerationEnabled: true,
          locale: 'en',
          modelDownloadConsented: true,
        },
        capabilities: {
          available: true,
          readOnly: true,
          supportsHistoryBackfill: true,
          storageOwner: 'installation',
          rawRetentionDays: 30,
          aggregateRetentionMonths: 12,
          model: {
            status: 'downloading',
            selectedId: 'qwen3.5-2b',
            downloadBytes: 1_396_198_496,
            downloadedBytes: 698_099_248,
          },
        },
        insights: [],
        feedback: [],
        eventCount: 0,
        lastGeneratedAt: null,
        historyBackfilledAt: null,
      },
    });

    renderWithProviders(<SettingsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Smart features' }));

    expect(screen.getByRole('progressbar', { name: 'Model download progress' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );
    expect(screen.getByRole('button', { name: 'Cancel download' })).toBeInTheDocument();
  });

  it('shows installed model identity, storage details, and guarded removal', () => {
    const deleteModel = vi.fn();
    useNavetAiStore.setState({
      loading: false,
      error: null,
      deleteModel,
      state: {
        contract: 'navet.ai',
        version: 1,
        settings: {
          enabled: true,
          dailyGenerationEnabled: true,
          locale: 'en',
          modelDownloadConsented: true,
        },
        capabilities: {
          available: true,
          readOnly: true,
          supportsHistoryBackfill: true,
          storageOwner: 'installation',
          rawRetentionDays: 30,
          aggregateRetentionMonths: 12,
          model: {
            status: 'ready',
            selectedId: 'qwen3.5-2b',
            downloadBytes: 1_396_198_496,
            downloadedBytes: 1_396_198_496,
          },
        },
        insights: [],
        feedback: [],
        eventCount: 0,
        lastGeneratedAt: null,
        historyBackfilledAt: null,
      },
    });

    renderWithProviders(<SettingsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Smart features' }));

    expect(screen.getByText('Qwen 3.5')).toBeInTheDocument();
    expect(screen.getByText('2B · Q4_K_M')).toBeInTheDocument();
    expect(screen.getByText('1.3 GB')).toBeInTheDocument();
    expect(screen.getByText('Apache-2.0')).toBeInTheDocument();
    expect(screen.getByText('This installation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove model' }));
    expect(screen.getByRole('heading', { name: 'Remove the local model?' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove model' })
    );
    expect(deleteModel).toHaveBeenCalledTimes(1);
  });

  it('restores the persisted tab after remounting', async () => {
    const firstRender = renderWithProviders(<SettingsSection />);

    fireEvent.click(screen.getByRole('button', { name: 'System' }));

    await waitFor(() =>
      expect(localStorage.getItem('navet-settings-active-tab')).toBe(JSON.stringify('system'))
    );

    firstRender.unmount();
    renderWithProviders(<SettingsSection />);

    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument();
  });

  it('uses a settings sidebar without the former hero', () => {
    renderWithProviders(<SettingsSection />);

    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.queryByText('A calmer place to tune Navet.')).not.toBeInTheDocument();
  });

  it('uses an overlay detail scrollbar without reserving permanent layout space', () => {
    document.documentElement.style.scrollbarGutter = 'auto';

    renderWithProviders(<SettingsSection />);

    const detailScroll = document.querySelector('[data-settings-detail-scroll]');
    expect(detailScroll).toHaveClass('scrollbar-hide');
    expect(detailScroll?.closest('.overlay-scroll-area')).toBeInTheDocument();
    expect(document.documentElement.style.scrollbarGutter).toBe('auto');
    expect((detailScroll as HTMLElement).style.scrollbarGutter).toBe('');
  });

  it('filters settings destinations from the sidebar search', () => {
    renderWithProviders(<SettingsSection />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'system' },
    });

    expect(screen.getByRole('button', { name: 'System, System' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Appearance' })).not.toBeInTheDocument();
  });

  it('finds a nested setting and navigates to it in the parent section', async () => {
    renderWithProviders(<SettingsSection />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'visual quality' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Visual quality, Appearance' }));

    const target = await screen.findByText('Visual quality', { selector: 'h3' });
    await waitFor(() => expect(target.closest('[data-settings-search-label]')).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('uses list-to-detail navigation on mobile and returns to the category list', () => {
    setMediaQueryMatch('(max-width: 767px)', true);
    renderWithProviders(<SettingsSection />);

    const navigation = screen.getByRole('navigation', { name: 'Settings' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Localization' }));

    expect(screen.queryByRole('navigation', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Localization' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
  });
});
