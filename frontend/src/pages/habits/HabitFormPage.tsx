import { useState, useTransition, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { HABIT_ICONS, HabitBubble, ICON_LABEL, isHabitIcon, type HabitIcon } from '@/components/icons';
import { Alert, Button, Card, cx, PageHeader, Segmented, TextField } from '@/components/ui';
import { useHabit, useHabitActions } from '@/hooks/useHabits';
import { ApiError } from '@/services/api';
import type { Habit, HabitType } from '@/types/habits';
import { today } from '@/utils/dates';

const TYPES: { value: HabitType; label: string }[] = [
  { value: 'build', label: 'Build' },
  { value: 'break', label: 'Break' },
];

const FIELDS = ['name', 'type', 'icon', 'started_on'];

const defaultIcon = (type: HabitType): HabitIcon => (type === 'break' ? 'smoke' : 'book');

interface Draft {
  name: string;
  type: HabitType;
  icon: HabitIcon;
  started_on: string;
}

const draftOf = (habit: Habit): Draft => ({
  name: habit.name,
  type: habit.type,
  icon: isHabitIcon(habit.icon) ? habit.icon : 'star',
  started_on: habit.started_on,
});

/** New habit and edit habit, drawn like the reference's "New Habit" screen. */
export function HabitFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  if (id !== undefined) return <EditHabit id={id} />;
  const type: HabitType = params.get('type') === 'break' ? 'break' : 'build';
  return <HabitForm key={type} initial={{ name: '', type, icon: defaultIcon(type), started_on: today() }} />;
}

/**
 * Until the habit arrives the form shows empty and disabled. The key swaps
 * it for a fresh form holding the habit's values, so the inputs start from
 * them rather than being copied in by an effect.
 */
function EditHabit({ id }: { id: string }) {
  const { data: habit, error } = useHabit(id);
  if (!habit) return <HabitForm key="loading" id={id} initial={{ name: '', type: 'build', icon: 'book', started_on: today() }} loading loadError={error} />;
  return <HabitForm key={habit.id} id={id} initial={draftOf(habit)} />;
}

function HabitForm({ id, initial, loading = false, loadError }: { id?: string; initial: Draft; loading?: boolean; loadError?: ApiError }) {
  const navigate = useNavigate();
  const { create, update } = useHabitActions();
  const editing = id !== undefined;

  const [name, setName] = useState(initial.name);
  const [type, setType] = useState(initial.type);
  const [icon, setIcon] = useState(initial.icon);
  const [startedOn, setStartedOn] = useState(initial.started_on);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [saving, startSaving] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    startSaving(async () => {
      try {
        const habit = editing ? await update(id, { name, icon, started_on: startedOn }) : await create({ name, type, icon, started_on: startedOn });
        await navigate(editing ? `/habits/${habit.id}` : '/', { replace: true });
      } catch (caught) {
        setSaveError(caught instanceof ApiError ? caught : new ApiError('Something went wrong.', 0));
      }
    });
  };

  const error = saveError ?? loadError ?? null;
  const general = error !== null && !FIELDS.some((field) => error.field(field));

  return (
    <form onSubmit={submit} className="space-y-4">
      <PageHeader title={editing ? 'Edit habit' : 'New habit'} />

      <section className="rounded-3xl bg-night p-5 text-white">
        <p className="text-title font-bold">{name.trim() || (type === 'build' ? 'A habit to build' : 'A habit to break')}</p>
        <p className="mt-2 text-sm text-white/70">
          {type === 'build'
            ? 'Check it off each day you do it. Consecutive days make your streak.'
            : 'Every day without it counts. Log a relapse and the clean streak starts again.'}
        </p>
        <label htmlFor="habit-name" className="sr-only">
          Name
        </label>
        <input
          id="habit-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={type === 'build' ? 'Read 10 pages' : 'Smoking'}
          maxLength={100}
          required
          disabled={loading}
          aria-invalid={error?.field('name') ? true : undefined}
          className="mt-4 w-full rounded-full bg-surface px-5 py-3 text-base text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {error?.field('name') ? <p className="mt-2 px-1 text-sm text-danger-soft">{error.field('name')}</p> : null}
      </section>

      {editing ? null : (
        <Card title="Type" description="The type is fixed once the habit exists.">
          <div className="rounded-full bg-canvas">
            <Segmented
              label="Habit type"
              value={type}
              onChange={(next) => {
                setType(next);
                setIcon(defaultIcon(next));
              }}
              options={TYPES}
            />
          </div>
        </Card>
      )}

      <Card title="Icon">
        <div role="radiogroup" aria-label="Icon" className="grid grid-cols-7 gap-2">
          {HABIT_ICONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={icon === option}
              aria-label={ICON_LABEL[option]}
              title={ICON_LABEL[option]}
              onClick={() => setIcon(option)}
              className={cx(
                // Square and no wider than 48px, so the ring is a circle however narrow the cell gets.
                'flex aspect-square w-full max-w-12 cursor-pointer items-center justify-center justify-self-center rounded-full p-0.5 ring-2 transition',
                icon === option ? 'ring-ink' : 'ring-transparent hover:ring-line',
              )}
            >
              <HabitBubble icon={option} size="fill" />
            </button>
          ))}
        </div>
        {error?.field('icon') ? <p className="mt-2 text-sm text-danger">{error.field('icon')}</p> : null}
      </Card>

      <Card>
        <TextField
          label={type === 'build' ? 'Start date' : 'Clean since'}
          type="date"
          value={startedOn}
          max={today()}
          onChange={(event) => setStartedOn(event.target.value)}
          error={error?.field('started_on')}
          hint={type === 'build' ? 'Days before this do not count as missed.' : 'The first day without it. Your clean streak counts from here.'}
          required
        />
      </Card>

      {general ? <Alert>{error.message}</Alert> : null}

      <Button type="submit" busy={saving} disabled={loading} className="w-full">
        {editing ? 'Save changes' : 'Save habit'}
      </Button>
    </form>
  );
}
