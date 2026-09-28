import { useState } from 'react';
import { Icon } from '@/components/icons';
import { cx, Spinner } from '@/components/ui';
import type { Habit } from '@/types/habits';
import { addMonths, firstOfMonth, formatDay, monthGrid } from '@/utils/dates';
import { loggedDays } from '@/utils/habits';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * One month of the log. A logged day is a filled tile: yellow for done, red
 * for a relapse. Days before the start or after today cannot be tapped.
 */
export function MonthCalendar({ habit, today, pending, onToggle }: {
  habit: Habit;
  today: string;
  pending: string | null;
  onToggle: (day: string, logged: boolean) => void;
}) {
  const [month, setMonth] = useState(() => firstOfMonth(today));
  const logged = loggedDays(habit);
  const build = habit.type === 'build';
  const canGoBack = month > firstOfMonth(habit.started_on);
  const canGoForward = month < firstOfMonth(today);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => setMonth((current) => addMonths(current, -1))}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name="chevron-left" className="size-4" />
        </button>
        <p className="font-bold text-ink">{formatDay(month, { month: 'long', year: 'numeric' })}</p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => setMonth((current) => addMonths(current, 1))}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Icon name="chevron-right" className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((day, i) => (
          <span key={i} className="pb-1 text-xs font-semibold text-ink-muted">
            {day}
          </span>
        ))}
        {monthGrid(month).map((day, i) => {
          if (!day) return <span key={`pad-${i}`} />;
          const on = logged.has(day);
          const outside = day < habit.started_on || day > today;
          return (
            <button
              key={day}
              type="button"
              disabled={outside || pending !== null}
              aria-pressed={on}
              aria-label={`${formatDay(day, { month: 'long', day: 'numeric' })}${on ? (build ? ', done' : ', relapse') : ''}`}
              onClick={() => onToggle(day, !on)}
              className={cx(
                'flex aspect-square cursor-pointer items-center justify-center rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed',
                on && build && 'bg-brand text-ink',
                on && !build && 'bg-danger text-white',
                !on && !outside && 'bg-canvas text-ink hover:bg-brand-soft',
                outside && !on && 'text-ink-muted/40',
                day === today && !on && 'ring-2 ring-ink',
              )}
            >
              {pending === day ? <Spinner /> : formatDay(day, { day: 'numeric' })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
