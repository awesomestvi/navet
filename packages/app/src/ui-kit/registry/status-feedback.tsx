import { MessageBar } from '@navet/app/ui-kit/primitives';
export interface StatusFeedbackProps {
  state: 'loading' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
}
export function StatusFeedback({ state, title, message }: StatusFeedbackProps) {
  return (
    <MessageBar tone={state === 'loading' ? 'info' : state} title={title}>
      {message}
    </MessageBar>
  );
}
