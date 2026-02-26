/**
 * Fetch with a maximum number of attempts (default 2).
 * Stops retrying after maxAttempts; does not retry infinitely on API errors.
 */
const DEFAULT_MAX_ATTEMPTS = 2;

export interface FetchWithRetryOptions {
  maxAttempts?: number;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchWithRetryOptions
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init);
      lastResponse = res;
      if (res.ok) return res;
      if (attempt === maxAttempts) return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === maxAttempts) throw lastError;
    }
  }

  return lastResponse!;
}
