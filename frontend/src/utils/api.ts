/** Parse fetch response; throws Error with server message when not ok. */
export async function parseApiResponse<T = unknown>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const msg =
      (typeof data === 'object' && data && 'error' in data && String((data as { error: unknown }).error)) ||
      (typeof data === 'object' && data && 'message' in data && String((data as { message: unknown }).message)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
