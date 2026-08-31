import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { navetAiService } from '@navet/app/features/navet-ai/navet-ai.service';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistDialog } from './assist-dialog';

const { dispatchEntityCommandMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn(),
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

const registration = getProviderRuntimeRegistration('home_assistant');
const originalConversationService = registration.conversationFeatureService;

describe('AssistDialog assistant switcher', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEYS.assistAssistantMode);
    dispatchEntityCommandMock.mockReset();
    dispatchEntityCommandMock.mockResolvedValue({
      accepted: true,
      requiresEventConfirmation: true,
    });
    registration.conversationFeatureService = {
      getPipelines: async () => ({
        preferredPipelineId: 'home-assistant',
        pipelines: [
          {
            id: 'home-assistant',
            name: 'Home Assistant',
            language: 'en',
            supportsSpeechToText: false,
            supportsTextToSpeech: false,
          },
        ],
      }),
      startTextConversation: vi.fn(),
      startVoiceConversation: vi.fn(),
    };
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
          model: { status: 'ready', selectedId: 'qwen3.5-2b' },
        },
        insights: [],
        feedback: [],
        eventCount: 0,
        lastGeneratedAt: null,
        historyBackfilledAt: null,
      },
    });
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEYS.assistAssistantMode);
    registration.conversationFeatureService = originalConversationService;
    vi.restoreAllMocks();
  });

  it('executes a direct Navet AI chat command and reports the completed action', async () => {
    vi.spyOn(navetAiService, 'chat').mockResolvedValue({
      contract: 'navet.ai.chat',
      version: 1,
      modelId: 'qwen3.5-2b',
      reply: 'I found the matching light.',
      readOnly: true,
      executionRequested: true,
      suggestions: [
        {
          operation: 'turn_on',
          targets: [
            {
              id: 'home_assistant:light.desk_lamp',
              name: 'Desk lamp',
              room: 'Office',
            },
          ],
        },
      ],
    });

    renderWithProviders(<AssistDialog open onOpenChange={vi.fn()} providerId="home_assistant" />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Choose assistant: Home Assistant' }),
      {
        button: 0,
        ctrlKey: false,
      }
    );
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Navet AI' }));
    const input = screen.getByRole('textbox', { name: 'Ask Navet AI…' });
    fireEvent.change(input, { target: { value: 'Turn on the desk lamp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(navetAiService.chat).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
        type: 'turn_on',
        entityId: 'home_assistant:light.desk_lamp',
      })
    );
    expect(await screen.findByText(/Done/)).toBeInTheDocument();
    expect(screen.getByText(/Turned on Desk lamp \(Office\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing has been changed/)).not.toBeInTheDocument();
  });

  it('restores the last selected assistant when the dialog reopens', async () => {
    const firstDialog = renderWithProviders(
      <AssistDialog open onOpenChange={vi.fn()} providerId="home_assistant" />
    );

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Choose assistant: Home Assistant' }),
      {
        button: 0,
        ctrlKey: false,
      }
    );
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Navet AI' }));

    expect(window.localStorage.getItem(STORAGE_KEYS.assistAssistantMode)).toBe('navet_ai');
    firstDialog.unmount();

    renderWithProviders(<AssistDialog open onOpenChange={vi.fn()} providerId="home_assistant" />);

    expect(screen.getByRole('button', { name: 'Choose assistant: Navet AI' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Ask Navet AI…' })).toBeInTheDocument();
  });

  it('renders a verified light count from the read-only entity snapshot', async () => {
    vi.spyOn(navetAiService, 'chat').mockResolvedValue({
      contract: 'navet.ai.chat',
      version: 1,
      modelId: 'qwen3.5-2b',
      reply: '',
      answer: {
        kind: 'lights_on_count',
        count: 1,
        room: 'Office',
      },
      readOnly: true,
      executionRequested: false,
      suggestions: [],
    });

    renderWithProviders(<AssistDialog open onOpenChange={vi.fn()} providerId="home_assistant" />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Choose assistant: Home Assistant' }),
      {
        button: 0,
        ctrlKey: false,
      }
    );
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Navet AI' }));
    const input = screen.getByRole('textbox', { name: 'Ask Navet AI…' });
    fireEvent.change(input, { target: { value: 'How many lights are on in the office?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(navetAiService.chat).toHaveBeenCalledOnce());
    expect(await screen.findByText('Lights on in Office: 1')).toBeInTheDocument();
  });
});
