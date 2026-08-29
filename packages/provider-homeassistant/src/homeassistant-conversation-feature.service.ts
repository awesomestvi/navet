import type {
  PlatformConversationEvent,
  PlatformConversationPipeline,
  PlatformConversationPipelineCollection,
  PlatformConversationRunHandle,
  PlatformConversationTextRequest,
  PlatformConversationVoiceRequest,
  PlatformMessageClient,
} from '@navet/core/provider-feature-models';
import type { ProviderConversationFeatureService } from '@navet/core/provider-feature-services';
import {
  getHomeAssistantConnection,
  resolveHomeAssistantProxyUrl,
  sendHomeAssistantWebSocketBinary,
} from './homeassistant-service-bridge';

interface HomeAssistantPipeline {
  id: string;
  name: string;
  language: string;
  conversation_engine?: string | null;
  stt_engine?: string | null;
  tts_engine?: string | null;
}

interface HomeAssistantPipelineListResult {
  pipelines?: HomeAssistantPipeline[];
  preferred_pipeline?: string | null;
}

interface HomeAssistantPipelineEvent {
  type?: string;
  data?: Record<string, unknown> | null;
}

function requireMessageClient(): PlatformMessageClient & {
  subscribeMessage: NonNullable<PlatformMessageClient['subscribeMessage']>;
} {
  const client = getHomeAssistantConnection();
  if (!client?.subscribeMessage) {
    throw new Error('Home Assistant Assist requires an active websocket subscription');
  }

  return client as PlatformMessageClient & {
    subscribeMessage: NonNullable<PlatformMessageClient['subscribeMessage']>;
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function mapPipeline(pipeline: HomeAssistantPipeline): PlatformConversationPipeline {
  return {
    id: pipeline.id,
    name: pipeline.name,
    language: pipeline.language,
    conversationEngineId: pipeline.conversation_engine ?? undefined,
    supportsSpeechToText: Boolean(pipeline.stt_engine),
    supportsTextToSpeech: Boolean(pipeline.tts_engine),
  };
}

function sendAudioFrame(handlerId: number, chunk?: Int16Array) {
  if (!Number.isInteger(handlerId) || handlerId < 0 || handlerId > 255) {
    throw new Error('Home Assistant returned an invalid Assist audio handler');
  }

  const chunkBytes = chunk
    ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    : new Uint8Array(0);
  const frame = new Uint8Array(chunkBytes.byteLength + 1);
  frame[0] = handlerId;
  frame.set(chunkBytes, 1);
  sendHomeAssistantWebSocketBinary(frame);
}

function normalizeEvent(
  event: HomeAssistantPipelineEvent,
  listener: (event: PlatformConversationEvent) => void
): number | undefined {
  const data = event.data ?? {};

  switch (event.type) {
    case 'run-start': {
      const runnerData = asRecord(data.runner_data);
      listener({
        type: 'run-start',
        pipelineId: asString(data.pipeline) ?? '',
        conversationId: asString(data.conversation_id),
      });
      return typeof runnerData?.stt_binary_handler_id === 'number'
        ? runnerData.stt_binary_handler_id
        : undefined;
    }
    case 'stt-start':
      listener({ type: 'speech-start' });
      break;
    case 'stt-end': {
      const output = asRecord(data.stt_output);
      listener({ type: 'speech-end', text: asString(output?.text) ?? '' });
      break;
    }
    case 'intent-progress': {
      const delta = asRecord(data.chat_log_delta);
      const text = asString(delta?.content);
      const thinkingText = asString(delta?.thinking_content);
      if (text || thinkingText) {
        listener({ type: 'response-delta', text, thinkingText });
      }
      break;
    }
    case 'intent-end': {
      const output = asRecord(data.intent_output);
      const response = asRecord(output?.response);
      const speech = asRecord(response?.speech);
      const plain = asRecord(speech?.plain);
      listener({
        type: 'response',
        conversationId: asString(output?.conversation_id),
        text: asString(plain?.speech) ?? '',
        responseType: asString(response?.response_type),
        continueConversation: output?.continue_conversation === true,
      });
      break;
    }
    case 'tts-end': {
      const output = asRecord(data.tts_output);
      const rawUrl = asString(output?.url);
      if (rawUrl) {
        listener({
          type: 'audio-output',
          url: resolveHomeAssistantProxyUrl(rawUrl) ?? rawUrl,
          mimeType: asString(output?.mime_type),
        });
      }
      break;
    }
    case 'error':
      listener({
        type: 'error',
        code: asString(data.code) ?? 'assist_error',
        message: asString(data.message) ?? 'Home Assistant Assist failed',
      });
      break;
    case 'run-end':
      listener({ type: 'run-end' });
      break;
  }

  return undefined;
}

async function subscribeRun(
  message: Record<string, unknown>,
  listener: (event: PlatformConversationEvent) => void,
  voice: boolean
): Promise<PlatformConversationRunHandle> {
  const client = requireMessageClient();
  let handlerId: number | undefined;
  let sttReady = false;
  let finished = false;
  const queuedChunks: Int16Array[] = [];

  const unsubscribe = await client.subscribeMessage<HomeAssistantPipelineEvent>((event) => {
    const nextHandlerId = normalizeEvent(event, listener);
    if (nextHandlerId !== undefined) {
      handlerId = nextHandlerId;
    }

    if (event.type === 'stt-start' && handlerId !== undefined) {
      sttReady = true;
      for (const chunk of queuedChunks.splice(0)) {
        sendAudioFrame(handlerId, chunk);
      }
      if (finished) {
        sendAudioFrame(handlerId);
      }
    }
  }, message);

  const handle: PlatformConversationRunHandle = {
    cancel: () => {
      finished = true;
      queuedChunks.length = 0;
      unsubscribe();
    },
  };

  if (voice) {
    handle.sendAudio = (chunk) => {
      if (finished) return;
      if (handlerId === undefined || !sttReady) {
        queuedChunks.push(chunk.slice());
        return;
      }
      sendAudioFrame(handlerId, chunk);
    };
    handle.finishAudio = () => {
      if (finished) return;
      finished = true;
      if (handlerId !== undefined && sttReady) {
        sendAudioFrame(handlerId);
      }
    };
  }

  return handle;
}

export const homeAssistantConversationFeatureService: ProviderConversationFeatureService = {
  async getPipelines(): Promise<PlatformConversationPipelineCollection> {
    const result = await requireMessageClient().sendMessagePromise<HomeAssistantPipelineListResult>(
      {
        type: 'assist_pipeline/pipeline/list',
      }
    );
    return {
      pipelines: (result.pipelines ?? []).map(mapPipeline),
      preferredPipelineId: result.preferred_pipeline ?? null,
    };
  },

  startTextConversation(request: PlatformConversationTextRequest, listener) {
    return subscribeRun(
      {
        type: 'assist_pipeline/run',
        start_stage: 'intent',
        end_stage: 'intent',
        input: { text: request.text },
        ...(request.pipelineId ? { pipeline: request.pipelineId } : {}),
        ...(request.conversationId ? { conversation_id: request.conversationId } : {}),
      },
      listener,
      false
    );
  },

  startVoiceConversation(request: PlatformConversationVoiceRequest, listener) {
    return subscribeRun(
      {
        type: 'assist_pipeline/run',
        start_stage: 'stt',
        end_stage: request.playAudioResponse ? 'tts' : 'intent',
        input: { sample_rate: Math.round(request.sampleRate) },
        ...(request.pipelineId ? { pipeline: request.pipelineId } : {}),
        ...(request.conversationId ? { conversation_id: request.conversationId } : {}),
      },
      listener,
      true
    );
  },
};
