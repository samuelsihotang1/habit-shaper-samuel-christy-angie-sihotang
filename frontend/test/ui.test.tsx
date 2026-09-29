import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link, MemoryRouter, NavigationType, Route, Routes, useNavigate } from 'react-router';
import { ScrollToTop, shouldResetScroll } from '@/components/ScrollToTop';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HabitBubble } from '@/components/icons';
import { AppShell, Logo } from '@/components/Shells';
import { ConfirmDialog, TextArea, TextField } from '@/components/ui';
import './support';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Every call passes a new arrow, as a parent re-rendering does. */
const render = (onCancel: () => void) =>
  act(() =>
    root.render(
      <MemoryRouter>
        <ConfirmDialog open title="Delete Read" body="Gone." confirmLabel="Delete" onConfirm={() => {}} onCancel={() => onCancel()} />
      </MemoryRouter>,
    ),
  );

const button = (label: string) => [...container.querySelectorAll('button')].find((element) => element.textContent === label)!;

describe('confirm dialog', () => {
  it('focuses Cancel when it opens, and leaves focus alone when its parent re-renders', () => {
    render(() => {});
    expect(document.activeElement).toBe(button('Cancel'));

    button('Delete').focus();
    render(() => {});

    expect(document.activeElement).toBe(button('Delete'));
  });

  it('Escape calls the onCancel of the latest render', () => {
    const first = vi.fn();
    const latest = vi.fn();
    render(first);
    render(latest);

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });
});

const radii = (element: Element) => [...element.classList].filter((name) => name.startsWith('rounded'));

describe('field shapes', () => {
  it('keeps the text input a pill and gives the textarea one smaller radius', () => {
    act(() =>
      root.render(
        <>
          <TextField label="Name" />
          <TextArea label="Notes" />
        </>,
      ),
    );
    expect(radii(container.querySelector('input')!)).toEqual(['rounded-full']);
    expect(radii(container.querySelector('textarea')!)).toEqual(['rounded-2xl']);
  });
});

describe('date field', () => {
  it('draws a calendar icon in place of the browser\'s picker arrow', () => {
    act(() => root.render(<TextField label="Start date" type="date" />));
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('input')!.classList).toContain('pr-14');

    act(() => root.render(<TextField label="Name" />));
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });
});

describe('page height', () => {
  it('is the visible viewport, so a short page does not scroll under a phone\'s address bar', () => {
    act(() =>
      root.render(
        <MemoryRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<p>page</p>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      ),
    );
    const column = container.firstElementChild!;
    expect(column.classList).toContain('min-h-dvh');
    expect(column.classList).not.toContain('min-h-screen');
  });
});

describe('scroll to top', () => {
  afterEach(() => vi.restoreAllMocks());

  it('resets on a new path, not on the same path or on Back', () => {
    expect(shouldResetScroll('/', '/habits/1', NavigationType.Push)).toBe(true);
    expect(shouldResetScroll('/', '/habits/1', NavigationType.Replace)).toBe(true);
    expect(shouldResetScroll('/habits/1', '/habits/1', NavigationType.Push)).toBe(false);
    expect(shouldResetScroll('/habits/1', '/', NavigationType.Pop)).toBe(false);
  });

  function Nav() {
    const navigate = useNavigate();
    return (
      <>
        <Link to="/b">next</Link>
        <button type="button" onClick={() => void navigate(-1)}>
          back
        </button>
      </>
    );
  }

  it('opens a new page at the top and leaves Back to the browser', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/a']}>
          <ScrollToTop />
          <Nav />
        </MemoryRouter>,
      ),
    );
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => container.querySelector('a')!.click());
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    scrollTo.mockClear();
    act(() => container.querySelector('button')!.click());
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('logo', () => {
  it('sets the wordmark in ink, never yellow on white', () => {
    act(() => root.render(<Logo />));
    expect(container.textContent).toBe('Habit Shaper');
    const classes = [...container.querySelectorAll('*')].flatMap((element) => [...element.classList]);
    expect(classes.filter((name) => name.startsWith('text-brand'))).toEqual([]);
  });
});

describe('habit bubble', () => {
  it('draws the glyph in ink on yellow and white on every other colour', () => {
    act(() => root.render(<HabitBubble icon="sun" />));
    expect(container.firstElementChild!.classList).toContain('text-ink');
    act(() => root.render(<HabitBubble icon="water" />));
    expect(container.firstElementChild!.classList).toContain('text-white');
    expect(container.firstElementChild!.classList).not.toContain('text-ink');
  });
});
