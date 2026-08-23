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
    expect(dialog).toHaveClass('right-2', 'bottom-2', 'left-2', 'rounded-[30px]');
    expect(dialog).toHaveClass('sm:top-[50%]', 'sm:left-[50%]', 'sm:rounded-[32px]');
    expect(dialog.querySelector('[aria-hidden="true"]')).toHaveClass('sm:hidden');
  });
});
