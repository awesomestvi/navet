import type { NavetAiChatResponse } from '@navet/app/features/navet-ai/navet-ai.contract';
import { describe, expect, it, vi } from 'vitest';
import { executeExplicitNavetAiCommand } from './assist-navet-ai-command';

function response(executionRequested: boolean): NavetAiChatResponse {
  return {
    contract: 'navet.ai.chat',
    version: 1,
    modelId: 'qwen3.5-2b',
    reply: '',
    readOnly: true,
    executionRequested,
    suggestions: [
      {
        operation: 'turn_off',
        targets: [
          { id: 'home_assistant:light.office', name: 'Office light', room: 'Office' },
          { id: 'openhab:switch.desk', name: 'Desk lamp', room: 'Office' },
        ],
      },
    ],
  };
}

describe('explicit Navet AI chat commands', () => {
  it('never executes an advisory suggestion', async () => {
    const execute = vi.fn();

    expect(await executeExplicitNavetAiCommand(response(false), execute)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('routes an explicit command to each target through provider-neutral commands', async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ accepted: true, requiresEventConfirmation: true })
      .mockResolvedValueOnce({
        accepted: false,
        requiresEventConfirmation: false,
        error: 'unavailable',
      });

    const result = await executeExplicitNavetAiCommand(response(true), execute);

    expect(execute).toHaveBeenNthCalledWith(1, {
      type: 'turn_off',
      entityId: 'home_assistant:light.office',
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      type: 'turn_off',
      entityId: 'openhab:switch.desk',
    });
    expect(result?.successful.map((target) => target.id)).toEqual(['home_assistant:light.office']);
    expect(result?.failed.map((target) => target.id)).toEqual(['openhab:switch.desk']);
  });
});
