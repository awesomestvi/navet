import type { HeaderTitleMode } from '@navet/app/stores/settings-store';

export function resolveHeaderTitle(input: {
  customText: string;
  formattedDate: string;
  formattedTime: string;
  greetingText: string;
  mode: HeaderTitleMode;
}) {
  if (input.mode === 'clock') {
    return {
      secondaryText: null,
      supportingText: null,
      text: `${input.formattedDate} · ${input.formattedTime}`,
      mode: input.mode,
      showTimeMetadata: false,
    };
  }

  if (input.mode === 'custom_text' && input.customText.trim().length > 0) {
    return {
      secondaryText: null,
      supportingText: null,
      text: input.customText.trim(),
      mode: input.mode,
      showTimeMetadata: true,
    };
  }

  return {
    secondaryText: null,
    supportingText: null,
    text: input.greetingText,
    mode: input.mode === 'custom_text' ? 'auto_greeting' : input.mode,
    showTimeMetadata: true,
  };
}
