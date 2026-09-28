import type { SVGProps } from 'react';

/*
 * Line icons on a 24px grid, 2px stroke, drawn inline so the app needs no icon
 * package (RULES.md §1.4). Each entry is the inside of one <svg>.
 */
const paths = {
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  sparkles: (
    <>
      <path d="M10 3.5 11.6 8a3 3 0 0 0 1.9 1.9L18 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L10 19.5 8.4 15a3 3 0 0 0-1.9-1.9L2 11.5l4.5-1.6A3 3 0 0 0 8.4 8Z" />
      <path d="M19 3v4M21 5h-4M19 17v3M20.5 18.5h-3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  trash: (
    <>
      <path d="M3.5 6.5h17M9.5 6.5V4.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M18.5 6.5 17.7 19a2 2 0 0 1-2 2H8.3a2 2 0 0 1-2-2L5.5 6.5M10 11v6M14 11v6" />
    </>
  ),
  pencil: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Zm9.5-13.5 4 4" />,
  flame: <path d="M12 21.5a7 7 0 0 0 7-7c0-4-3-6.5-4.5-9.5-.5 2.5-2 4-3.5 4.5.5-2-.5-4.5-2.5-6-.5 3.5-3.5 6.5-3.5 11a7 7 0 0 0 7 7Z" />,
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  shield: <path d="M12 21.5c-4.5-1.6-7.5-4.6-7.5-9.5V6L12 2.8 19.5 6v6c0 4.9-3 7.9-7.5 9.5Zm-3.2-9.7 2.3 2.3 4.3-4.3" />,
  list: <path d="M8.5 6h12M8.5 12h12M8.5 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  logout: <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  trend: <path d="M3 17.5 9.5 11l4 4L21 7.5M15 7.5h6v6" />,
  // Habit icons: keep in step with HABIT_ICONS below and the backend's list.
  water: <path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-4-4-7.5-6.5-12.5C9.5 7.5 5.5 11 5.5 15a6.5 6.5 0 0 0 6.5 6.5Z" />,
  book: <path d="M3 4.5h5.5A3.5 3.5 0 0 1 12 8v13a2.5 2.5 0 0 0-2.5-2.5H3ZM21 4.5h-5.5A3.5 3.5 0 0 0 12 8v13a2.5 2.5 0 0 1 2.5-2.5H21Z" />,
  run: (
    <>
      <circle cx="15.5" cy="3.5" r="2" />
      <path d="M14 7l-2.5 6.5M11.5 13.5l4 2.5-1 5M11.5 13.5l-2 4.5-4.5.5M14 7l-4 1.5-2 3M14 7l2.5 3.5 3 .5" />
    </>
  ),
  meditate: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 9v5M5 12.5c2 0 3.5-1 4.5-3h5c1 2 2.5 3 4.5 3M4 19.5c2.5-1.5 5-2 8-2s5.5.5 8 2M8.5 16.5 12 14l3.5 2.5" />
    </>
  ),
  journal: <path d="M12 20h8.5M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  sleep: <path d="M20.5 14A8.5 8.5 0 1 1 10 3.5a6.5 6.5 0 0 0 10.5 10.5Z" />,
  heart: <path d="M12 20.5s-8.5-4.8-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6.2-8.5 11-8.5 11Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  food: (
    <>
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" />
      <path d="M12 11.5c0-3 1.5-5.5 4.5-6.5M8 11.5c0-2 .5-4 2-5.5" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  smoke: <path d="M2.5 15.5h14v4h-14ZM19 15.5v4M21.5 15.5v4M19 12.5c0-2-2-2-2-4s2-2 2-4M21.5 12.5c0-2-2-2-2-4s2-2 2-4" />,
  coffee: <path d="M4 8.5h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 10h1.5a2.5 2.5 0 0 1 0 5H17M7.5 2.5v3M11 2.5v3M14.5 2.5v3" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />,
  leaf: <path d="M5 20.5c0-8 4.5-14 15.5-15.5C19 16 13 19.5 5 20.5Zm0 0 8-8" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'size-6', ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

/** Must equal HABIT_ICONS in backend/src/modules/habits/schemas.ts; the API refuses any other. */
export const HABIT_ICONS = [
  'water', 'book', 'run', 'meditate', 'journal', 'sleep', 'heart', 'sun',
  'food', 'phone', 'smoke', 'coffee', 'star', 'leaf',
] as const satisfies readonly IconName[];

export type HabitIcon = (typeof HABIT_ICONS)[number];

/** Each habit icon sits on its own colour, as the list rows in the reference do. */
export const ICON_TONE: Record<HabitIcon, string> = {
  water: 'bg-accent-blue',
  book: 'bg-accent-orange',
  run: 'bg-accent-teal',
  meditate: 'bg-brand',
  journal: 'bg-accent-purple',
  sleep: 'bg-accent-blue',
  heart: 'bg-accent-pink',
  sun: 'bg-brand',
  food: 'bg-accent-red',
  phone: 'bg-accent-purple',
  smoke: 'bg-accent-red',
  coffee: 'bg-accent-orange',
  star: 'bg-accent-green',
  leaf: 'bg-accent-green',
};

export const ICON_LABEL: Record<HabitIcon, string> = {
  water: 'Water',
  book: 'Reading',
  run: 'Running',
  meditate: 'Meditation',
  journal: 'Journal',
  sleep: 'Sleep',
  heart: 'Health',
  sun: 'Morning',
  food: 'Food',
  phone: 'Screen time',
  smoke: 'Smoking',
  coffee: 'Caffeine',
  star: 'Other',
  leaf: 'Nature',
};

const HABIT_ICON_SET: ReadonlySet<string> = new Set(HABIT_ICONS);

export const isHabitIcon = (value: string): value is HabitIcon => HABIT_ICON_SET.has(value);

const BUBBLE_BOX = { sm: 'size-8', md: 'size-11', lg: 'size-14', fill: 'w-full' } as const;
const BUBBLE_GLYPH = { sm: 'size-4', md: 'size-5', lg: 'size-7', fill: 'size-1/2 max-w-6' } as const;

/** A habit's icon on its coloured circle. `fill` is as wide as its parent, e.g. a grid cell. */
export function HabitBubble({ icon, size = 'md' }: { icon: string; size?: 'sm' | 'md' | 'lg' | 'fill' }) {
  const name: HabitIcon = isHabitIcon(icon) ? icon : 'star';
  return (
    <span className={`inline-flex aspect-square shrink-0 items-center justify-center rounded-full text-white ${BUBBLE_BOX[size]} ${ICON_TONE[name]}`}>
      <Icon name={name} className={BUBBLE_GLYPH[size]} />
    </span>
  );
}
