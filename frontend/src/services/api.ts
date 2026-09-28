import { getAuthToken } from '@/utils/cookies';

/*
 * The only place `fetch` is called. It attaches the Bearer token, unwraps the
 * `{ success, data, message }` envelope, and announces a 401 as the
 * `auth:unauthorized` window event, which useAuth answers by signing out.
 */

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly errors: Record<string, string[]> = {},
    readonly params: Record<string, unknown> = {},
  ) {
    super(message);
  }

  /** The first message for one field, for rendering under that input. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

async function request<T>(method: string, endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`/api${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, 'http.network');
  }

  // Text first: an empty body or an HTML error page from a proxy must surface as an API error.
  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));

  if (!response.ok || !json || json.success !== true) {
    throw new ApiError(
      typeof json?.message === 'string' ? json.message : 'Something went wrong. Please try again.',
      response.status,
      typeof json?.code === 'string' ? json.code : undefined,
      (json?.errors as Record<string, string[]>) ?? {},
      (json?.params as Record<string, unknown>) ?? {},
    );
  }

  return json as unknown as ApiResponse<T>;
}

// StrictMode mounts twice in development; sharing an in-flight GET keeps that to one request.
const inFlight = new Map<string, Promise<ApiResponse<unknown>>>();

export const api = {
  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const pending = inFlight.get(endpoint);
    if (pending) return pending as Promise<ApiResponse<T>>;
    const promise = request<T>('GET', endpoint).finally(() => inFlight.delete(endpoint));
    inFlight.set(endpoint, promise);
    return promise;
  },
  post: <T>(endpoint: string, body?: unknown) => request<T>('POST', endpoint, body ?? {}),
  put: <T>(endpoint: string, body?: unknown) => request<T>('PUT', endpoint, body ?? {}),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
};
