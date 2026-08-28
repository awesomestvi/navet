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
  it('uses phone cover-sheet geometry while retaining the desktop modal breakpoint', () => {
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
      'right-0',
      'bottom-0',
      'left-0',
      'rounded-t-[30px]',
      'rounded-b-none'
    );
    expect(dialog).toHaveClass('sm:top-[50%]', 'sm:left-[50%]', 'sm:rounded-[32px]');
    expect(dialog.querySelector('[aria-hidden="true"]')).toHaveClass('sm:hidden');
    const footer = dialog.querySelector('[data-slot="alert-dialog-footer"]');
    expect(footer).toHaveClass('flex-nowrap', 'items-center', 'justify-end');
    expect(footer).not.toHaveClass('flex-col-reverse');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('h-10');
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveClass('h-10');
  });
});
