import Constants from 'expo-constants';

const DEFAULT_API_URL = 'https://smitten.zelton.in';

const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')?.replace(/^"|"$/g, '').trim() || undefined;
const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;

/** Remote phones must always use the public HTTPS API, never the SSH host's localhost. */
export const API_BASE_URL = fromEnv ?? fromExtra ?? DEFAULT_API_URL;

export const API_V1 = `${API_BASE_URL}/api/v1`;

const NGROK_HOST = /ngrok(-free)?\.(app|dev)/i;

/** Free ngrok serves an HTML interstitial unless this header is sent. */
export function apiFetchHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (NGROK_HOST.test(API_BASE_URL)) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return headers;
}
