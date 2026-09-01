import { beforeEach, describe, expect, it } from 'vitest';
import { readAssistPromptHistory, rememberAssistPrompt } from './assist-prompt-history';

describe('Assist prompt history', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps recent prompts newest first for each provider', () => {
    rememberAssistPrompt('home_assistant', 'Turn on the kitchen lights');
    rememberAssistPrompt('home_assistant', 'What doors are open?');
    rememberAssistPrompt('homey', 'Turn off downstairs');

    expect(readAssistPromptHistory('home_assistant')).toEqual([
      'What doors are open?',
      'Turn on the kitchen lights',
    ]);
    expect(readAssistPromptHistory('homey')).toEqual(['Turn off downstairs']);
  });

  it('moves a repeated prompt to the front without duplicating it', () => {
    rememberAssistPrompt('home_assistant', 'First');
    rememberAssistPrompt('home_assistant', 'Second');
    rememberAssistPrompt('home_assistant', 'First');

    expect(readAssistPromptHistory('home_assistant')).toEqual(['First', 'Second']);
  });

  it('trims prompts and limits retained history', () => {
    for (let index = 0; index < 55; index += 1) {
      rememberAssistPrompt('home_assistant', `Question ${index}`);
    }

    const history = readAssistPromptHistory('home_assistant');
    expect(history).toHaveLength(50);
    expect(history[0]).toBe('Question 54');
    expect(history.at(-1)).toBe('Question 5');
  });
});
