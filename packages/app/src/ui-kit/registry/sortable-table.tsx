import { TableCellContent } from '@navet/app/ui-kit/patterns';
import { BodyText, SortableTableHeader, SurfacePanel } from '@navet/app/ui-kit/primitives';
export interface SortableTableProps {
  caption: string;
  emptyLabel: string;
  columns: readonly { id: string; label: string; sortLabel: string; disabled?: boolean }[];
  // Caller sorts the normalized rows and retains sorting/persistence policy.
  rows: readonly {
    id: string;
    cells: Readonly<Record<string, { primary: string; secondary?: string }>>;
  }[];
  sort?: { column: string; direction: 'asc' | 'desc' };
  onSort: (column: string) => void;
}
export function SortableTable({
  caption,
  emptyLabel,
  columns,
  rows,
  sort,
  onSort,
}: SortableTableProps) {
  return (
    <SurfacePanel padding="sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="px-3 py-2"
                  aria-sort={
                    sort?.column === column.id
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <SortableTableHeader
                    label={column.label}
                    ariaLabel={column.sortLabel}
                    disabled={column.disabled}
                    direction={sort?.column === column.id ? sort.direction : undefined}
                    onClick={() => onSort(column.id)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.id} className="px-3 py-2">
                      <TableCellContent
                        primary={row.cells[column.id]?.primary ?? ''}
                        secondary={row.cells[column.id]?.secondary}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-3">
                  <div role="status">
                    <BodyText>{emptyLabel}</BodyText>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SurfacePanel>
  );
}
