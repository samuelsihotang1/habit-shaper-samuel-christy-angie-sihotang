import { useCallback, useState, useTransition } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogoMark } from '@/components/Shells';
import { Alert, Button, ConfirmDialog, EmptyState, IconButton, ProgressRing, Segmented } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useHabitActions, useHabits } from '@/hooks/useHabits';
import { ApiError } from '@/services/api';
import type { Habit, HabitType } from '@/types/habits';
import { formatDay, today as todayDate } from '@/utils/dates';
import { loggedDays } from '@/utils/habits';
import { HabitCard } from '@/pages/today/HabitCard';
import { WeekStrip } from '@/pages/today/WeekStrip';

const TYPES: { value: HabitType; label: string }[] = [
  { value: 'build', label: 'Build' },
  { value: 'break', label: 'Break' },
];

const LOADING = (
  <div className="space-y-3" aria-busy="true" aria-label="Loading habits">
    {[0, 1, 2].map((key) => (
      <div key={key} className="h-20 animate-pulse rounded-3xl bg-surface" />
    ))}
  </div>
);

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayDate();
  const { data: habits, error: loadError, mutate: reload } = useHabits();
  const { setLog } = useHabitActions();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(todayDate);
  const [tab, setTab] = useState<HabitType>('build');
  const [relapse, setRelapse] = useState<Habit | null>(null);
  const [confirming, startConfirming] = useTransition();

  const save = useCallback(
    async (habit: Habit, logged: boolean) => {
      setError(null);
      try {
        await setLog(habit.id, selected, logged);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not save that. Try again.');
      }
    },
    [setLog, selected],
  );

  // Logging a relapse restarts a clean streak, so it asks first; undoing one does not.
  const toggle = useCallback(
    (habit: Habit, logged: boolean) => {
      if (habit.type === 'break' && logged) setRelapse(habit);
      else return save(habit, logged);
    },
    [save],
  );

  const shown: Habit[] = [];
  let active = 0;
  let done = 0;
  for (const habit of habits ?? []) {
    if (habit.type === tab) shown.push(habit);
    if (habit.type === 'build' && habit.started_on <= selected) {
      active += 1;
      if (loggedDays(habit).has(selected)) done += 1;
    }
  }
  const dayLabel = selected === today ? 'today' : formatDay(selected, { weekday: 'long', month: 'short', day: 'numeric' });
  const shownError = error ?? (habits ? null : (loadError?.message ?? null));

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="Habit Shaper">
          <LogoMark className="size-11" />
        </Link>
        <h1 className="text-lg font-bold text-ink">{formatDay(selected, { month: 'long', year: 'numeric' })}</h1>
        <IconButton icon="plus" label="New habit" tone="brand" onClick={() => void navigate('/habits/new')} />
      </header>

      <section className="flex items-center justify-between gap-4 rounded-3xl bg-night p-5 text-white">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">
            {greeting()}, {user?.name.split(' ')[0]}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {active === 0
              ? 'Add a habit to start tracking.'
              : `${done} of ${active} build habit${active === 1 ? '' : 's'} done ${selected === today ? 'today' : `on ${dayLabel}`}.`}
          </p>
        </div>
        <ProgressRing value={active ? done / active : 0}>{active ? `${Math.round((done / active) * 100)}%` : '–'}</ProgressRing>
      </section>

      <WeekStrip selected={selected} today={today} onSelect={setSelected} />

      <Segmented label="Habit type" value={tab} onChange={setTab} options={TYPES} />

      {shownError ? (
        <Alert>
          {shownError}{' '}
          {habits ? null : (
            <button type="button" onClick={() => void reload()} className="cursor-pointer font-bold underline">
              Try again
            </button>
          )}
        </Alert>
      ) : null}

      {habits || loadError ? null : LOADING}

      {habits && shown.length === 0 ? (
        <EmptyState
          icon={tab === 'build' ? 'flame' : 'leaf'}
          title={tab === 'build' ? 'No habits to build yet' : 'No habits to break yet'}
          body={
            tab === 'build'
              ? 'Pick something small you want to do every day, like reading ten pages.'
              : 'Pick something you want to stop, like smoking. Every day without it counts.'
          }
          action={
            <Button onClick={() => void navigate(`/habits/new?type=${tab}`)}>{tab === 'build' ? 'Create a habit' : 'Add one to break'}</Button>
          }
        />
      ) : null}

      <div className="space-y-3">
        {shown.map((habit) => (
          <HabitCard key={habit.id} habit={habit} day={selected} onToggle={toggle} />
        ))}
      </div>

      <ConfirmDialog
        open={relapse !== null}
        tone="brand"
        icon="leaf"
        title={`Log a relapse ${selected === today ? 'today' : `on ${dayLabel}`}?`}
        body={`Your clean streak for ${relapse?.name ?? 'this habit'} starts again the next day. You can undo this.`}
        confirmLabel="Log relapse"
        busy={confirming}
        onConfirm={() =>
          startConfirming(async () => {
            if (relapse) await save(relapse, true);
            setRelapse(null);
          })
        }
        onCancel={() => setRelapse(null)}
      />
    </div>
  );
}
