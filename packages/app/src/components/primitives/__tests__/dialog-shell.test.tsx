import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogShell, settingsDialogContentClass } from '../dialog-shell';

const surface = {
  panel: 'bg-slate-950/90',
  border: 'border-white/10',
};

function renderMobileCoverSheet(onOpenChange = vi.fn()) {
  render(
    <DialogShell
      isOpen
      onOpenChange={onOpenChange}
      overlayClassName="bg-black/55"
      contentClassName={settingsDialogContentClass(surface, { padding: true })}
      contentTitle="Settings"
    >
      <p>Dialog body</p>
    </DialogShell>
  );

  return onOpenChange;
}

describe('DialogShell mobile cover sheet gestures', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 640,
    });
  });

  it('closes when the handle is dragged downward past the threshold', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });
    const dialog = screen.getByRole('dialog');

    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 190, pointerId: 1 });

    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-drag-y')).toBe('90px');

    fireEvent.pointerUp(window, { clientY: 190, pointerId: 1 });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('expands to fullscreen when the handle is dragged upward past the threshold', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      bottom: 640,
      height: 180,
      left: 8,
      right: 392,
      toJSON: () => ({}),
      top: 460,
      width: 384,
      x: 8,
      y: 460,
    });

    fireEvent.pointerDown(handle, { clientY: 160, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 80, pointerId: 1 });

    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('380px');

    fireEvent.pointerUp(window, { clientY: 80, pointerId: 1 });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog).toHaveClass('max-sm:!h-auto');
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('0.5rem');
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
  });

  it('keeps tap-to-close behavior on the handle', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });

    fireEvent.click(handle);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves a fullscreen sheet one-to-one while dragging downward', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      bottom: 640,
      height: 180,
      left: 8,
      right: 392,
      toJSON: () => ({}),
      top: 460,
      width: 384,
      x: 8,
      y: 460,
    });

    fireEvent.pointerDown(handle, { clientY: 160, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 80, pointerId: 1 });

    const fullscreenHandle = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.pointerDown(fullscreenHandle, { clientY: 80, pointerId: 2 });
    fireEvent.pointerMove(window, { clientY: 116, pointerId: 2 });

    expect(dialog).toHaveClass('max-sm:!h-auto');
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('44px');
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-drag-y')).toBe('0px');

    fireEvent.pointerUp(window, { clientY: 116, pointerId: 2 });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('0.5rem');
  });

  it('collapses a fullscreen sheet after a ten percent downward drag', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      bottom: 640,
      height: 180,
      left: 8,
      right: 392,
      toJSON: () => ({}),
      top: 460,
      width: 384,
      x: 8,
      y: 460,
    });

    fireEvent.pointerDown(handle, { clientY: 160, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 80, pointerId: 1 });

    const fullscreenHandle = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.pointerDown(fullscreenHandle, { clientY: 80, pointerId: 2 });
    fireEvent.pointerMove(window, { clientY: 150, pointerId: 2 });

    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('78px');

    fireEvent.pointerUp(window, { clientY: 150, pointerId: 2 });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog).not.toHaveClass('max-sm:!h-auto');
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('auto');
    expect(
      screen.getByRole('button', { name: /drag dialog to fullscreen or close/i })
    ).toBeInTheDocument();
  });

  it('collapses a fullscreen sheet back to its original size on a moderate downward drag', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      bottom: 640,
      height: 180,
      left: 8,
      right: 392,
      toJSON: () => ({}),
      top: 460,
      width: 384,
      x: 8,
      y: 460,
    });

    fireEvent.pointerDown(handle, { clientY: 160, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 80, pointerId: 1 });

    const fullscreenHandle = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.pointerDown(fullscreenHandle, { clientY: 80, pointerId: 2 });
    fireEvent.pointerMove(window, { clientY: 360, pointerId: 2 });
    fireEvent.pointerUp(window, { clientY: 360, pointerId: 2 });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(dialog).not.toHaveClass('max-sm:!h-auto');
    expect(dialog.style.getPropertyValue('--mobile-cover-sheet-top')).toBe('auto');
    expect(
      screen.getByRole('button', { name: /drag dialog to fullscreen or close/i })
    ).toBeInTheDocument();
  });

  it('closes a fullscreen sheet only after a long downward drag', () => {
    const onOpenChange = renderMobileCoverSheet();
    const handle = screen.getByRole('button', { name: /drag dialog to fullscreen or close/i });
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      bottom: 640,
      height: 180,
      left: 8,
      right: 392,
      toJSON: () => ({}),
      top: 460,
      width: 384,
      x: 8,
      y: 460,
    });

    fireEvent.pointerDown(handle, { clientY: 160, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 80, pointerId: 1 });

    const fullscreenHandle = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.pointerDown(fullscreenHandle, { clientY: 80, pointerId: 2 });
    fireEvent.pointerMove(window, { clientY: 560, pointerId: 2 });
    fireEvent.pointerUp(window, { clientY: 560, pointerId: 2 });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
