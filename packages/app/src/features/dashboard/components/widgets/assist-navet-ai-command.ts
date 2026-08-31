import { dispatchEntityCommand } from '@navet/app/commands';
import type { NavetAiChatResponse } from '@navet/app/features/navet-ai/navet-ai.contract';
import type { CommandResult } from '@navet/core/types';

type SuggestedAction = NavetAiChatResponse['suggestions'][number];

export type AssistNavetAiActionTarget = SuggestedAction['targets'][number] & {
  operation: SuggestedAction['operation'];
};

export interface AssistNavetAiExecutionResult {
  successful: AssistNavetAiActionTarget[];
  failed: AssistNavetAiActionTarget[];
}

export async function executeExplicitNavetAiCommand(
  response: NavetAiChatResponse,
  execute: (command: {
    type: SuggestedAction['operation'];
    entityId: string;
  }) => Promise<CommandResult> = dispatchEntityCommand
): Promise<AssistNavetAiExecutionResult | null> {
  if (!response.executionRequested) return null;
  const targets = [
    ...new Map(
      response.suggestions.flatMap((suggestion) =>
        suggestion.targets.map(
          (target) =>
            [
              `${suggestion.operation}:${target.id}`,
              { ...target, operation: suggestion.operation },
            ] as const
        )
      )
    ).values(),
  ];
  const outcomes = await Promise.all(
    targets.map(async (target) => {
      try {
        const result = await execute({ type: target.operation, entityId: target.id });
        return { target, successful: result.accepted };
      } catch {
        return { target, successful: false };
      }
    })
  );
  return {
    successful: outcomes.filter((outcome) => outcome.successful).map(({ target }) => target),
    failed: outcomes.filter((outcome) => !outcome.successful).map(({ target }) => target),
  };
}
