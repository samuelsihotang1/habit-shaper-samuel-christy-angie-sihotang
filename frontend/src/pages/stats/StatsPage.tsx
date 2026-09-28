import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { HabitBubble } from '@/components/icons';
import { Alert, Button, Card, EmptyState, Segmented, cx } from '@/components/ui';
import { useHabits } from '@/hooks/useHabits';
import { useStats } from '@/hooks/useStats';
import type { Stats, StatsPeriod } from '@/types/habits';
import { formatDay, today as todayDate } from '@/utils/dates';
import { ColumnChart, type Column } from '@/pages/stats/ColumnChart';

const percent = (value: number) => `${Math.round(value * 100)}%`;

const count = (value: number) => String(Math.round(value));

const PERIODS: { value: StatsPeriod; label: string; range: string }[] = [
  { value: 'week', label: 'Week', range: 'Last 7 days' },
  { value: 'month', label: 'Month', range: 'Last 30 days' },
  { value: 'year', label: 'Year', range: 'Last 12 months' },
];

const LOADING = <div className="h-72 animate-pulse rounded-3xl bg-surface" />;

type Bucket = Stats['buckets'][number];

/** How a bucket is named: a day for week and month, a month for year. */
function name(period: StatsPeriod, bucket: Bucket): string {
  if (period === 'year') return formatDay(bucket.start, { month: 'long', year: 'numeric' });
  return formatDay(bucket.start, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The axis label: every day of a week, every seventh day of a month counted back from today, every month of a year. */
function axis(period: StatsPeriod, bucket: Bucket, index: number, count: number): string {
  if (period === 'week') return formatDay(bucket.start, { weekday: 'short' });
  if (period === 'year') return formatDay(bucket.start, { month: 'short' });
  return (count - 1 - index) % 7 === 0 ? formatDay(bucket.start, { month: 'short', day: 'numeric' }) : '';
}

/**
 * The API counts today only once it is done, so today's own column would read
 * 100% after the first check-in. It shows today's progress instead: done out
 * of every build habit, as the Today screen does.
 */
function rateOf(stats: Stats, bucket: Bucket, today: string): number | null {
  if (stats.period !== 'year' && bucket.start === today) return stats.build_habits ? bucket.done / stats.build_habits : null;
  return bucket.rate;
}

/** An even axis top, so the middle tick is a whole number. */
const evenTop = (value: number) => Math.max(4, Math.ceil(value / 2) * 2);

export function StatsPage() {
  const navigate = useNavigate();
  const today = todayDate();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { data: habits, error: habitsError } = useHabits();
  const { data: stats, error: statsError } = useStats(period);

  const error = (habits ? null : habitsError) ?? (stats ? null : statsError);
  // Until the new period answers, the old numbers stay on screen, dimmed.
  const stale = stats !== undefined && stats.period !== period;
  const range = PERIODS.find((option) => option.value === period)!.range;
  const buckets = stats?.buckets ?? [];
  const columns = (value: (bucket: Bucket) => number, detail: (bucket: Bucket) => string): Column[] =>
    buckets.map((bucket, index) => ({
      key: bucket.start,
      label: axis(stats!.period, bucket, index, buckets.length),
      value: value(bucket),
      detail: `${name(stats!.period, bucket)}: ${detail(bucket)}`,
    }));
  let mostMissed = 0;
  let mostRelapses = 0;
  for (const bucket of buckets) {
    mostMissed = Math.max(mostMissed, bucket.missed);
    mostRelapses = Math.max(mostRelapses, bucket.relapses);
  }
  const missedTop = evenTop(mostMissed);
  const relapseTop = evenTop(mostRelapses);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-heading font-bold text-ink">Statistics</h1>
        <p className="mt-1 text-sm text-ink-muted">Streaks, completion rates and missed days.</p>
      </header>

      {error ? <Alert>{error.message}</Alert> : null}
      {(habits && stats) || error ? null : LOADING}

      {habits?.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="Nothing to count yet"
          body="Statistics appear once you track a habit."
          action={<Button onClick={() => void navigate('/habits/new')}>Create a habit</Button>}
        />
      ) : null}

      {habits && stats && habits.length > 0 ? (
        <>
          <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />

          <div className={cx('space-y-5 transition-opacity', stale && 'opacity-50')} aria-busy={stale}>
            <Card>
              <p className="text-sm font-semibold text-ink-muted">
                {range} · {formatDay(buckets[0]!.start, { month: 'short', day: 'numeric' })} –{' '}
                {formatDay(stats.period === 'year' ? buckets.at(-1)!.end : buckets.at(-1)!.start, { month: 'short', day: 'numeric' })}
              </p>
              {stats.build_habits > 0 ? (
                <>
                  <p className="mt-1 text-heading font-bold text-ink">{stats.total.rate === null ? '–' : percent(stats.total.rate)}</p>
                  <p className="text-sm text-ink-muted">
                    {stats.total.rate === null ? 'Nothing counted yet' : 'of the days that counted, done'}
                  </p>
                  <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="bg-brand" style={{ flexGrow: stats.total.done }} />
                    <span className="bg-night-soft" style={{ flexGrow: stats.total.missed }} />
                  </div>
                </>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
                {stats.build_habits > 0 ? (
                  <>
                    <li className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-brand" /> {stats.total.done} done
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-night-soft" /> {stats.total.missed} missed
                    </li>
                  </>
                ) : null}
                {stats.break_habits > 0 ? (
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-danger" /> {stats.total.relapses} {stats.total.relapses === 1 ? 'relapse' : 'relapses'}
                  </li>
                ) : null}
              </ul>
            </Card>

            {stats.build_habits > 0 ? (
              <>
                <Card title="Average completion rate" description="Build habits, days done out of days that counted.">
                  <ColumnChart
                    label={`Completion rate, ${range.toLowerCase()}`}
                    columns={columns(
                      (bucket) => rateOf(stats, bucket, today) ?? 0,
                      (bucket) => {
                        if (bucket.start === today && stats.period !== 'year') return `${bucket.done} of ${stats.build_habits} done so far`;
                        const rate = rateOf(stats, bucket, today);
                        return rate === null ? 'nothing counted' : percent(rate);
                      },
                    )}
                    max={1}
                    ticks={[0, 0.5, 1]}
                    format={percent}
                  />
                </Card>

                <Card title="Missed days" description="Days a build habit was not done.">
                  <ColumnChart
                    label={`Missed days, ${range.toLowerCase()}`}
                    columns={columns((bucket) => bucket.missed, (bucket) => `${bucket.missed} missed`)}
                    max={missedTop}
                    ticks={[0, missedTop / 2, missedTop]}
                    format={count}
                  />
                </Card>
              </>
            ) : null}

            {stats.break_habits > 0 ? (
              <Card title="Relapses" description="Days a habit you are breaking came back.">
                <ColumnChart
                  label={`Relapses, ${range.toLowerCase()}`}
                  columns={columns((bucket) => bucket.relapses, (bucket) => `${bucket.relapses} ${bucket.relapses === 1 ? 'relapse' : 'relapses'}`)}
                  max={relapseTop}
                  ticks={[0, relapseTop / 2, relapseTop]}
                  format={count}
                />
              </Card>
            ) : null}

            <Card>
              <details>
                <summary className="cursor-pointer font-semibold text-ink">The numbers, as a table</summary>
                <table className="mt-4 w-full text-left text-sm">
                  <caption className="sr-only">{range}</caption>
                  <thead className="text-xs text-ink-muted">
                    <tr>
                      <th className="pb-2 font-semibold">{stats.period === 'year' ? 'Month' : 'Day'}</th>
                      {stats.build_habits > 0 ? (
                        <>
                          <th className="pb-2 text-right font-semibold">Done</th>
                          <th className="pb-2 text-right font-semibold">Missed</th>
                          <th className="pb-2 text-right font-semibold">Rate</th>
                        </>
                      ) : null}
                      {stats.break_habits > 0 ? <th className="pb-2 text-right font-semibold">Relapses</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.toReversed().map((bucket) => {
                      const rate = rateOf(stats, bucket, today);
                      return (
                        <tr key={bucket.start} className="border-t border-line">
                          <td className="py-2 font-semibold text-ink">{name(stats.period, bucket)}</td>
                          {stats.build_habits > 0 ? (
                            <>
                              <td className="py-2 text-right tabular-nums">{bucket.done}</td>
                              <td className="py-2 text-right tabular-nums">{bucket.missed}</td>
                              <td className="py-2 text-right tabular-nums">{rate === null ? '–' : percent(rate)}</td>
                            </>
                          ) : null}
                          {stats.break_habits > 0 ? <td className="py-2 text-right tabular-nums">{bucket.relapses}</td> : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            </Card>
          </div>

          <Card title="Streaks" description="Current and best, for every habit.">
            <ul className="space-y-2">
              {habits.map((habit) => (
                <li key={habit.id}>
                  <Link to={`/habits/${habit.id}`} className="flex items-center gap-3 rounded-full bg-canvas p-2 pr-4 hover:bg-line/60">
                    <HabitBubble icon={habit.icon} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{habit.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {habit.type === 'build' ? 'Day streak' : 'Days clean'} · best {habit.stats.longest_streak}
                      </span>
                    </span>
                    <span className="text-lg font-bold tabular-nums text-ink">{habit.stats.current_streak}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}
