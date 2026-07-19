import { describe, expect, it } from 'vitest';
import type { AutomationTask, QuickActionRoutine } from '../../types';
import { sortAutomationTasks, sortQuickActions, toggleTableSort } from '../task-table-sorting';

function automation(
  name: string,
  category: string | undefined,
  status: AutomationTask['status']
): AutomationTask {
  return {
    id: `automation.${name.toLowerCase().replaceAll(' ', '_')}`,
    name,
    room: 'Home',
    enabled: status === 'active',
    state: status === 'active' ? 'on' : 'off',
    status,
    isRecentlyTriggered: false,
    needsAttention: status === 'attention',
    category,
  };
}

describe('task table sorting', () => {
  it('cycles the selected column through ascending, descending, and unsorted', () => {
    const ascending = toggleTableSort(null, 'name');
    const descending = toggleTableSort(ascending, 'name');

    expect(ascending).toEqual({ key: 'name', direction: 'asc' });
    expect(descending).toEqual({ key: 'name', direction: 'desc' });
    expect(toggleTableSort(descending, 'name')).toBeNull();
    expect(toggleTableSort(descending, 'status')).toEqual({
      key: 'status',
      direction: 'asc',
    });
  });

  it('sorts automation categories while keeping missing values last', () => {
    const tasks = [
      automation('No category', undefined, 'disabled'),
      automation('Secure home', 'Security', 'active'),
      automation('Morning routine', 'Morning', 'attention'),
    ];

    expect(
      sortAutomationTasks(tasks, { key: 'category', direction: 'asc' }, 'en').map(
        (task) => task.name
      )
    ).toEqual(['Morning routine', 'Secure home', 'No category']);
    expect(
      sortAutomationTasks(tasks, { key: 'category', direction: 'desc' }, 'en').map(
        (task) => task.name
      )
    ).toEqual(['Secure home', 'Morning routine', 'No category']);
  });

  it('sorts quick actions by name and type', () => {
    const actions: QuickActionRoutine[] = [
      { id: 'scene.movie', type: 'scene', name: 'Movie time', room: 'Living room', state: 'off' },
      { id: 'script.goodnight', type: 'script', name: 'Good night', room: 'Home', state: 'off' },
    ];

    expect(
      sortQuickActions(actions, { key: 'name', direction: 'asc' }, 'en').map(
        (action) => action.name
      )
    ).toEqual(['Good night', 'Movie time']);
    expect(
      sortQuickActions(actions, { key: 'type', direction: 'asc' }, 'en').map(
        (action) => action.type
      )
    ).toEqual(['scene', 'script']);
  });
});
