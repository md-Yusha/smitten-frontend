import type { ApiUser } from './api';
import { authApi, ApiError } from './api';
import { clearAuthMediaHeadersCache, preloadAuthMediaHeaders } from './authMediaHeaders';
import { saveTokens } from './tokenStorage';

export type SessionFetchResult =
  | { status: 'ok'; user: ApiUser }
  | { status: 'unauthorized' }
  | { status: 'unavailable' };

export function canAccessApp(user: ApiUser): boolean {
  const ownActive = user.hasActiveSubscription && isFuture(user.subscriptionExpiresAt);
  const coupleActive = user.coupleHasActiveSubscription && isFuture(user.coupleSubscriptionExpiresAt);
  if (user.coupleId && !user.isCoupleOwner) return coupleActive;
  if (user.isCoupleOwner && ownActive && user.coupleId) return true;
  return false;
}

export function needsStory(user: ApiUser): boolean {
  return !user.profileSetupComplete && Boolean(user.coupleId || user.isCoupleOwner);
}

export function needsPayment(user: ApiUser): boolean {
  return !canAccessApp(user) && Boolean(user.coupleId || user.isCoupleOwner);
}

export function needsKeyDisplay(user: ApiUser): boolean {
  return user.isCoupleOwner && user.hasActiveSubscription && isFuture(user.subscriptionExpiresAt) && Boolean(user.inviteCode) && user.coupleStatus === 'pending_partner';
}

function isFuture(value: string | null | undefined): boolean {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}

export async function persistAuthSession(data: { accessToken: string; refreshToken: string; user: ApiUser }) {
  clearAuthMediaHeadersCache();
  await saveTokens(data.accessToken, data.refreshToken);
  preloadAuthMediaHeaders();
}

export async function fetchSessionUser(): Promise<SessionFetchResult> {
  try {
    const { user } = await authApi.me();
    return { status: 'ok', user };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return { status: 'unauthorized' };
    }
    return { status: 'unavailable' };
  }
}
