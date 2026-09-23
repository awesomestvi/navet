import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

describe('AlertDialog', () => {
  it('centers a compact alert at every viewport and keeps the safe action first', () => {
    renderWithProviders(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset dashboard?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Reset dashboard?' });
    expect(dialog).toHaveClass(
      'top-1/2',
      'left-1/2',
      '-translate-x-1/2',
      '-translate-y-1/2',
      'max-w-lg',
      'rounded-[30px]'
    );
    expect(dialog).not.toHaveClass('bottom-0', 'rounded-b-none');
    expect(dialog.querySelector('.h-1.w-16')).toBeNull();
    const footer = dialog.querySelector('[data-slot="alert-dialog-footer"]');
    expect(footer).toHaveClass('flex-nowrap', 'items-center', 'justify-end');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('h-10', 'rounded-full');
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveClass('h-10', 'rounded-full');
    expect(
      screen
        .getByRole('button', { name: 'Cancel' })
        .compareDocumentPosition(screen.getByRole('button', { name: 'Reset' })) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
