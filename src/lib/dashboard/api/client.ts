/**
 * Shared mock-API helpers.
 *
 * The dashboard service layer pretends to be a backend by wrapping mock data
 * in async functions. Routes call these services as if they were real
 * fetches, which means swapping in a real backend later (Supabase, REST,
 * GraphQL) only changes the bodies of the service files — not the route
 * code. Keep helpers tiny and intentional.
 */

/** Default simulated round-trip latency in ms. */
const DEFAULT_DELAY_MS = 180;

/** Awaitable sleep used to fake network latency in mock services. */
export function delay(ms: number = DEFAULT_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deep-clones JSON-safe data so callers can mutate the returned objects
 * without touching the underlying mock arrays. structuredClone is supported
 * everywhere we run (modern Node, modern browsers, Cloudflare Workers).
 */
export function cloneData<T>(data: T): T {
  return structuredClone(data) as T;
}

/** Custom error class so UIs can branch on `code` if needed. */
export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string = "internal_error") {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/** Convenience factory mirroring future backend error shape. */
export function createApiError(
  message: string,
  code: string = "internal_error",
): ApiError {
  return new ApiError(message, code);
}

/**
 * Wraps a mock operation: simulates latency, deep-clones the result, and
 * re-throws as an ApiError if the producer throws. Use for read paths.
 */
export async function simulateRead<T>(
  producer: () => T | Promise<T>,
  ms: number = DEFAULT_DELAY_MS,
): Promise<T> {
  await delay(ms);
  const value = await producer();
  return cloneData(value);
}

/**
 * Wraps a mock write: simulates latency and resolves with the (cloned)
 * payload. Mock writes do not persist between page reloads.
 */
export async function simulateSuccess<T>(
  payload: T,
  ms: number = DEFAULT_DELAY_MS,
): Promise<T> {
  await delay(ms);
  return cloneData(payload);
}
