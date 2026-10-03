import Constants from 'expo-constants';
import { CHAT_STATIC_GIFS, type ChatGif } from '@/constants/chatPickerAssets';

const TENOR_CLIENT_KEY = 'smitten';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

function giphyApiKey(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_GIPHY_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { giphyApiKey?: string } | undefined;
  return extra?.giphyApiKey?.trim() || undefined;
}

function tenorApiKey(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_TENOR_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { tenorApiKey?: string } | undefined;
  return extra?.tenorApiKey?.trim() || undefined;
}

type TenorMedia = {
  id: string;
  media_formats?: {
    gif?: { url?: string };
    tinygif?: { url?: string };
    mediumgif?: { url?: string };
  };
};

type GiphyItem = {
  id: string;
  images?: {
    fixed_height?: { url?: string };
    downsized_medium?: { url?: string };
    original?: { url?: string };
  };
};

function mapTenorResults(results: TenorMedia[]): ChatGif[] {
  return results
    .map((r) => {
      const url =
        r.media_formats?.gif?.url ??
        r.media_formats?.mediumgif?.url ??
        r.media_formats?.tinygif?.url;
      if (!url) return null;
      return { id: `tenor-${r.id}`, url, tags: [] as string[] };
    })
    .filter((g): g is ChatGif => g !== null);
}

function mapGiphyResults(data: GiphyItem[]): ChatGif[] {
  return data
    .map((r) => {
      const url =
        r.images?.fixed_height?.url ??
        r.images?.downsized_medium?.url ??
        r.images?.original?.url;
      if (!url) return null;
      return { id: `giphy-${r.id}`, url, tags: [] as string[] };
    })
    .filter((g): g is ChatGif => g !== null);
}

/** True when Giphy or Tenor key is configured (live search). */
export function hasRemoteGifSearch(): boolean {
  return Boolean(giphyApiKey() || tenorApiKey());
}

export function remoteGifProvider(): 'giphy' | 'tenor' | null {
  if (giphyApiKey()) return 'giphy';
  if (tenorApiKey()) return 'tenor';
  return null;
}

async function fetchGiphyGifs(query: string, limit: number): Promise<ChatGif[]> {
  const key = giphyApiKey();
  if (!key) return [];

  const path = query.trim() ? 'search' : 'trending';
  const params = new URLSearchParams({
    api_key: key,
    limit: String(limit),
    rating: 'g',
  });
  if (query.trim()) params.set('q', query.trim());

  const res = await fetch(`${GIPHY_BASE}/${path}?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: GiphyItem[] };
  return mapGiphyResults(data.data ?? []);
}

async function fetchTenorGifsRemote(query: string, limit: number): Promise<ChatGif[]> {
  const key = tenorApiKey();
  if (!key) return [];

  const path = query.trim() ? 'search' : 'featured';
  const params = new URLSearchParams({
    key,
    client_key: TENOR_CLIENT_KEY,
    limit: String(limit),
    media_filter: 'gif',
  });
  if (query.trim()) params.set('q', query.trim());

  const res = await fetch(`${TENOR_BASE}/${path}?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: TenorMedia[] };
  return mapTenorResults(data.results ?? []);
}

/** Search / trending — Giphy (recommended), then Tenor, then bundled GIFs. */
export async function fetchChatGifs(query: string, limit = 40): Promise<ChatGif[]> {
  try {
    if (giphyApiKey()) {
      const giphy = await fetchGiphyGifs(query, limit);
      if (giphy.length > 0) return giphy;
    }
    if (tenorApiKey()) {
      const tenor = await fetchTenorGifsRemote(query, limit);
      if (tenor.length > 0) return tenor;
    }
  } catch {
    /* fall through to bundled */
  }
  return filterStaticGifs(query, limit);
}

export function filterStaticGifs(query: string, limit = 48): ChatGif[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return CHAT_STATIC_GIFS.slice(0, limit);
  return CHAT_STATIC_GIFS.filter((gif) => {
    const searchable = [gif.id, ...gif.tags].map((value) => value.toLowerCase());
    return terms.some((term) => searchable.some((value) => value.includes(term)));
  }).slice(0, limit);
}

export const GIF_CATEGORY_QUERIES: { id: string; label: string; query: string }[] = [
  { id: 'trending', label: 'Trending', query: '' },
  { id: 'love', label: 'Love', query: 'love hearts couple' },
  { id: 'happy', label: 'Happy', query: 'happy excited celebration' },
  { id: 'sad', label: 'Sad', query: 'sad crying miss you' },
  { id: 'cute', label: 'Cute', query: 'cute animals aww' },
  { id: 'funny', label: 'Funny', query: 'funny meme lol' },
  { id: 'hug', label: 'Hug', query: 'hug cuddle' },
  { id: 'kiss', label: 'Kiss', query: 'kiss romance' },
];
