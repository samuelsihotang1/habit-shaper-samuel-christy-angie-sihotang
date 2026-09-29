import { memo, useTransition } from 'react';
import { Link } from 'react-router';
import { HabitBubble, Icon } from '@/components/icons';
import { cx, Spinner } from '@/components/ui';
import type { Habit } from '@/types/habits';
import { formatDay } from '@/utils/dates';
import { loggedDays } from '@/utils/habits';

/** "12-day streak" for build, "Day 12 clean" for break. */
export function streakLabel(habit: Habit): string {
  const days = habit.stats.current_streak;
  if (habit.type === 'build') return days === 0 ? 'No streak yet' : `${days}-day streak`;
  return days === 0 ? 'Relapsed today' : `Day ${days} clean`;
}

/**
 * One habit on one day, like the reference's "Drink water" card: the whole
 * left side opens the habit, the pill on the right is the day's check-in.
 * Memoised, so a check-in re-renders only its own card: `onToggle` must be
 * stable (TodayPage), and the cache hands back the same object for every
 * habit the write did not touch.
 */
export const HabitCard = memo(function HabitCard({ habit, day, onToggle }: {
  habit: Habit;
  day: string;
  /** Resolves when the check-in is saved; the card spins until then. */
  onToggle: (habit: Habit, logged: boolean) => Promise<void> | void;
}) {
  const [pending, startTransition] = useTransition();
  const logged = loggedDays(habit).has(day);
  const notStarted = day < habit.started_on;
  const build = habit.type === 'build';

  let action: { label: string; className: string };
  if (notStarted) action = { label: `From ${formatDay(habit.started_on, { month: 'short', day: 'numeric' })}`, className: 'bg-canvas text-ink-muted' };
  else if (build) action = logged ? { label: 'Done', className: 'bg-brand text-ink' } : { label: 'Mark done', className: 'bg-brand-soft text-ink hover:bg-brand/40' };
  else action = logged ? { label: 'Relapsed', className: 'bg-danger-soft text-danger' } : { label: 'Log relapse', className: 'bg-brand-soft text-ink hover:bg-brand/40' };

  return (
    <article className="flex items-center gap-3 rounded-3xl bg-surface p-4">
      <Link to={`/habits/${habit.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
        <HabitBubble icon={habit.icon} />
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink">{habit.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
            <Icon name={build ? 'flame' : 'leaf'} className={cx('size-4', build ? 'text-accent-orange' : 'text-accent-green')} />
            {streakLabel(habit)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        disabled={notStarted || pending}
        aria-pressed={logged}
        aria-label={`${action.label}: ${habit.name}`}
        onClick={() => startTransition(async () => onToggle(habit, !logged))}
        className={cx(
          'inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-bold transition disabled:cursor-not-allowed',
          action.className,
        )}
      >
        {pending ? <Spinner /> : logged ? <Icon name={build ? 'check' : 'x'} className="size-4" /> : null}
        {action.label}
      </button>
    </article>
  );
});
