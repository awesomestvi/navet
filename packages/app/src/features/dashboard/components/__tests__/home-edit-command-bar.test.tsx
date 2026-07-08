import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeEditCommandBar } from '../home-edit-command-bar';

function openMenu(name: string | RegExp) {
  fireEvent.pointerDown(screen.getByRole('button', { name }), {
    button: 0,
    ctrlKey: false,
  });
}

describe('HomeEditCommandBar', () => {
  it('keeps primary edit actions on the fixed command strip', () => {
    const onAddCard = vi.fn();
    const onAddColumn = vi.fn();
    const onAddRow = vi.fn();
    const onApplyPack = vi.fn();
    const onManageRooms = vi.fn();
    const onRedo = vi.fn();
    const onSetLayoutMode = vi.fn();
    const onToggleEditMode = vi.fn();
    const onUndo = vi.fn();

    renderWithProviders(
      <HomeEditCommandBar
        canRedo
        canUndo
        homeLayoutMode="sectioned"
        onAddCard={onAddCard}
        onAddColumn={onAddColumn}
        onAddRow={onAddRow}
        onApplyPack={onApplyPack}
        onManageRooms={onManageRooms}
        onRedo={onRedo}
        onSetLayoutMode={onSetLayoutMode}
        onToggleEditMode={onToggleEditMode}
        onUndo={onUndo}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);

    expect(screen.queryByText('Editing Home')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')[0]?.textContent).toBe('Manage Rooms');
    expect(
      screen
        .getAllByRole('button')
        .slice(-2)
        .map((button) => button.textContent)
    ).toEqual(['Add Card', 'Done']);

    fireEvent.click(screen.getByRole('button', { name: /Add Card/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add row/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add column/i }));

    expect(onAddCard).toHaveBeenCalledTimes(1);
    expect(onAddRow).toHaveBeenCalledTimes(1);
    expect(onAddColumn).toHaveBeenCalledTimes(1);

    openMenu('Presets');
    fireEvent.click(screen.getByRole('menuitem', { name: /Command Center/i }));

    expect(onApplyPack).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Apply this preset?')).toBeInTheDocument();
    expect(
      screen.getByText('This will rearrange your Home dashboard using the Command center preset.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply preset' }));

    expect(onApplyPack).toHaveBeenCalledWith('command-center');

    fireEvent.click(screen.getByRole('button', { name: /Flowing bento/i }));
    expect(onSetLayoutMode).toHaveBeenCalledWith('flow');

    fireEvent.click(screen.getByRole('button', { name: 'Manage Rooms' }));
    expect(onManageRooms).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onToggleEditMode).toHaveBeenCalledTimes(1);
  });

  it('keeps section-only creation actions off the strip in flow mode', () => {
    const onSetLayoutMode = vi.fn();

    renderWithProviders(
      <HomeEditCommandBar
        homeLayoutMode="flow"
        onAddCard={vi.fn()}
        onAddColumn={vi.fn()}
        onAddRow={vi.fn()}
        onSetLayoutMode={onSetLayoutMode}
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add Card/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Add row/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add column/i })).not.toBeInTheDocument();
  });
});
