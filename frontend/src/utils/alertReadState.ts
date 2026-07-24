const READ_KEY = 'agency_os_alert_read_ids';
const NOTIFIED_KEY = 'agency_os_alert_notified_ids';

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]));
}

export function alertKeyInvoice(id: string) {
  return `inv-${id}`;
}

export function alertKeyWorker(id: string) {
  return `w-${id}`;
}

export function getReadAlertIds(): Set<string> {
  return readSet(READ_KEY);
}

export function markAlertsRead(ids: string[]) {
  const next = getReadAlertIds();
  ids.forEach((id) => next.add(id));
  writeSet(READ_KEY, next);
}

export function markAllAlertsRead(ids: string[]) {
  writeSet(READ_KEY, new Set(ids));
}

export function countUnreadAlerts(currentIds: string[]): number {
  const read = getReadAlertIds();
  return currentIds.filter((id) => !read.has(id)).length;
}

export function getUnreadAlertIds(currentIds: string[]): string[] {
  const read = getReadAlertIds();
  return currentIds.filter((id) => !read.has(id));
}

export function getNotifiedAlertIds(): Set<string> {
  return readSet(NOTIFIED_KEY);
}

export function markAlertsNotified(ids: string[]) {
  const next = getNotifiedAlertIds();
  ids.forEach((id) => next.add(id));
  writeSet(NOTIFIED_KEY, next);
}

/** Drop stale ids so storage does not grow forever */
export function pruneAlertIdStores(currentIds: string[]) {
  const live = new Set(currentIds);
  const prune = (key: string) => {
    const set = readSet(key);
    const next = new Set([...set].filter((id) => live.has(id)));
    writeSet(key, next);
  };
  prune(READ_KEY);
  prune(NOTIFIED_KEY);
}
