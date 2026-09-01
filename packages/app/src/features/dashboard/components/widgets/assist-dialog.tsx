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
import { navetAiService } from '@navet/app/features/navet-ai/navet-ai.service';
import { buildNavetAiChatContext } from '@navet/app/features/navet-ai/navet-ai-chat-context';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
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
import { Ellipsis, Mic, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  readAssistAssistantMode,
  rememberAssistAssistantMode,
} from './assist-assistant-preference';
import { AssistAssistantSwitcher, type AssistMode } from './assist-assistant-switcher';
import { AssistAudioRecorder } from './assist-audio-recorder';
import {
  type AssistNavetAiActionTarget,
  type AssistNavetAiExecutionResult,
  executeExplicitNavetAiCommand,
} from './assist-navet-ai-command';
import {
  type AssistPromptHistoryKey,
  readAssistPromptHistory,
  rememberAssistPrompt,
} from './assist-prompt-history';

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
  const { locale, t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const [pipelines, setPipelines] = useState<PlatformConversationPipeline[]>([]);
  const [assistantMode, setAssistantMode] = useState<AssistMode>(readAssistAssistantMode);
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
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasFocusedComposerRef = useRef(false);
  const pendingAssistantIdRef = useRef<string | undefined>(undefined);
  const navetAiAbortControllerRef = useRef<AbortController | null>(null);
  const { navetAiState, navetAiLoading, initializeNavetAi } = useNavetAiStore(
    useShallow((store) => ({
      navetAiState: store.state,
      navetAiLoading: store.loading,
      initializeNavetAi: store.initialize,
    }))
  );

  const stopActiveRun = useCallback(async () => {
    runHandleRef.current?.cancel();
    runHandleRef.current = null;
    navetAiAbortControllerRef.current?.abort();
    navetAiAbortControllerRef.current = null;
    await recorderRef.current?.dispose();
    recorderRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setIsRunning(false);
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (open && !navetAiState && !navetAiLoading) void initializeNavetAi();
  }, [initializeNavetAi, navetAiLoading, navetAiState, open]);

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
    return id;
  };

  const switchAssistant = (nextMode: AssistMode) => {
    if (nextMode === assistantMode || isRunning) return;
    void stopActiveRun();
    rememberAssistAssistantMode(nextMode);
    setAssistantMode(nextMode);
    setMessages([]);
    setError(null);
    pendingAssistantIdRef.current = undefined;
    conversationIdRef.current = undefined;
    const historyKey: AssistPromptHistoryKey = nextMode === 'navet_ai' ? 'navet_ai' : providerId;
    setPromptHistory(readAssistPromptHistory(historyKey));
  };

  const formatNavetAiResponse = (
    result: Awaited<ReturnType<typeof navetAiService.chat>>,
    execution: AssistNavetAiExecutionResult | null
  ) => {
    const stateAnswer = (() => {
      if (result.answer?.kind === 'lights_on_count') {
        return result.answer.room
          ? t('widgets.assist.navetAiLightsOnInRoom', {
              count: result.answer.count,
              room: result.answer.room,
            })
          : t('widgets.assist.navetAiLightsOn', { count: result.answer.count });
      }
      if (result.answer?.kind === 'lights_on_locations') {
        if (result.answer.lights.length === 0) {
          return t('widgets.assist.navetAiLightsOn', { count: 0 });
        }
        const listFormatter = new Intl.ListFormat(locale, {
          style: 'long',
          type: 'conjunction',
        });
        const rooms = [...new Set(result.answer.lights.flatMap((light) => light.room ?? []))];
        const unassignedLights = result.answer.lights.filter((light) => !light.room);
        const sections: string[] = [];
        if (rooms.length === 1 && result.answer.lights.length === 1) {
          sections.push(t('widgets.assist.navetAiLightOnInRoom', { room: rooms[0] }));
        } else if (rooms.length > 0) {
          sections.push(
            t('widgets.assist.navetAiLightsOnInRooms', { rooms: listFormatter.format(rooms) })
          );
        }
        if (unassignedLights.length > 0) {
          sections.push(
            t('widgets.assist.navetAiLightsOnRoomUnknown', {
              lights: listFormatter.format(unassignedLights.map((light) => light.name)),
            })
          );
        }
        return sections.join(' ');
      }
      if (result.answer?.kind !== 'temperature' && result.answer?.kind !== 'humidity') return null;
      const answer = result.answer;

      const numberFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
      const listFormatter = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });
      const roomCounts = new Map<string, number>();
      for (const reading of answer.readings) {
        if (reading.room) roomCounts.set(reading.room, (roomCounts.get(reading.room) ?? 0) + 1);
      }
      const readings = listFormatter.format(
        answer.readings.map((reading) => {
          const formattedNumber = numberFormatter.format(reading.value);
          const value =
            reading.unit === '%' ? `${formattedNumber}%` : `${formattedNumber} ${reading.unit}`;
          if (answer.room) {
            return answer.readings.length === 1 ? value : `${reading.name}: ${value}`;
          }
          const label = reading.room
            ? roomCounts.get(reading.room) === 1
              ? reading.room
              : `${reading.room} (${reading.name})`
            : reading.name;
          return `${label}: ${value}`;
        })
      );
      if (answer.kind === 'humidity') {
        return answer.room
          ? t('widgets.assist.navetAiHumidityInRoom', { readings, room: answer.room })
          : t('widgets.assist.navetAiHumidity', { readings });
      }
      return answer.room
        ? t('widgets.assist.navetAiTemperatureInRoom', { readings, room: answer.room })
        : t('widgets.assist.navetAiTemperature', { readings });
    })();
    const sections = stateAnswer ? [stateAnswer] : result.reply ? [result.reply] : [];
    const formatTargets = (targets: AssistNavetAiActionTarget[]) => {
      const listFormatter = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });
      return listFormatter.format(
        targets.map((target) => (target.room ? `${target.name} (${target.room})` : target.name))
      );
    };
    if (execution) {
      if (execution.successful.length > 0) {
        sections.push(t('widgets.assist.navetAiActionCompleted'));
        for (const operation of ['turn_on', 'turn_off'] as const) {
          const targets = execution.successful.filter((target) => target.operation === operation);
          if (targets.length === 0) continue;
          sections.push(
            t(
              operation === 'turn_on'
                ? 'widgets.assist.navetAiTurnedOn'
                : 'widgets.assist.navetAiTurnedOff',
              { targets: formatTargets(targets) }
            )
          );
        }
      }
      if (execution.failed.length > 0) {
        sections.push(
          t(
            execution.successful.length > 0
              ? 'widgets.assist.navetAiActionPartiallyFailed'
              : 'widgets.assist.navetAiActionFailed',
            { targets: formatTargets(execution.failed) }
          )
        );
      }
    } else if (result.suggestions.length > 0) {
      const suggestions = result.suggestions.map((suggestion) =>
        t(
          suggestion.operation === 'turn_on'
            ? 'widgets.assist.navetAiTurnOn'
            : 'widgets.assist.navetAiTurnOff',
          {
            targets: new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
              suggestion.targets.map((target) =>
                target.room ? `${target.name} (${target.room})` : target.name
              )
            ),
          }
        )
      );
      sections.push(`${t('widgets.assist.navetAiSuggestedAction')}\n${suggestions.join('\n')}`);
      sections.push(t('widgets.assist.navetAiNotExecuted'));
    }
    return sections.join('\n\n') || t('widgets.assist.navetAiNoAnswer');
  };

  const sendText = async (submittedText: string) => {
    const text = submittedText.trim();
    if (!text || isRunning) return;
    const historyKey: AssistPromptHistoryKey =
      assistantMode === 'navet_ai' ? 'navet_ai' : providerId;
    setPromptHistory(rememberAssistPrompt(historyKey, text));
    setError(null);
    setMessages((current) => [...current, { id: makeMessageId(), role: 'user', text }]);
    const pendingAssistantId = beginAssistantMessage();
    setIsRunning(true);
    try {
      if (assistantMode === 'navet_ai') {
        const controller = new AbortController();
        navetAiAbortControllerRef.current = controller;
        const result = await navetAiService.chat(
          {
            text,
            locale,
            history: messages.slice(-8).map((message) => ({
              role: message.role,
              text: message.text,
            })),
            entities: buildNavetAiChatContext(),
          },
          controller.signal
        );
        if (controller.signal.aborted) return;
        const execution = await executeExplicitNavetAiCommand(result);
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingAssistantId
              ? { ...message, text: formatNavetAiResponse(result, execution) }
              : message
          )
        );
        pendingAssistantIdRef.current = undefined;
        navetAiAbortControllerRef.current = null;
        setIsRunning(false);
        return;
      }
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
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      console.error('[AssistDialog] Text request failed:', cause);
      discardEmptyAssistantMessage();
      setError(
        t(
          assistantMode === 'navet_ai' ? 'widgets.assist.navetAiFailed' : 'widgets.assist.runFailed'
        )
      );
      navetAiAbortControllerRef.current = null;
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
  const navetAiReady =
    navetAiState?.settings.enabled === true && navetAiState.capabilities.model.status === 'ready';
  const pipelineOptions = pipelines.map((pipeline) => ({
    label: `${pipeline.name} · ${pipeline.language}`,
    value: pipeline.id,
  }));
  const selectedPipelineLabel = isLoadingPipelines
    ? t('common.loading')
    : (selectedPipeline?.name ?? t('widgets.assist.noPipelines'));
  const microphoneSupported =
    assistantMode === 'home_assistant' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    selectedPipeline?.supportsSpeechToText === true;
  const pipelineSelector = (
    <CompactRoomSelector
      value={selectedPipelineId}
      label={selectedPipelineLabel}
      ariaLabel={t('widgets.assist.pipeline')}
      disabled={isLoadingPipelines || pipelines.length === 0 || isRunning}
      variant="soft"
      iconOnly
      IconComponent={Ellipsis}
      options={pipelineOptions}
      onChange={(nextId) => {
        setSelectedPipelineId(nextId);
        onPipelineChange?.(nextId || undefined);
      }}
      contentClassName="gap-0"
      iconClassName="h-4 w-4"
    />
  );
  const assistantSelector = (
    <AssistAssistantSwitcher
      value={assistantMode}
      ariaLabel={t('widgets.assist.assistant')}
      homeAssistantLabel={t('widgets.assist.homeAssistant')}
      navetAiLabel={t('widgets.assist.navetAi')}
      disabled={isRunning}
      onChange={switchAssistant}
    />
  );
  const inputAvailable = assistantMode === 'navet_ai' ? navetAiReady : pipelines.length > 0;
  useEffect(() => {
    if (!open) {
      hasFocusedComposerRef.current = false;
      return;
    }
    if (!inputAvailable || hasFocusedComposerRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const input = composerInputRef.current;
      if (!input || input.disabled) return;
      input.focus({ preventScroll: true });
      hasFocusedComposerRef.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [inputAvailable, open]);
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
    isSendDisabled: isRunning || !inputAvailable,
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
        assistantMode === 'home_assistant' ? (
          <div className="pointer-events-auto">{pipelineSelector}</div>
        ) : undefined
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
              assistantMode === 'home_assistant' ? (
                <div className="max-sm:hidden">{pipelineSelector}</div>
              ) : undefined
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
                  inputDisabled={!inputAvailable}
                  inputRef={composerInputRef}
                  isRunning={isRunning}
                  placeholder={t(
                    assistantMode === 'navet_ai'
                      ? 'widgets.assist.navetAiPlaceholder'
                      : 'widgets.assist.placeholder'
                  )}
                  promptHistory={promptHistory}
                  sendLabel={t('widgets.assist.send')}
                  starterMessage={t(
                    assistantMode === 'navet_ai'
                      ? 'widgets.assist.navetAiEmptyTitle'
                      : 'widgets.assist.emptyTitle'
                  )}
                  status={
                    assistantMode === 'navet_ai' && !navetAiReady ? (
                      <p className="text-sm opacity-70" role="status">
                        {t('widgets.assist.navetAiUnavailable')}
                      </p>
                    ) : isListening ? (
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
                  tools={
                    <>
                      {assistantSelector}
                      {assistantMode === 'home_assistant' ? (
                        isListening ? (
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
                        )
                      ) : null}
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
