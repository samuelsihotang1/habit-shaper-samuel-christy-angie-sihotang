import { useState, useTransition, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { HabitBubble, Icon } from '@/components/icons';
import { Alert, Button, Card, ConfirmDialog, cx, PageHeader, TextArea, TextField } from '@/components/ui';
import { useGoalActions, useGoals } from '@/hooks/useGoals';
import { useHabits } from '@/hooks/useHabits';
import { ApiError } from '@/services/api';
import type { Goal, Habit } from '@/types/habits';

const PRESETS = [7, 14, 30, 90];

const FIELDS = ['habit_id', 'title', 'target_days', 'notes'];

interface Draft {
  habitId: string;
  title: string;
  target: string;
  notes: string;
}

const BLANK: Draft = { habitId: '', title: '', target: '30', notes: '' };

const draftOf = (goal: Goal): Draft => ({
  habitId: goal.habit.id,
  title: goal.title,
  target: goal.target_days ? String(goal.target_days) : '',
  notes: goal.notes ?? '',
});

export function GoalFormPage() {
  const { id } = useParams();
  const { data: habits, error } = useHabits();

  if (id !== undefined) return <EditGoal id={id} habits={habits} habitsError={error} />;

  if (habits?.length === 0) {
    return (
      <div>
        <PageHeader title="New goal" back="/goals" />
        <Card title="Create a habit first" description="A goal is measured by one habit's streak, so it needs a habit to link to.">
          <Link to="/habits/new" className="font-bold text-ink underline decoration-brand decoration-2 underline-offset-4">
            Create a habit
          </Link>
        </Card>
      </div>
    );
  }
  return <GoalForm initial={BLANK} habits={habits} loadError={error} />;
}

/**
 * There is no GET /goals/:id: the list is small, and it is what the grid
 * already cached. The key swaps the empty form for one holding the goal.
 */
function EditGoal({ id, habits, habitsError }: { id: string; habits?: Habit[]; habitsError?: ApiError }) {
  const { data: goals, error } = useGoals();
  const goal = goals?.find((item) => item.id === id);
  const missing = goals && !goal ? new ApiError('That goal does not exist any more.', 404) : undefined;
  return (
    <GoalForm
      key={goal ? goal.id : 'loading'}
      id={id}
      initial={goal ? draftOf(goal) : BLANK}
      habits={habits}
      loadError={habitsError ?? error ?? missing}
    />
  );
}

function GoalForm({ id, initial, habits, loadError }: { id?: string; initial: Draft; habits?: Habit[]; loadError?: ApiError }) {
  const navigate = useNavigate();
  const { create, update, remove } = useGoalActions();
  const editing = id !== undefined;

  const [chosen, setChosen] = useState(initial.habitId);
  const [title, setTitle] = useState(initial.title);
  const [target, setTarget] = useState(initial.target);
  const [notes, setNotes] = useState(initial.notes);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, startSaving] = useTransition();
  const [removing, startRemoving] = useTransition();

  // A new goal links the first habit until another is picked.
  const habitId = chosen || (editing ? '' : (habits?.[0]?.id ?? ''));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    const input = { habit_id: habitId, title, target_days: target ? Number(target) : null, notes: notes.trim() || null };
    startSaving(async () => {
      try {
        if (editing) await update(id, input);
        else await create(input);
        await navigate('/goals', { replace: true });
      } catch (caught) {
        setSaveError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const confirmRemove = () =>
    startRemoving(async () => {
      if (!id) return;
      try {
        await remove(id);
        await navigate('/goals', { replace: true });
      } catch (caught) {
        setSaveError(caught instanceof ApiError ? caught : new ApiError('Could not remove this goal.', 0));
        setDeleting(false);
      }
    });

  const error = saveError ?? loadError ?? null;
  const general = error !== null && !FIELDS.some((field) => error.field(field));
  const selected = habits?.find((habit) => habit.id === habitId);

  return (
    <form onSubmit={submit} className="space-y-4">
      <PageHeader title={editing ? 'Edit goal' : 'New goal'} back="/goals" />

      <Card>
        <TextField
          label="Goal"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={selected?.type === 'break' ? 'A smoke-free month' : 'Read every day for a month'}
          error={error?.field('title')}
          maxLength={120}
          required
        />
      </Card>

      <Card title="Linked habit" description="Progress is this habit's current streak.">
        {habits ? (
          <div role="radiogroup" aria-label="Linked habit" className="space-y-2">
            {habits.map((habit) => (
              <button
                key={habit.id}
                type="button"
                role="radio"
                aria-checked={habit.id === habitId}
                onClick={() => setChosen(habit.id)}
                className={cx(
                  'flex w-full cursor-pointer items-center gap-3 rounded-full p-2 pr-4 text-left ring-2 transition',
                  habit.id === habitId ? 'bg-brand-soft ring-ink' : 'bg-canvas ring-transparent hover:ring-line',
                )}
              >
                <HabitBubble icon={habit.icon} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{habit.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {habit.type === 'build' ? 'Build' : 'Break'} · {habit.stats.current_streak} {habit.type === 'build' ? 'day streak' : 'days clean'}
                  </span>
                </span>
                {habit.id === habitId ? <Icon name="check" className="size-5 text-ink" /> : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="h-24 animate-pulse rounded-2xl bg-canvas" />
        )}
        {error?.field('habit_id') ? <p className="mt-2 text-sm text-danger">{error.field('habit_id')}</p> : null}
      </Card>

      <Card title="Target" description="The streak, in days, that completes the goal. Leave it empty for an open goal.">
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={target === String(days)}
              onClick={() => setTarget(String(days))}
              className={cx(
                'min-h-10 cursor-pointer rounded-full px-4 text-sm font-bold transition',
                target === String(days) ? 'bg-night text-white' : 'bg-canvas text-ink hover:bg-line',
              )}
            >
              {days} days
            </button>
          ))}
        </div>
        <TextField
          label="Days"
          type="number"
          inputMode="numeric"
          min={1}
          max={3650}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          error={error?.field('target_days')}
        />
      </Card>

      <Card>
        <TextArea
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Why this matters to you"
          maxLength={500}
          error={error?.field('notes')}
        />
      </Card>

      {general ? <Alert>{error.message}</Alert> : null}

      <Button type="submit" busy={saving} disabled={!habitId || removing} className="w-full">
        {editing ? 'Save changes' : 'Save goal'}
      </Button>
      {editing ? (
        <Button type="button" variant="danger-soft" className="w-full" onClick={() => setDeleting(true)}>
          Remove goal
        </Button>
      ) : null}

      <ConfirmDialog
        open={deleting}
        title={`Remove ${title || 'this goal'}`}
        body="The goal is deleted. Its habit and check-ins stay."
        confirmLabel="Remove"
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setDeleting(false)}
      />
    </form>
  );
}
