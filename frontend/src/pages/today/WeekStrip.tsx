import { Icon } from '@/components/icons';
import { cx } from '@/components/ui';
import { addDays, formatDay, weekOf, weekStart } from '@/utils/dates';

/**
 * Monday–Sunday, as the reference's date row: the chosen day is a black tile,
 * today carries a dot, and days after today cannot be picked.
 */
export function WeekStrip({ selected, today, onSelect }: { selected: string; today: string; onSelect: (day: string) => void }) {
  const days = weekOf(selected);
  const isCurrentWeek = weekStart(selected) === weekStart(today);

  return (
    <div className="flex items-center gap-1 rounded-3xl bg-surface p-2">
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => onSelect(addDays(selected, -7))}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
      >
        <Icon name="chevron-left" className="size-4" />
      </button>
      <ol className="grid flex-1 grid-cols-7 gap-1">
        {days.map((day) => {
          const future = day > today;
          const active = day === selected;
          return (
            <li key={day}>
              <button
                type="button"
                disabled={future}
                aria-pressed={active}
                aria-label={formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}
                onClick={() => onSelect(day)}
                className={cx(
                  'flex w-full cursor-pointer flex-col items-center gap-1 rounded-2xl py-2 transition disabled:cursor-not-allowed disabled:opacity-35',
                  active ? 'bg-night text-white' : 'text-ink hover:bg-canvas',
                )}
              >
                <span className={cx('text-xs font-semibold', active ? 'text-white/70' : 'text-ink-muted')}>
                  {formatDay(day, { weekday: 'narrow' })}
                </span>
                <span className="text-base font-bold">{formatDay(day, { day: 'numeric' })}</span>
                <span className={cx('size-1 rounded-full', day === today ? (active ? 'bg-brand' : 'bg-ink') : 'bg-transparent')} />
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        aria-label="Next week"
        disabled={isCurrentWeek}
        onClick={() => onSelect(addDays(selected, 7) > today ? today : addDays(selected, 7))}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Icon name="chevron-right" className="size-4" />
      </button>
    </div>
  );
}
