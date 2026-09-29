import { useState, useTransition } from 'react';
import { Link, useNavigate } from 'react-router';
import { HabitBubble, Icon } from '@/components/icons';
import { Alert, Button, ConfirmDialog, EmptyState, PageHeader } from '@/components/ui';
import { useHabitActions, useHabits } from '@/hooks/useHabits';
import { ApiError } from '@/services/api';
import type { Habit } from '@/types/habits';

const LOADING = <div className="h-64 animate-pulse rounded-3xl bg-surface" />;

/** The reference's "Manage Habits": one row per habit, a bin on each, "Create your own" below. */
export function HabitsPage() {
  const navigate = useNavigate();
  const { data: habits, error: loadError } = useHabits();
  const { remove } = useHabitActions();
  const [error, setError] = useState<string | null>(null);
  const [doomed, setDoomed] = useState<Habit | null>(null);
  const [removing, startRemoving] = useTransition();

  const confirmDelete = () =>
    startRemoving(async () => {
      if (!doomed) return;
      try {
        await remove(doomed.id);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not delete that habit.');
      }
      setDoomed(null);
    });

  const shownError = error ?? (habits ? null : (loadError?.message ?? null));

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <PageHeader title="Manage habits" back="/settings" />
      {shownError ? <Alert>{shownError}</Alert> : null}

      {habits || loadError ? null : LOADING}

      {habits?.length === 0 ? <EmptyState icon="list" title="No habits yet" body="Create one to build, or one to break." /> : null}

      {habits && habits.length > 0 ? (
        <ul className="space-y-2 rounded-3xl bg-surface p-3">
          {habits.map((habit) => (
            <li key={habit.id} className="flex items-center gap-3 rounded-full bg-canvas p-2 pr-3">
              <Link to={`/habits/${habit.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-full">
                <HabitBubble icon={habit.icon} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{habit.name}</span>
                  <span className="block text-xs text-ink-muted">{habit.type === 'build' ? 'Build' : 'Break'}</span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Delete ${habit.name}`}
                onClick={() => setDoomed(habit)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-danger hover:bg-danger-soft"
              >
                <Icon name="trash" className="size-5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-8">
        <Button className="w-full" onClick={() => void navigate('/habits/new')}>
          Create your own
        </Button>
      </div>

      <ConfirmDialog
        open={doomed !== null}
        title={`Delete ${doomed?.name ?? 'this habit'}`}
        body="It leaves your lists, and so do the goals linked to it. Your check-ins are kept."
        confirmLabel="Delete"
        busy={removing}
        onConfirm={confirmDelete}
        onCancel={() => setDoomed(null)}
      />
    </div>
  );
}
