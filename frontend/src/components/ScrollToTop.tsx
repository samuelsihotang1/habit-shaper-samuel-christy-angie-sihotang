import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

/**
 * Whether an arrival starts at the top. On the path, not the location: a query
 * string is page state. Not on POP: Back is a return, and the browser puts the
 * reader back where they were on its own.
 */
export function shouldResetScroll(from: string, to: string, navigationType: NavigationType): boolean {
  return to !== from && navigationType !== NavigationType.Pop;
}

/**
 * Renders nothing. A client-side navigation swaps the content under a window
 * that never moved, so without this a page opens at the last page's offset.
 * react-router's `<ScrollRestoration>` does this but reads `useMatches`, which
 * only a data router provides, and `main.tsx` mounts `<BrowserRouter>`.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(pathname);

  useEffect(() => {
    const arriving = shouldResetScroll(previous.current, pathname, navigationType);
    previous.current = pathname;
    if (arriving) window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
