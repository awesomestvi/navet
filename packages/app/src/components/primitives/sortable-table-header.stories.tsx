import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks/use-theme';
import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { expect } from 'storybook/test';
import { SortableTableHeader, type TableSortDirection } from './sortable-table-header';

type SortKey = 'name' | 'category' | 'status';

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

interface AutomationRow {
  name: string;
  description: string;
  category: string;
  status: 'Enabled' | 'Disabled';
}

const automations: AutomationRow[] = [
  {
    name: 'Good morning',
    description: 'Raises bedroom lights and starts the kitchen speaker.',
    category: 'Morning',
    status: 'Enabled',
  },
  {
    name: 'Night check',
    description: 'Locks doors and turns off common-area lights.',
    category: 'Security',
    status: 'Enabled',
  },
  {
    name: 'Away presence',
    description: 'Runs presence lighting when nobody is home.',
    category: 'Presence',
    status: 'Disabled',
  },
];

function getNextSort(current: SortState | null, key: SortKey): SortState | null {
  if (current?.key === key && current.direction === 'desc') {
    return null;
  }

  return {
    key,
    direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function getAriaSort(key: SortKey, sort: SortState | null): 'ascending' | 'descending' | 'none' {
  if (key !== sort?.key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

function SortableAutomationTable() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedAutomations = useMemo(() => {
    if (!sort) return automations;

    return [...automations].sort((left, right) => {
      const result = left[sort.key].localeCompare(right[sort.key]);
      return sort.direction === 'asc' ? result : -result;
    });
  }, [sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => getNextSort(current, key));
  };

  const sortControl = (key: SortKey, label: string) => {
    const activeDirection = sort?.key === key ? sort.direction : undefined;
    const stateLabel =
      activeDirection === 'asc'
        ? 'sorted ascending'
        : activeDirection === 'desc'
          ? 'sorted descending'
          : 'not sorted';

    return (
      <SortableTableHeader
        label={label}
        direction={activeDirection}
        ariaLabel={`${label}, ${stateLabel}. Activate to sort.`}
        onClick={() => toggleSort(key)}
      />
    );
  };

  return (
    <div
      className={`w-full max-w-3xl overflow-hidden rounded-[22px] border ${surface.border} ${surface.panel} ${surface.textPrimary}`}
    >
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[55%]" />
          <col className="w-[27%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead>
          <tr className={`border-b text-xs font-medium ${surface.border} ${surface.textMuted}`}>
            <th scope="col" aria-sort={getAriaSort('name', sort)} className="px-4 py-2">
              {sortControl('name', 'Automation')}
            </th>
            <th scope="col" aria-sort={getAriaSort('category', sort)} className="px-4 py-2">
              {sortControl('category', 'Category')}
            </th>
            <th scope="col" aria-sort={getAriaSort('status', sort)} className="px-4 py-2">
              {sortControl('status', 'Status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedAutomations.map((automation) => (
            <tr key={automation.name} className={`border-b last:border-b-0 ${surface.border}`}>
              <td className="min-w-0 px-4 py-3.5">
                <div className="truncate text-sm font-semibold">{automation.name}</div>
                <div className={`truncate text-xs ${surface.textSecondary}`}>
                  {automation.description}
                </div>
              </td>
              <td className="px-4 py-3.5 text-sm">{automation.category}</td>
              <td className="px-4 py-3.5">
                <span
                  className={`inline-flex rounded-full border px-2 py-1 text-xs ${surface.border} ${surface.subtleBg} ${surface.textSecondary}`}
                >
                  {automation.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DirectionStatesPreview() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={`grid w-full max-w-xl grid-cols-3 gap-6 rounded-[22px] border px-4 py-2 text-xs font-medium ${surface.border} ${surface.panel} ${surface.textMuted}`}
    >
      <SortableTableHeader
        label="Unsorted"
        ariaLabel="Unsorted column. Activate to sort."
        onClick={() => {}}
      />
      <SortableTableHeader
        label="Ascending"
        direction="asc"
        ariaLabel="Ascending column, sorted ascending. Activate to sort descending."
        onClick={() => {}}
      />
      <SortableTableHeader
        label="Descending"
        direction="desc"
        ariaLabel="Descending column, sorted descending. Activate to sort ascending."
        onClick={() => {}}
      />
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Sortable Table Header',
  component: SortableTableHeader,
  tags: ['autodocs'],
  args: {
    label: 'Automation',
    ariaLabel: 'Automation, not sorted. Activate to sort.',
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Canonical sorting control for compact Navet table headers.',
          '',
          'The Tasks automation table is the product reference: sorting stays quiet until it is useful, then the active direction remains visible beside the column label.',
          '',
          'Usage guidance:',
          '- Place the control inside a semantic column header and set `aria-sort` on that header.',
          '- Keep sort state in the owning table; pass the active `direction` into this primitive.',
          '- Cycle each column through ascending, descending, and unsorted so the original row order remains recoverable.',
          '- Supply a localized `ariaLabel` that communicates the current state and available action.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof SortableTableHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const InteractiveTable: Story = {
  render: () => <SortableAutomationTable />,
  play: async ({ canvas, userEvent, step }) => {
    await step('cycles a column through ascending, descending, and unsorted', async () => {
      const categoryHeader = canvas.getByRole('button', { name: /category, not sorted/i });

      await userEvent.click(categoryHeader);
      await expect(categoryHeader).toHaveAttribute('data-sort-direction', 'asc');
      await expect(canvas.getAllByRole('row')[1]).toHaveTextContent('Good morning');

      await userEvent.click(categoryHeader);
      await expect(categoryHeader).toHaveAttribute('data-sort-direction', 'desc');
      await expect(canvas.getAllByRole('row')[1]).toHaveTextContent('Night check');

      await userEvent.click(categoryHeader);
      await expect(categoryHeader).toHaveAttribute('data-sort-direction', 'none');
      await expect(canvas.getAllByRole('row')[2]).toHaveTextContent('Night check');
    });
  },
};

export const DirectionStates: Story = {
  render: () => <DirectionStatesPreview />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
