import {
  type AppendMessage,
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from '@assistant-ui/react';
import { AssistantThread } from '@navet/app/components/assistant-ui/thread';
import { CardDialogHeader } from '@navet/app/components/patterns';
import { Button, coverSheetHeaderClassName, ModalSurface } from '@navet/app/components/primitives';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor/compact-room-selector';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import type {
  PlatformConversationEvent,
  PlatformConversationPipeline,
  PlatformConversationRunHandle,
} from '@navet/app/platform/provider-feature-models';
import {
  getIntegrationConversationPipelines,
  startIntegrationTextConversation,
  startIntegrationVoiceConversation,
} from '@navet/app/services/integration-conversation-feature.service';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AssistAudioRecorder } from './assist-audio-recorder';
import { readAssistPromptHistory, rememberAssistPrompt } from './assist-prompt-history';

interface AssistMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface AssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: IntegrationProviderId;
  pipelineId?: string;
  onPipelineChange?: (pipelineId: string | undefined) => void;
  settingsOnly?: boolean;
}

function makeMessageId() {
  return `assist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssistDialog({
  open,
  onOpenChange,
  providerId,
  pipelineId,
  onPipelineChange,
  settingsOnly = false,
}: AssistDialogProps) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const [pipelines, setPipelines] = useState<PlatformConversationPipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelineId ?? '');
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>(() =>
    readAssistPromptHistory(providerId)
  );
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const runHandleRef = useRef<PlatformConversationRunHandle | null>(null);
  const recorderRef = useRef<AssistAudioRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAssistantIdRef = useRef<string | undefined>(undefined);

  const stopActiveRun = useCallback(async () => {
    runHandleRef.current?.cancel();
    runHandleRef.current = null;
    await recorderRef.current?.dispose();
    recorderRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setIsRunning(false);
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoadingPipelines(true);
    setError(null);
    void getIntegrationConversationPipelines(providerId)
      .then((collection) => {
        if (!active) return;
        setPipelines(collection.pipelines);
        const requestedExists = collection.pipelines.some((item) => item.id === pipelineId);
        const nextId = requestedExists
          ? pipelineId
          : (collection.preferredPipelineId ?? collection.pipelines[0]?.id ?? '');
        setSelectedPipelineId(nextId ?? '');
        if (nextId !== pipelineId) onPipelineChange?.(nextId || undefined);
      })
      .catch((cause) => {
        if (!active) return;
        console.error('[AssistDialog] Failed to load pipelines:', cause);
        setError(t('widgets.assist.loadFailed'));
      })
      .finally(() => {
        if (active) setIsLoadingPipelines(false);
      });
    return () => {
      active = false;
    };
  }, [onPipelineChange, open, pipelineId, providerId, t]);

  useEffect(() => {
    if (open) return;
    void stopActiveRun();
    setMessages([]);
    setError(null);
    conversationIdRef.current = undefined;
  }, [open, stopActiveRun]);

  useEffect(() => {
    setPromptHistory(readAssistPromptHistory(providerId));
  }, [providerId]);

  useEffect(() => () => void stopActiveRun(), [stopActiveRun]);

  const discardEmptyAssistantMessage = useCallback(() => {
    const pendingId = pendingAssistantIdRef.current;
    if (!pendingId) return;
    setMessages((current) =>
      current.filter((message) => message.id !== pendingId || message.text.length > 0)
    );
    pendingAssistantIdRef.current = undefined;
  }, []);

  const handleConversationEvent = useCallback(
    (event: PlatformConversationEvent) => {
      if (event.type === 'run-start' && event.conversationId) {
        conversationIdRef.current = event.conversationId;
      } else if (event.type === 'speech-start') {
        setIsListening(true);
      } else if (event.type === 'speech-end') {
        setIsListening(false);
        if (event.text) {
          setMessages((current) => [
            ...current,
            { id: makeMessageId(), role: 'user', text: event.text },
          ]);
        }
      } else if (event.type === 'response-delta' && event.text) {
        const pendingId = pendingAssistantIdRef.current;
        if (!pendingId) return;
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingId ? { ...message, text: message.text + event.text } : message
          )
        );
      } else if (event.type === 'response') {
        if (event.conversationId) conversationIdRef.current = event.conversationId;
        const pendingId = pendingAssistantIdRef.current;
        setMessages((current) => {
          if (pendingId && current.some((message) => message.id === pendingId)) {
            return current.map((message) =>
              message.id === pendingId ? { ...message, text: event.text } : message
            );
          }
          return event.text
            ? [...current, { id: makeMessageId(), role: 'assistant', text: event.text }]
            : current;
        });
      } else if (event.type === 'audio-output') {
        audioRef.current?.pause();
        const audio = new Audio(event.url);
        audioRef.current = audio;
        void audio.play().catch((cause) => {
          console.error('[AssistDialog] Failed to play response audio:', cause);
        });
      } else if (event.type === 'error') {
        discardEmptyAssistantMessage();
        setError(event.message);
        setIsRunning(false);
        setIsListening(false);
      } else if (event.type === 'run-end') {
        discardEmptyAssistantMessage();
        runHandleRef.current = null;
        setIsRunning(false);
        setIsListening(false);
        void recorderRef.current?.dispose();
        recorderRef.current = null;
      }
    },
    [discardEmptyAssistantMessage]
  );

  const beginAssistantMessage = () => {
    const id = makeMessageId();
    pendingAssistantIdRef.current = id;
    setMessages((current) => [...current, { id, role: 'assistant', text: '' }]);
  };

  const sendText = async (submittedText: string) => {
    const text = submittedText.trim();
    if (!text || isRunning) return;
    setPromptHistory(rememberAssistPrompt(providerId, text));
    setError(null);
    setMessages((current) => [...current, { id: makeMessageId(), role: 'user', text }]);
    beginAssistantMessage();
    setIsRunning(true);
    try {
      runHandleRef.current = await startIntegrationTextConversation(
        providerId,
        {
          text,
          pipelineId: selectedPipelineId || undefined,
          conversationId: conversationIdRef.current,
        },
        handleConversationEvent
      );
    } catch (cause) {
      console.error('[AssistDialog] Text request failed:', cause);
      discardEmptyAssistantMessage();
      setError(t('widgets.assist.runFailed'));
      setIsRunning(false);
    }
  };

  const startListening = async () => {
    if (isRunning) return;
    setError(null);
    const recorder = new AssistAudioRecorder();
    recorderRef.current = recorder;
    beginAssistantMessage();
    setIsRunning(true);
    try {
      const sampleRate = await recorder.prepare();
      const selectedPipeline = pipelines.find((item) => item.id === selectedPipelineId);
      const handle = await startIntegrationVoiceConversation(
        providerId,
        {
          sampleRate,
          pipelineId: selectedPipelineId || undefined,
          conversationId: conversationIdRef.current,
          playAudioResponse: selectedPipeline?.supportsTextToSpeech === true,
        },
        handleConversationEvent
      );
      runHandleRef.current = handle;
      recorder.start((chunk) => handle.sendAudio?.(chunk));
      setIsListening(true);
    } catch (cause) {
      console.error('[AssistDialog] Microphone request failed:', cause);
      await recorder.dispose();
      recorderRef.current = null;
      discardEmptyAssistantMessage();
      setError(t('widgets.assist.microphoneFailed'));
      setIsRunning(false);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    await recorderRef.current?.dispose();
    recorderRef.current = null;
    try {
      runHandleRef.current?.finishAudio?.();
    } catch (cause) {
      console.error('[AssistDialog] Failed to finish microphone capture:', cause);
      setError(t('widgets.assist.runFailed'));
      setIsRunning(false);
    }
  };

  const selectedPipeline = pipelines.find((item) => item.id === selectedPipelineId);
  const pipelineOptions = pipelines.map((pipeline) => ({
    label: `${pipeline.name} · ${pipeline.language}`,
    value: pipeline.id,
  }));
  const selectedPipelineLabel = isLoadingPipelines
    ? t('common.loading')
    : (selectedPipeline?.name ?? t('widgets.assist.noPipelines'));
  const microphoneSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    selectedPipeline?.supportsSpeechToText === true;
  const pipelineSelector = (
    <CompactRoomSelector
      value={selectedPipelineId}
      label={selectedPipelineLabel}
      ariaLabel={t('widgets.assist.pipeline')}
      disabled={isLoadingPipelines || pipelines.length === 0 || isRunning}
      variant={settingsOnly ? 'soft' : 'ghost'}
      options={pipelineOptions}
      onChange={(nextId) => {
        setSelectedPipelineId(nextId);
        onPipelineChange?.(nextId || undefined);
      }}
      contentClassName="gap-1.5"
      labelClassName="max-w-[7rem] sm:max-w-[12rem]"
      iconClassName="h-3.5 w-3.5"
    />
  );
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: message.text,
      status:
        message.role === 'assistant'
          ? isRunning && message.id === pendingAssistantIdRef.current
            ? { type: 'running' }
            : { type: 'complete', reason: 'stop' }
          : undefined,
    }),
    isRunning,
    isSendDisabled: isRunning || pipelines.length === 0,
    onNew: async (message: AppendMessage) => {
      const text = message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');
      await sendText(text);
    },
    onCancel: stopActiveRun,
  });

  return (
    <ModalSurface
      isOpen={open}
      onOpenChange={onOpenChange}
      title={settingsOnly ? t('widgets.assist.settingsTitle') : t('widgets.assist.title')}
      description={
        settingsOnly ? t('widgets.assist.settingsDescription') : t('widgets.assist.description')
      }
      contentClassName={settingsOnly ? '!max-w-lg' : 'h-[min(72dvh,40rem)] !max-w-xl'}
      shellBodyClassName={cn('min-h-0', settingsOnly ? undefined : 'flex h-full flex-1 flex-col')}
      bodyClassName={cn(
        'min-h-0 overflow-hidden',
        settingsOnly ? undefined : 'flex h-full flex-1 flex-col'
      )}
      mobileCoverSheet
      mobileCoverSheetActions={
        settingsOnly ? <div className="pointer-events-auto">{pipelineSelector}</div> : undefined
      }
    >
      <div className={cn('flex min-h-0 flex-1 flex-col', surface.textPrimary)}>
        <header
          data-card-dialog-header
          className={cn(
            coverSheetHeaderClassName,
            'shrink-0 border-b max-sm:pt-2 max-sm:pr-4',
            surface.border
          )}
        >
          <CardDialogHeader
            title={settingsOnly ? t('widgets.assist.settingsTitle') : t('widgets.assist.title')}
            description={
              settingsOnly
                ? t('widgets.assist.settingsDescription')
                : t('widgets.assist.description')
            }
            showRoomSelector={false}
            editableTitle={false}
            theme={theme}
            className="mb-0 max-sm:pr-0"
            trailing={
              settingsOnly ? <div className="max-sm:hidden">{pipelineSelector}</div> : undefined
            }
          />
        </header>

        {!settingsOnly || error ? (
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col',
              settingsOnly ? 'p-5 max-sm:px-4 max-sm:py-3' : 'overflow-hidden'
            )}
          >
            {!settingsOnly ? (
              <AssistantRuntimeProvider runtime={runtime}>
                <AssistantThread
                  accentColor={accentColor}
                  cancelLabel={t('common.cancel')}
                  conversationLabel={t('widgets.assist.conversation')}
                  inputDisabled={pipelines.length === 0}
                  isRunning={isRunning}
                  placeholder={t('widgets.assist.placeholder')}
                  promptHistory={promptHistory}
                  sendLabel={t('widgets.assist.send')}
                  starterMessage={t('widgets.assist.emptyTitle')}
                  status={
                    isListening ? (
                      <div
                        className="flex items-center justify-center gap-1"
                        role="status"
                        aria-label={t('widgets.assist.listening')}
                      >
                        {[0, 1, 2, 3, 4].map((index) => (
                          <span
                            key={index}
                            className="h-5 w-1 animate-pulse rounded-full motion-reduce:animate-none"
                            style={{
                              backgroundColor: accentColor,
                              animationDelay: `${index * 90}ms`,
                              transform: `scaleY(${0.45 + (index % 3) * 0.25})`,
                            }}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium">
                          {t('widgets.assist.listening')}
                        </span>
                      </div>
                    ) : error ? (
                      <p className="text-sm text-red-500" role="alert">
                        {error}
                      </p>
                    ) : null
                  }
                  composerActions={
                    <>
                      {pipelineSelector}
                      {isListening ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => void stopListening()}
                          iconOnly
                          label={t('widgets.assist.stopListening')}
                        >
                          <Square className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          onClick={() => void startListening()}
                          disabled={!microphoneSupported || isRunning}
                          iconOnly
                          label={t('widgets.assist.startListening')}
                        >
                          <Mic className="size-4" />
                        </Button>
                      )}
                    </>
                  }
                />
              </AssistantRuntimeProvider>
            ) : error ? (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalSurface>
  );
}
