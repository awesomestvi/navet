import { describe, expect, it } from 'vitest';
import { canStartDashboardDrag } from '../use-dashboard-drag-state';

describe('canStartDashboardDrag', () => {
  it('allows sortable home card bodies to start a drag', () => {
    const dragSurface = document.createElement('div');
    dragSurface.dataset.cardDragSurface = 'true';

    const cardBody = document.createElement('div');
    cardBody.dataset.cardNodrag = 'true';
    dragSurface.append(cardBody);

    expect(canStartDashboardDrag(cardBody)).toBe(true);
  });

  it('keeps dashboard card bodies inert outside a drag surface', () => {
    const cardBody = document.createElement('div');
    cardBody.dataset.cardNodrag = 'true';

    expect(canStartDashboardDrag(cardBody)).toBe(false);
  });

  it('keeps edit controls inert inside a drag surface', () => {
    const dragSurface = document.createElement('div');
    dragSurface.dataset.cardDragSurface = 'true';

    const button = document.createElement('button');
    dragSurface.append(button);

    expect(canStartDashboardDrag(button)).toBe(false);
  });
});
