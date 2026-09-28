import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/components/ui';
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
