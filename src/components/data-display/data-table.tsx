'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/feedback/empty-state';

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderMobileItem?: (row: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  renderMobileItem,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria at this time.',
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Card View (shown below md breakpoint when renderMobileItem is provided) */}
      {renderMobileItem && (
        <div className="md:hidden space-y-3">
          {data.map((row) => (
            <div
              key={keyExtractor(row)}
              onClick={() => onRowClick && onRowClick(row)}
              className={cn(
                'rounded-xl border border-surface-border bg-surface-primary/95 p-4 space-y-3 transition-colors',
                onRowClick && 'cursor-pointer hover:border-primary-500/40 active:scale-[0.99]'
              )}
            >
              {renderMobileItem(row)}
            </div>
          ))}
        </div>
      )}

      {/* Standard Table View (horizontal scroll accessible with keyboard focus) */}
      <div
        className={cn(
          'w-full overflow-hidden rounded-xl border border-surface-border glass-panel',
          renderMobileItem ? 'hidden md:block' : 'block'
        )}
      >
        <div
          tabIndex={0}
          role="region"
          aria-label="Data Table"
          className="w-full overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary-500/50"
        >
          <table className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-secondary/50 text-caption font-semibold text-foreground/60 uppercase tracking-wider">
                {columns.map((col) => (
                  <th key={col.key} className={cn('px-4 py-3.5 whitespace-nowrap', col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {data.map((row) => {
                const key = keyExtractor(row);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      'transition-colors hover:bg-white/[0.03]',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td key={`${key}-${col.key}`} className={cn('px-4 py-3.5 align-middle', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
