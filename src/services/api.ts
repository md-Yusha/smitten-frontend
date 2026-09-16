import { API_V1, apiFetchHeaders } from './apiConfig';
import { clearAuthMediaHeadersCache, preloadAuthMediaHeaders } from './authMediaHeaders';
import { getNetworkErrorMessage } from './formatApiError';
import { prepareImageForUpload } from './mediaCompression';
import { refreshAccessToken } from './tokenRefresh';
import { getAccessToken } from './tokenStorage';

export type ApiGender = 'male' | 'female' | 'other';

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  lastName: string | null;
  phoneNumber: string | null;
  city: string | null;
  dateOfBirth: string | null;
  partnerKnownSince: string | null;
  partnerPetName: string | null;
  nicknameSelf: string | null;
  gender: ApiGender;
  genderIdentity: string | null;
  profileSetupComplete: boolean;
  coupleCreatedAt: string | null;
  memberSince: string;
  isCoupleOwner: boolean;
  coupleId: string | null;
  inviteCode: string | null;
  coupleStatus: 'pending_partner' | 'active' | null;
  hasActiveSubscription: boolean;
  coupleHasActiveSubscription: boolean;
  subscriptionPlan: 'monthly' | 'quarterly' | 'yearly' | null;
  subscriptionExpiresAt: string | null;
  coupleSubscriptionPlan: 'monthly' | 'quarterly' | 'yearly' | null;
  coupleSubscriptionExpiresAt: string | null;
  partner: {
    id: string;
    name: string;
    dateOfBirth: string | null;
    partnerKnownSince: string | null;
    nicknameSelf: string | null;
    gender: ApiGender;
    avatarUrl: string | null;
    mood: string | null;
  } | null;
  avatarUrl: string | null;
  chatDisappearingAfterMs: number | null;
  chatThemeId: string;
  vaultDisappearingAfterMs: number | null;
  partnerOnline: boolean;
  mood: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
};

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export { formatApiError, getNetworkErrorMessage } from './formatApiError';

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Invalid server response', res.status);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...init } = options;
  const headers = apiFetchHeaders(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_V1}${path}`, { ...init, headers });
  } catch (e) {
    throw new ApiError(getNetworkErrorMessage(e), 0);
  }

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_V1}${path}`, { ...init, headers });
    }
    if (res.status === 401) {
      try {
        const { useAuthStore } = require('../store/useAuthStore');
        useAuthStore.getState().clearSession();
      } catch {
        /* ignore */
      }
    }
  }

  const data = await parseJson<T & { error?: string }>(res);
  if (!res.ok) {
    const msg = typeof data === 'object' && data && 'error' in data ? String(data.error) : res.statusText;
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      if (path.startsWith('/payments/') && msg) {
        throw new ApiError(msg, res.status, data);
      }
      throw new ApiError('Server is unavailable. Is the backend running?', res.status, data);
    }
    throw new ApiError(msg || 'Request failed', res.status, data);
  }
  return data;
}

export async function uploadAvatar(imageUri: string): Promise<{ user: ApiUser }> {
  const token = await getAccessToken();
  const prepared = await prepareImageForUpload(imageUri, 'avatar');
  const formData = new FormData();
  formData.append('avatar', {
    uri: prepared.uri,
    name: prepared.name,
    type: prepared.type,
  } as unknown as Blob);

  const headers = apiFetchHeaders();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_V1}/auth/avatar`, { method: 'POST', headers, body: formData });
  } catch (e) {
    throw new ApiError(getNetworkErrorMessage(e), 0);
  }

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_V1}/auth/avatar`, { method: 'POST', headers, body: formData });
    }
  }

  const data = await parseJson<{ user: ApiUser; error?: string }>(res);
  if (!res.ok) {
    throw new ApiError(data.error ?? 'Upload failed', res.status, data);
  }
  return data as { user: ApiUser };
}

export const authApi = {
  updateProfile(body: {
    name?: string;
    lastName?: string | null;
    email?: string;
    phoneNumber?: string | null;
    city?: string | null;
    partnerPetName?: string | null;
    nicknameSelf?: string;
    chatDisappearingAfterMs?: number | null;
    chatThemeId?: string;
    mood?: string | null;
  }) {
    return apiRequest<{ user: ApiUser }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  changePassword(body: { currentPassword: string; newPassword: string }) {
    return apiRequest<{ ok: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  register(body: {
    email: string;
    emailVerificationKey: string;
    password: string;
    name: string;
    phoneNumber?: string;
    dateOfBirth?: string;
  }) {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    });
  },
  completeStory(body: {
    city: string;
    dateOfBirth: string;
    partnerKnownSince: string;
    gender: ApiGender;
    genderIdentity?: string;
  }) {
    return apiRequest<{ user: ApiUser }>('/auth/story', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  login(body: { email: string; password: string }) {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    });
  },
  forgotPassword(body: { email: string }) {
    return apiRequest<{ ok: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    });
  },
  resetPassword(body: { email: string; code: string; password: string }) {
    return apiRequest<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    });
  },
  requestAppLockRecovery() {
    return apiRequest<{ ok: boolean; maskedEmail: string }>('/auth/app-lock-recovery/request', {
      method: 'POST',
    });
  },
  verifyAppLockRecovery(body: { code: string }) {
    return apiRequest<{ ok: boolean }>('/auth/app-lock-recovery/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  requestEmailVerification(body: { email: string }) {
    return apiRequest<{ ok: boolean }>('/auth/email-verification/request', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    });
  },
  verifyEmailVerification(body: { email: string; code: string }) {
    return apiRequest<{ ok: boolean; verificationKey: string }>('/auth/email-verification/verify', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    });
  },
  me() {
    return apiRequest<{ user: ApiUser }>('/auth/me');
  },
  logout() {
    return apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  },
  deleteAccount() {
    return apiRequest<{ ok: boolean }>('/auth/delete-account', { method: 'DELETE' });
  },
};

export const coupleApi = {
  validateKey(inviteCode: string) {
    return apiRequest<{ valid: boolean; ownerName?: string; partnerKnownSince?: string | null }>('/couple/validate-key', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
      auth: false,
    });
  },
  join(body: { inviteCode: string; name?: string; partnerPetName?: string }) {
    return apiRequest<{ user: ApiUser }>('/couple/join', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  getKey() {
    return apiRequest<{ inviteCode: string; passkeyRedirectUrl: string }>('/couple/key');
  },
  resetForNewPartner() {
    return apiRequest<{ user: ApiUser }>('/couple/reset-for-new-partner', { method: 'POST' });
  },
};
