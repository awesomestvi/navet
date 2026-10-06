// Carry the persistent launcher across transient dialogs whose action controls unmount.
const returnTargets = new WeakMap<HTMLElement, HTMLElement>();

export function registerDialogReturnFocus(container: HTMLElement, target: HTMLElement | null) {
  if (target) returnTargets.set(container, target);
}

export function getDialogReturnFocus(active: HTMLElement | null): HTMLElement | null {
  for (let current = active; current; current = current.parentElement) {
    const target = returnTargets.get(current);
    if (target?.isConnected) return target;
  }
  return active;
}
