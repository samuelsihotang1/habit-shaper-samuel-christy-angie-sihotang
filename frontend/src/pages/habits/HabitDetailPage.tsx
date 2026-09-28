import { useState, useTransition } from 'react';
import { useNavigate, useParams } from 'react-router';
import { HabitBubble } from '@/components/icons';
import { Alert, Button, Card, ConfirmDialog, IconButton, PageHeader, ProgressBar } from '@/components/ui';
import { useHabit, useHabitActions } from '@/hooks/useHabits';
import { ApiError } from '@/services/api';
import { addDays, formatDay, today as todayDate } from '@/utils/dates';
import { MonthCalendar } from '@/pages/habits/MonthCalendar';

const weekLabel = (start: string) =>
  `${formatDay(start, { month: 'short', day: 'numeric' })} – ${formatDay(addDays(start, 6), { month: 'short', day: 'numeric' })}`;

export function HabitDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const today = todayDate();
  const { data: habit, error: loadError } = useHabit(id);
  const { setLog, remove } = useHabitActions();
  const [error, setError] = useState<string | null>(null);
  // One day at a time: two answers racing back could leave the older one on screen.
  const [saving, startSaving] = useTransition();
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const [relapse, setRelapse] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removing, startRemoving] = useTransition();

  const save = (day: string, logged: boolean) =>
    startSaving(async () => {
      setSavingDay(day);
      setError(null);
      try {
        await setLog(id, day, logged);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not save that day.');
      }
      setRelapse(null);
    });

  const toggle = (day: string, logged: boolean) => {
    if (habit?.type === 'break' && logged) setRelapse(day);
    else save(day, logged);
  };

  const confirmDelete = () =>
    startRemoving(async () => {
      try {
        await remove(id);
        await navigate('/', { replace: true });
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not delete this habit.');
        setDeleting(false);
      }
    });

  if (!habit) {
    const failed = error ?? loadError?.message;
    return (
      <div>
        <PageHeader title="Habit" />
        {failed ? <Alert>{failed}</Alert> : <div className="h-64 animate-pulse rounded-3xl bg-surface" />}
      </div>
    );
  }

  const build = habit.type === 'build';
  const thisWeek = habit.weeks[0];

  return (
    <div className="space-y-4">
      <PageHeader
        title={habit.name}
        action={<IconButton icon="pencil" label="Edit habit" onClick={() => void navigate(`/habits/${habit.id}/edit`)} />}
      />

      <section className="rounded-3xl bg-night p-5 text-white">
        <div className="flex items-center gap-3">
          <HabitBubble icon={habit.icon} />
          <div>
            <p className="font-bold">{build ? 'Habit to build' : 'Habit to break'}</p>
            <p className="text-sm text-white/60">
              {build ? 'Since' : 'Clean since'} {formatDay(habit.started_on, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-bold text-brand">{habit.stats.current_streak}</p>
            <p className="mt-1 text-sm text-white/70">{build ? 'day streak' : habit.stats.current_streak === 1 ? 'day clean' : 'days clean'}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-right text-sm">
            <dt className="text-white/60">Best</dt>
            <dd className="font-bold">{habit.stats.longest_streak} days</dd>
            <dt className="text-white/60">{build ? 'Done' : 'Relapses'}</dt>
            <dd className="font-bold">{habit.stats.total_logs}</dd>
          </dl>
        </div>
      </section>

      {error ? <Alert>{error}</Alert> : null}

      {build && thisWeek ? (
        <Card title="Weekly completion" description="Days done and missed in each week, Monday to Sunday.">
          <ul className="space-y-4">
            {habit.weeks.map((week) => (
              <li key={week.week_start}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-ink">{week.week_start === thisWeek.week_start ? 'This week' : weekLabel(week.week_start)}</span>
                  <span className="text-ink-muted">
                    {week.done}/{week.days} done · <span className={week.missed > 0 ? 'font-semibold text-danger' : ''}>{week.missed} missed</span>
                  </span>
                </div>
                <ProgressBar value={week.rate ?? 0} label={`${weekLabel(week.week_start)} completion`} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card
        title="History"
        description={build ? 'Tap a day to mark it done, or tap again to clear it.' : 'Tap a day to log a relapse, or tap again to clear it.'}
      >
        <MonthCalendar habit={habit} today={today} pending={saving ? savingDay : null} onToggle={toggle} />
      </Card>

      <Button variant="danger-soft" className="w-full" onClick={() => setDeleting(true)}>
        Delete habit
      </Button>

      <ConfirmDialog
        open={relapse !== null}
        tone="brand"
        icon="leaf"
        title={`Log a relapse on ${relapse ? formatDay(relapse, { month: 'short', day: 'numeric' }) : ''}?`}
        body="Your clean streak starts again the next day. You can undo this."
        confirmLabel="Log relapse"
        busy={saving}
        onConfirm={() => relapse && save(relapse, true)}
        onCancel={() => setRelapse(null)}
      />
      <ConfirmDialog
        open={deleting}
        title={`Delete ${habit.name}`}
        body="It leaves your lists, and so do the goals linked to it. Your check-ins are kept."
        confirmLabel="Delete"
        busy={removing}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
