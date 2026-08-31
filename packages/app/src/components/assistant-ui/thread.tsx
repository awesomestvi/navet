/*
 * Adapted from assistant-ui's Thread component template.
 * Licensed under MIT: https://github.com/assistant-ui/assistant-ui
 */

import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAui } from '@assistant-ui/react';
import { Button } from '@navet/app/components/primitives';
import { cn } from '@navet/app/components/ui/utils';
import { ArrowDown, ArrowUp, Square } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
} from 'react';

interface AssistantThreadProps {
  accentColor: string;
  cancelLabel: string;
  className?: string;
  conversationLabel: string;
  starterMessage: string;
  inputDisabled?: boolean;
  isRunning: boolean;
  placeholder: string;
  promptHistory?: readonly string[];
  inputRef?: Ref<HTMLTextAreaElement>;
  sendLabel: string;
  status?: ReactNode;
  tools?: ReactNode;
}

interface PromptHistoryBrowseState {
  cursor: number;
  draftSnapshot: string;
  lastRecalledText: string;
}

function isOnFirstLine(value: string, caret: number) {
  return !value.slice(0, caret).includes('\n');
}

function isOnLastLine(value: string, caret: number) {
  return !value.slice(caret).includes('\n');
}

function usePromptHistory(promptHistory: readonly string[]) {
  const aui = useAui();
  const browseRef = useRef<PromptHistoryBrowseState | null>(null);

  useEffect(() => {
    browseRef.current = null;
  }, [promptHistory]);

  return useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.defaultPrevented) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      if (event.nativeEvent.isComposing) return;
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

      const textarea = event.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;
      if (selectionStart !== selectionEnd) return;

      if (browseRef.current && value !== browseRef.current.lastRecalledText) {
        browseRef.current = null;
      }
      const browse = browseRef.current;

      const commitText = (text: string) => {
        aui.composer.setText(text);
        requestAnimationFrame(() => textarea.setSelectionRange(text.length, text.length));
        event.preventDefault();
      };

      const recall = (cursor: number, draftSnapshot: string) => {
        const entry = promptHistory[cursor];
        if (entry === undefined) {
          event.preventDefault();
          return;
        }
        browseRef.current = { cursor, draftSnapshot, lastRecalledText: entry };
        commitText(entry);
      };

      if (event.key === 'ArrowUp') {
        if (!isOnFirstLine(value, selectionStart)) return;
        if (!browse) {
          if (value.trim() !== '' || promptHistory.length === 0) return;
          recall(0, value);
          return;
        }

        const next = browse.cursor + 1;
        if (next >= promptHistory.length) {
          event.preventDefault();
          return;
        }
        recall(next, browse.draftSnapshot);
        return;
      }

      if (!browse || !isOnLastLine(value, selectionEnd)) return;
      const next = browse.cursor - 1;
      if (next < 0) {
        browseRef.current = null;
        commitText(browse.draftSnapshot);
        return;
      }
      recall(next, browse.draftSnapshot);
    },
    [aui, promptHistory]
  );
}

interface AssistantComposerInputProps {
  disabled: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  placeholder: string;
  promptHistory: readonly string[];
}

function AssistantComposerInput({
  disabled,
  inputRef,
  placeholder,
  promptHistory,
}: AssistantComposerInputProps) {
  const handlePromptHistoryKeyDown = usePromptHistory(promptHistory);

  return (
    <ComposerPrimitive.Input
      ref={inputRef}
      onKeyDown={handlePromptHistoryKeyDown}
      className="max-h-32 min-h-12 w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:opacity-55 disabled:cursor-not-allowed disabled:opacity-50"
      placeholder={placeholder}
      aria-label={placeholder}
      disabled={disabled}
      rows={1}
    />
  );
}

interface MessageBubbleProps {
  from: 'assistant' | 'user';
  style?: CSSProperties;
}

function MessageBubble({ from, style }: MessageBubbleProps) {
  return (
    <MessagePrimitive.Root
      className={cn('flex w-full', from === 'user' ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm',
          from === 'user' ? 'text-white' : 'bg-current/[0.075]'
        )}
        style={style}
      >
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

export function AssistantThread({
  accentColor,
  cancelLabel,
  className,
  conversationLabel,
  starterMessage,
  inputDisabled = false,
  inputRef,
  isRunning,
  placeholder,
  promptHistory = [],
  sendLabel,
  status,
  tools,
}: AssistantThreadProps) {
  return (
    <ThreadPrimitive.Root
      className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', className)}
    >
      <ThreadPrimitive.Viewport
        className="flex min-h-48 flex-1 flex-col overflow-y-auto px-5 py-4 max-sm:px-4"
        aria-label={conversationLabel}
        role="log"
      >
        <div className="flex flex-1 flex-col justify-end gap-3">
          <div className="flex w-full justify-start">
            <div className="max-w-[85%] rounded-2xl bg-current/[0.075] px-3 py-2 text-sm">
              {starterMessage}
            </div>
          </div>
          <ThreadPrimitive.Messages
            components={{
              UserMessage: () => (
                <MessageBubble from="user" style={{ backgroundColor: accentColor }} />
              ),
              AssistantMessage: () => <MessageBubble from="assistant" />,
            }}
          />
        </div>

        <ThreadPrimitive.ScrollToBottom asChild>
          <Button
            className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full shadow-lg disabled:invisible"
            size="compact"
            type="button"
            variant="soft"
            iconOnly
            label={conversationLabel}
          >
            <ArrowDown className="size-4" />
          </Button>
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>

      {status ? <div className="shrink-0 px-5 pb-2 max-sm:px-4">{status}</div> : null}

      <ComposerPrimitive.Root className="m-5 mt-0 rounded-2xl border border-current/15 bg-current/[0.035] p-2 shadow-sm focus-within:border-current/30 max-sm:m-4 max-sm:mt-0">
        <AssistantComposerInput
          placeholder={placeholder}
          disabled={inputDisabled}
          inputRef={inputRef}
          promptHistory={promptHistory}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">{tools}</div>
          {isRunning ? (
            <ComposerPrimitive.Cancel asChild>
              <Button size="compact" type="button" variant="primary" iconOnly label={cancelLabel}>
                <Square className="size-3.5" />
              </Button>
            </ComposerPrimitive.Cancel>
          ) : (
            <ComposerPrimitive.Send asChild>
              <Button size="compact" type="submit" variant="primary" iconOnly label={sendLabel}>
                <ArrowUp className="size-4" />
              </Button>
            </ComposerPrimitive.Send>
          )}
        </div>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}
