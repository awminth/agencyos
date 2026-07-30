/** Parse fetch response; throws Error with server message when not ok. */

import { authHeaders } from './permissions';

export class ApiError extends Error {
  status: number;
  warnings?: string[];

  constructor(message: string, status: number, warnings?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.warnings = warnings;
  }
}

export async function parseApiResponse<T = unknown>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const msg =
      (typeof data === 'object' && data && 'error' in data && String((data as { error: unknown }).error)) ||
      (typeof data === 'object' && data && 'message' in data && String((data as { message: unknown }).message)) ||
      `Request failed (${res.status})`;
    const warnings =
      typeof data === 'object' &&
      data &&
      Array.isArray((data as { warnings?: unknown }).warnings)
        ? ((data as { warnings: unknown[] }).warnings.map((w) => String(w)))
        : undefined;
    throw new ApiError(msg, res.status, warnings);
  }
  return data as T;
}

export type HelpChatTurn = { role: 'user' | 'model'; text: string };

export type HelpChatQuota = {
  limit: number;
  used: number;
  remaining: number;
};

export async function getHelpChatQuota(userId: string): Promise<HelpChatQuota> {
  const res = await fetch('/api/help-chat/quota', {
    headers: authHeaders(userId),
  });
  return parseApiResponse<HelpChatQuota>(res);
}

export async function postHelpChat(
  userId: string,
  message: string,
  history: HelpChatTurn[] = []
): Promise<{ reply: string } & HelpChatQuota> {
  const res = await fetch('/api/help-chat', {
    method: 'POST',
    headers: authHeaders(userId),
    body: JSON.stringify({ message, history }),
  });
  return parseApiResponse<{ reply: string } & HelpChatQuota>(res);
}
