import type { ReactNode } from 'react';
import { SWRConfig, type Cache } from 'swr';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A cache of the test's own. SWR's default one lives for the whole file, so
 * an answer cached by one test would render in the next without a request.
 * Pass `cache` (a `new Map()`) to look inside it.
 */
export function FreshCache({ cache, children }: { cache?: Cache; children: ReactNode }) {
  return <SWRConfig value={{ provider: () => cache ?? new Map() }}>{children}</SWRConfig>;
}

export const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, data }));
