import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantConversationFeatureService } from './homeassistant-conversation-feature.service';

const bridgeMocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  resolveProxyUrl: vi.fn((url: string) => `https://ha.local${url}`),
  sendBinary: vi.fn(),
}));

vi.mock('./homeassistant-service-bridge', () => ({
  getHomeAssistantConnection: bridgeMocks.getConnection,
  resolveHomeAssistantProxyUrl: bridgeMocks.resolveProxyUrl,
  sendHomeAssistantWebSocketBinary: bridgeMocks.sendBinary,
}));

describe('homeAssistantConversationFeatureService', () => {
  beforeEach(() => {
    for (const mock of Object.values(bridgeMocks)) mock.mockReset();
    bridgeMocks.resolveProxyUrl.mockImplementation((url: string) => `https://ha.local${url}`);
  });

  it('normalizes pipeline capabilities and the preferred pipeline', async () => {
    bridgeMocks.getConnection.mockReturnValue({
      subscribeMessage: vi.fn(),
      sendMessagePromise: vi.fn().mockResolvedValue({
        preferred_pipeline: 'pipeline-1',
        pipelines: [
          {
            id: 'pipeline-1',
            name: 'Home Assistant',
            language: 'en',
            conversation_engine: 'conversation.home_assistant',
            stt_engine: 'stt.whisper',
            tts_engine: 'tts.piper',
          },
        ],
      }),
    });

    await expect(homeAssistantConversationFeatureService.getPipelines()).resolves.toEqual({
      preferredPipelineId: 'pipeline-1',
      pipelines: [
        {
          id: 'pipeline-1',
          name: 'Home Assistant',
          language: 'en',
          conversationEngineId: 'conversation.home_assistant',
          supportsSpeechToText: true,
          supportsTextToSpeech: true,
        },
      ],
    });
  });

  it('runs a typed conversation and normalizes streamed response events', async () => {
    const listener = vi.fn();
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn(async (callback: (event: unknown) => void) => {
      callback({
        type: 'run-start',
        data: { pipeline: 'pipeline-1', conversation_id: 'conversation-1' },
      });
      callback({ type: 'intent-progress', data: { chat_log_delta: { content: 'Hello' } } });
      callback({
        type: 'intent-end',
        data: {
          intent_output: {
            conversation_id: 'conversation-1',
            continue_conversation: true,
            response: {
              response_type: 'action_done',
              speech: { plain: { speech: 'Hello there' } },
            },
          },
        },
      });
      callback({ type: 'run-end', data: null });
      return unsubscribe;
    });
    bridgeMocks.getConnection.mockReturnValue({
      subscribeMessage,
      sendMessagePromise: vi.fn(),
    });

    const handle = await homeAssistantConversationFeatureService.startTextConversation(
      {
        text: 'Hello',
        pipelineId: 'pipeline-1',
        conversationId: 'conversation-1',
      },
      listener
    );

    expect(subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: 'assist_pipeline/run',
      start_stage: 'intent',
      end_stage: 'intent',
      input: { text: 'Hello' },
      pipeline: 'pipeline-1',
      conversation_id: 'conversation-1',
    });
    expect(listener).toHaveBeenCalledWith({
      type: 'response-delta',
      text: 'Hello',
      thinkingText: undefined,
    });
    expect(listener).toHaveBeenCalledWith({
      type: 'response',
      conversationId: 'conversation-1',
      text: 'Hello there',
      responseType: 'action_done',
      continueConversation: true,
    });
    handle.cancel();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('frames microphone PCM with the Home Assistant binary handler id', async () => {
    let emitEvent: ((event: unknown) => void) | undefined;
    const subscribeMessage = vi.fn(async (callback: (event: unknown) => void) => {
      emitEvent = callback;
      callback({
        type: 'run-start',
        data: {
          pipeline: 'pipeline-1',
          runner_data: { stt_binary_handler_id: 7 },
        },
      });
      return vi.fn();
    });
    bridgeMocks.getConnection.mockReturnValue({
      subscribeMessage,
      sendMessagePromise: vi.fn(),
    });

    const handle = await homeAssistantConversationFeatureService.startVoiceConversation(
      { sampleRate: 48_000, pipelineId: 'pipeline-1', playAudioResponse: true },
      vi.fn()
    );
    handle.sendAudio?.(new Int16Array([1, -2]));
    handle.finishAudio?.();

    expect(bridgeMocks.sendBinary).not.toHaveBeenCalled();
    emitEvent?.({ type: 'stt-start', data: {} });

    expect(subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: 'assist_pipeline/run',
      start_stage: 'stt',
      end_stage: 'tts',
      input: { sample_rate: 48_000 },
      pipeline: 'pipeline-1',
    });
    expect(Array.from(bridgeMocks.sendBinary.mock.calls[0]?.[0] as Uint8Array)).toEqual([
      7, 1, 0, 254, 255,
    ]);
    expect(Array.from(bridgeMocks.sendBinary.mock.calls[1]?.[0] as Uint8Array)).toEqual([7]);
  });

  it('normalizes transcript, response audio, and errors', async () => {
    const listener = vi.fn();
    bridgeMocks.getConnection.mockReturnValue({
      sendMessagePromise: vi.fn(),
      subscribeMessage: vi.fn(async (callback: (event: unknown) => void) => {
        callback({ type: 'stt-start', data: {} });
        callback({ type: 'stt-end', data: { stt_output: { text: 'Turn on the lights' } } });
        callback({
          type: 'tts-end',
          data: { tts_output: { url: '/api/tts_proxy/reply.mp3', mime_type: 'audio/mpeg' } },
        });
        callback({ type: 'error', data: { code: 'stt_failed', message: 'Speech failed' } });
        return vi.fn();
      }),
    });

    await homeAssistantConversationFeatureService.startVoiceConversation(
      { sampleRate: 16_000 },
      listener
    );

    expect(listener).toHaveBeenCalledWith({ type: 'speech-start' });
    expect(listener).toHaveBeenCalledWith({ type: 'speech-end', text: 'Turn on the lights' });
    expect(listener).toHaveBeenCalledWith({
      type: 'audio-output',
      url: 'https://ha.local/api/tts_proxy/reply.mp3',
      mimeType: 'audio/mpeg',
    });
    expect(listener).toHaveBeenCalledWith({
      type: 'error',
      code: 'stt_failed',
      message: 'Speech failed',
    });
  });
});
