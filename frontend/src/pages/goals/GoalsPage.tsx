import { Link, useNavigate } from 'react-router';
import { HabitBubble, Icon } from '@/components/icons';
import { Alert, Button, EmptyState, IconButton, ProgressBar, ProgressRing } from '@/components/ui';
import { useGoals } from '@/hooks/useGoals';
import type { Goal } from '@/types/habits';

const LOADING = (
  <div className="grid grid-cols-2 gap-3">
    {[0, 1, 2, 3].map((key) => (
      <div key={key} className="h-40 animate-pulse rounded-3xl bg-surface" />
    ))}
  </div>
);

function progressText(goal: Goal): string {
  const unit = goal.habit.type === 'build' ? 'day streak' : 'days clean';
  return goal.target_days ? `${goal.progress.days} / ${goal.target_days} days` : `${goal.progress.days} ${unit}`;
}

/** Goals as the reference's Explore grid: one tile per goal, its habit's icon on top. */
export function GoalsPage() {
  const navigate = useNavigate();
  const { data: goals, error } = useGoals();

  let withTarget = 0;
  let reached = 0;
  for (const goal of goals ?? []) {
    if (!goal.target_days) continue;
    withTarget += 1;
    if (goal.progress.achieved) reached += 1;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-heading font-bold text-ink">Goals</h1>
          <p className="mt-1 text-sm text-ink-muted">Each goal rides on one habit's streak.</p>
        </div>
        <IconButton icon="plus" label="New goal" tone="brand" onClick={() => void navigate('/goals/new')} />
      </header>

      {goals && goals.length > 0 ? (
        <section className="flex items-center justify-between gap-4 rounded-3xl bg-night p-5 text-white">
          <div>
            <p className="text-lg font-bold">
              {reached} of {withTarget} reached
            </p>
            <p className="mt-1 text-sm text-white/70">
              {withTarget === 0 ? 'Give a goal a target to measure it.' : 'A goal is reached when its streak hits the target.'}
            </p>
          </div>
          <ProgressRing value={withTarget ? reached / withTarget : 0}>
            <Icon name="target" className="size-5 text-brand" />
          </ProgressRing>
        </section>
      ) : null}

      {!goals && error ? <Alert>{error.message}</Alert> : null}
      {goals || error ? null : LOADING}

      {goals?.length === 0 ? (
        <EmptyState
          icon="target"
          title="No goals yet"
          body="Link a goal to a habit, like a 30-day reading streak or a smoke-free month."
          action={<Button onClick={() => void navigate('/goals/new')}>Add a goal</Button>}
        />
      ) : null}

      {goals && goals.length > 0 ? (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-ink">Your goals</h2>
            <span className="text-sm text-ink-muted">{goals.length}</span>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link to={`/goals/${goal.id}/edit`} className="flex h-full flex-col rounded-3xl bg-surface p-4 transition hover:ring-2 hover:ring-line">
                  <div className="flex items-start justify-between">
                    <HabitBubble icon={goal.habit.icon} />
                    {goal.progress.achieved ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success">Reached</span>
                    ) : goal.progress.ratio !== null ? (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-success">
                        <Icon name="trend" className="size-3.5" />
                        {Math.round(goal.progress.ratio * 100)}%
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-bold text-ink">{goal.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {goal.habit.type === 'build' ? 'Build' : 'Break'} · {goal.habit.name}
                  </p>
                  <div className="mt-auto pt-3">
                    <p className="mb-1.5 text-xs font-semibold text-ink">{progressText(goal)}</p>
                    <ProgressBar value={goal.progress.ratio ?? 0} label={`${goal.title} progress`} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
