# Design

The brief asks for a lightweight, simple, clean interface. The look follows the
brand guideline of the Behance case study "Habit tracker mobile app - UIUX
design" (Haptive): its palette, type, spacing and screens. This file is the
whole design system.

---

## Principles

1. **A phone, on every screen.** One column, at most 480px wide, centred. The
   four top-level screens sit over a black tab bar; every other screen has a
   back arrow instead.
2. **Colour separates, lines do not.** White cards on a light grey canvas, a
   black hero card for the one number that matters, brand yellow for the
   action and the active state.
3. **One primary action per screen**, a full-width yellow pill.
4. **State is always visible.** A button shows a spinner while its request
   runs; an error sits under the field it belongs to; a destructive step asks
   first, in the red-bin dialog.

## Colour

Tailwind v4 theme tokens in `frontend/src/index.css`. Use the token names
(`bg-brand`, `text-ink-muted`), never a raw palette name.

| Token | Value | Use |
|---|---|---|
| `brand` | `#FEBA33` | primary buttons, the active tab, done days, chart columns |
| `brand-strong` | `#F2A516` | hover on brand |
| `brand-soft` | `#FDF5E4` | the cream behind an unchecked check-in, progress tracks |
| `canvas` | `#F5F6F7` | page background, list rows inside a card |
| `surface` | `#FFFFFF` | cards, inputs |
| `night` / `night-soft` | `#0D0D0D` / `#262626` | hero cards, the tab bar, the chosen day |
| `ink` / `ink-muted` | `#0D0D0D` / `#6B6B70` | text |
| `line` | `#EAEBED` | the rare divider, chart grid |
| `danger` / `danger-soft` | `#F04438` / `#FEE4E2` | relapses, delete |
| `success` / `success-soft` | | confirmations, "Reached" |
| `accent-*` | orange, green, purple, red, teal, pink, blue | habit icon circles only, never text |

**Yellow is never text on white**: it measures 1.7:1. A link on white is ink
with a yellow underline; yellow text appears only on `night`.

## Type and spacing

- **Urbanist** (Google Fonts, `frontend/index.html`), 400–800.
- Scale from the guideline: heading 32px (`text-heading`), title 24px
  (`text-title`), body 16px (`text-base`); secondary text `text-sm`.
- Spacing is the 4px grid (Tailwind's own steps, 4–32px).
- Shapes: buttons, single-line inputs, tabs and list rows are full pills
  (`rounded-full`); the multi-line `TextArea` is `rounded-2xl`, since a pill
  that tall turns into a capsule;
  cards `rounded-3xl`; day tiles `rounded-2xl`/`rounded-xl`.

## Screens

| Reference screen | Here |
|---|---|
| Welcome | `AuthShell`: logo, black hero, white sheet with the form |
| Today (date row, Evening/All Day, habit cards with +1) | `pages/today/`: hero with the day's progress ring, `WeekStrip`, Build/Break tabs, `HabitCard` with Mark done / Log relapse |
| New Habit, Essential | `pages/habits/HabitFormPage.tsx`: black card with the name input, type tabs, icon grid, start date |
| Manage Habits + delete dialog | `pages/habits/HabitsPage.tsx`, `ConfirmDialog` |
| — | `pages/habits/HabitDetailPage.tsx`: streak hero, weekly completion, a month calendar to back-date |
| Explore (card grid) | `pages/goals/`: the goals grid and form |
| Statistics | `pages/stats/`: Week / Month / Year tabs, the period's rate, completion rate, missed days and relapses per bucket, streaks |
| Setting, Account | `pages/settings/`: profile, two-factor call-out, rows, sign out |

Premium, social sign-in and reminders in the reference are out of scope (`PRD.md`).

## Components

`frontend/src/components/ui.tsx` unless noted.

| Component | Notes |
|---|---|
| `Button` | pill; `primary` (yellow), `dark`, `secondary`, `danger`, `danger-soft`, `ghost`; `busy` shows a spinner |
| `ActionButton` | a `Button` whose click runs its `action` as its own transition, spinning until it settles |
| `IconButton` | round, icon only, with an accessible `label` |
| `TextField`, `TextArea`, `CodeField` | label above, error or hint below; password gets Show/Hide |
| `Segmented` | two or three pill tabs, the active one yellow |
| `Card`, `Alert`, `EmptyState` | |
| `PageHeader` | back arrow, centred title, one action |
| `ConfirmDialog` | the reference's delete dialog; Escape and the backdrop cancel |
| `ProgressBar`, `ProgressRing` | yellow on cream / on the dark hero |
| `Icon`, `HabitBubble` (`icons.tsx`) | 24px line icons; a habit icon on its accent circle |
| `TabShell`, `AppShell`, `AuthShell` (`Shells.tsx`) | the column, with or without the tab bar |

## Charts

Columns (`pages/stats/ColumnChart.tsx`): one series each, so no legend;
columns at most 24px wide with a 4px rounded top and a 2px gap, the newest one
labelled and in full yellow. Yellow on white is below the 3:1 a mark needs, so
every column has a keyboard-reachable tooltip and the page repeats the numbers
in a table. Thirty daily columns label every seventh day.

## Copy

Second person, sentence case, short. Say what happened and what to do next.
No exclamation marks.
