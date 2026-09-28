import { useState } from 'react';
import { cx } from '@/components/ui';

export interface Column {
  key: string;
  /** Axis label under the column; empty leaves the slot blank. */
  label: string;
  value: number;
  /** The tooltip's text. */
  detail: string;
}

/**
 * One series of columns, like the reference's completion chart. Brand yellow
 * sits at 1.7:1 on white, below the 3:1 a mark needs, so the chart carries
 * relief: the newest column is labelled, every column has a keyboard-reachable
 * tooltip, and the page shows the same numbers as a table.
 */
export function ColumnChart({ columns, max, format, ticks, label }: {
  columns: Column[];
  max: number;
  format: (value: number) => string;
  ticks: number[];
  label: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const top = Math.max(max, 1);
  const last = columns.at(-1)?.key;

  return (
    <figure aria-label={label} className="relative pt-6">
      <div className="relative ml-9 h-40">
        {ticks.map((tick) => (
          <div key={tick} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(tick / top) * 100}%` }}>
            <span className="absolute -left-9 -translate-y-1/2 text-xs text-ink-muted">{format(tick)}</span>
          </div>
        ))}
        <ol className="absolute inset-0 flex items-end gap-0.5">
          {columns.map((column, index) => {
            const height = (column.value / top) * 100;
            const shown = active === column.key;
            // Near an edge the tooltip hangs inward, so it never runs off the card.
            const side = index < columns.length / 3 ? 'left-0' : index >= (columns.length * 2) / 3 ? 'right-0' : 'left-1/2 -translate-x-1/2';
            return (
              <li key={column.key} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
                <button
                  type="button"
                  aria-label={column.detail}
                  onMouseEnter={() => setActive(column.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(column.key)}
                  onBlur={() => setActive(null)}
                  className="flex h-full w-full cursor-default items-end justify-center focus:outline-none"
                >
                  <span
                    className={cx('w-full max-w-6 rounded-t-[4px] transition', column.key === last ? 'bg-brand' : 'bg-brand/55', shown && 'bg-brand-strong')}
                    style={{ height: `${Math.max(height, column.value > 0 ? 2 : 0)}%` }}
                  />
                </button>
                {column.key === last && !shown && (
                  <span className="pointer-events-none absolute -translate-y-1.5 whitespace-nowrap text-xs font-bold text-ink" style={{ bottom: `${height}%` }}>
                    {format(column.value)}
                  </span>
                )}
                {shown && (
                  <span
                    role="tooltip"
                    className={cx('pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-xl bg-night px-2.5 py-1.5 text-xs font-semibold text-white', side)}
                    style={{ bottom: `${height}%` }}
                  >
                    {column.detail}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <ol className="ml-9 mt-2 flex gap-0.5" aria-hidden>
        {columns.map((column) => (
          <li key={column.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-xs text-ink-muted">
            {column.label}
          </li>
        ))}
      </ol>
    </figure>
  );
}
