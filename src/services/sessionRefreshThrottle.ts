const MIN_INTERVAL_MS = 90_000;

let lastRefreshAt = 0;

export function claimSessionRefresh(now = Date.now()): boolean {
  if (now - lastRefreshAt < MIN_INTERVAL_MS) return false;
  lastRefreshAt = now;
  return true;
}

export function resetSessionRefreshThrottle(): void {
  lastRefreshAt = 0;
}
