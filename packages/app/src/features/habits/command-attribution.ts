import type { NavetUiCommand } from '@navet/core/types';

interface RecentCommandAttribution {
  entityId: string;
  action: 'turn_on' | 'turn_off' | 'other';
  at: string;
}

const MAX_RECENT_COMMANDS = 40;
const COMMAND_LOOKBACK_MS = 10_000;
const recentCommands: RecentCommandAttribution[] = [];

function normalizeCommandAction(command: NavetUiCommand): RecentCommandAttribution['action'] {
  if (command.type === 'turn_on') {
    return 'turn_on';
  }

  if (command.type === 'turn_off') {
    return 'turn_off';
  }

  return 'other';
}

export function recordHabitCommand(command: NavetUiCommand) {
  recentCommands.push({
    entityId: command.entityId,
    action: normalizeCommandAction(command),
    at: new Date().toISOString(),
  });

  if (recentCommands.length > MAX_RECENT_COMMANDS) {
    recentCommands.splice(0, recentCommands.length - MAX_RECENT_COMMANDS);
  }
}

export function consumeHabitCommandAttribution(input: {
  entityId: string;
  action: 'turn_on' | 'turn_off' | 'other';
  at: string;
}) {
  const eventTime = new Date(input.at).getTime();
  const index = recentCommands.findIndex((command) => {
    const commandTime = new Date(command.at).getTime();
    return (
      command.entityId === input.entityId &&
      (command.action === input.action || command.action === 'other') &&
      eventTime >= commandTime &&
      eventTime - commandTime <= COMMAND_LOOKBACK_MS
    );
  });

  if (index === -1) {
    return null;
  }

  return recentCommands.splice(index, 1)[0] ?? null;
}
