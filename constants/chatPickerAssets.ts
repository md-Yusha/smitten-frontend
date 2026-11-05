/**
 * Chat picker assets — legacy built-ins + Nawaz packs + GIF catalog.
 */

import {
  LEGACY_EMOJI_ASSETS,
  CHAT_EMOJI_PALETTE,
  LEGACY_EMOJI_CATEGORY,
  LEGACY_STICKER_ASSETS,
  LEGACY_STICKER_CATEGORY,
  twemojiPngUrl,
  getCustomChatSticker,
  CUSTOM_CHAT_STICKERS,
} from './chatPickerLegacyAssets';

import {
  CHAT_EMOJI_ASSETS as NAWAZ_EMOJI_ASSETS,
  CHAT_EMOJI_CATEGORIES as NAWAZ_EMOJI_CATEGORIES,
  CHAT_STICKER_ASSETS as NAWAZ_STICKER_ASSETS,
  CHAT_STICKER_CATEGORIES as NAWAZ_STICKER_CATEGORIES,
} from './chatPickerAssets.generated';

export type ChatPickerAsset = {
  id: string;
  body: string;
  label: string;
  category: string;
  source?: number;
  remoteUri?: string;
  unicode?: string;
};

// Keep the legacy picker group at the end so newer curated groups are easy to reach.
export const CHAT_EMOJI_CATEGORIES = [...NAWAZ_EMOJI_CATEGORIES, LEGACY_EMOJI_CATEGORY];
export const CHAT_STICKER_CATEGORIES = [...NAWAZ_STICKER_CATEGORIES, LEGACY_STICKER_CATEGORY];

export const CHAT_EMOJI_ASSETS: ChatPickerAsset[] = [...LEGACY_EMOJI_ASSETS, ...NAWAZ_EMOJI_ASSETS];
export const CHAT_STICKER_ASSETS: ChatPickerAsset[] = [...LEGACY_STICKER_ASSETS, ...NAWAZ_STICKER_ASSETS];

export {
  CHAT_EMOJI_COUPLE_ASSETS,
  CHAT_EMOJI_HEARTY_ASSETS,
  CHAT_EMOJI_SMILEY_ASSETS,
  CHAT_STICKER_COUPLES_ASSETS,
  CHAT_STICKER_CUPID_ASSETS,
  CHAT_STICKER_SLANG_ASSETS,
} from './chatPickerAssets.generated';

export { twemojiPngUrl, getCustomChatSticker, CUSTOM_CHAT_STICKERS, CHAT_EMOJI_PALETTE };

export const CUSTOM_CHAT_STICKER_PREFIX = 'asset:';

export function getChatPickerAsset(body: string): ChatPickerAsset | undefined {
  if (body.startsWith(CUSTOM_CHAT_STICKER_PREFIX)) {
    return CHAT_EMOJI_ASSETS.find((asset) => asset.body === body)
      ?? CHAT_STICKER_ASSETS.find((asset) => asset.body === body)
      ?? undefined;
  }

  return LEGACY_STICKER_ASSETS.find((asset) => asset.body === body);
}

export function getChatPickerImageSource(body: string) {
  const asset = getChatPickerAsset(body);
  if (asset?.source) return asset.source;
  const customSticker = getCustomChatSticker(body);
  if (customSticker) return customSticker.source;
  if (asset?.remoteUri) return { uri: asset.remoteUri };
  if (/^[0-9a-f]+$/i.test(body)) return { uri: twemojiPngUrl(body) };
  return null;
}

export function isChatEmojiAsset(body: string): boolean {
  return body.startsWith('asset:emoji:');
}

export type ChatGif = { id: string; url: string; tags: string[] };

/** Bundled GIFs (Giphy CDN). Used offline and when Tenor API key is not set. */
export const CHAT_STATIC_GIFS: ChatGif[] = [
  { id: 'love-1', url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif', tags: ['love', 'hearts', 'trending'] },
  { id: 'love-2', url: 'https://media.giphy.com/media/26FLgGTPakHBAQTjW/giphy.gif', tags: ['love', 'kiss', 'romance'] },
  { id: 'love-3', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', tags: ['love', 'cute', 'happy'] },
  { id: 'love-4', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', tags: ['love', 'hearts'] },
  { id: 'love-5', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', tags: ['love', 'hug', 'cuddle'] },
  { id: 'happy-1', url: 'https://media.giphy.com/media/l378e0Bkt6UK8dU9q/giphy.gif', tags: ['happy', 'excited', 'funny'] },
  { id: 'happy-2', url: 'https://media.giphy.com/media/26ufdipCqYTUxnWf6/giphy.gif', tags: ['happy', 'dance', 'party'] },
  { id: 'happy-3', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', tags: ['happy', 'celebration'] },
  { id: 'happy-4', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', tags: ['happy', 'yes', 'trending'] },
  { id: 'happy-5', url: 'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif', tags: ['happy', 'funny', 'lol'] },
  { id: 'cute-1', url: 'https://media.giphy.com/media/14kdiJUblbWBXy/giphy.gif', tags: ['cute', 'animals', 'cat'] },
  { id: 'cute-2', url: 'https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif', tags: ['cute', 'dog', 'puppy'] },
  { id: 'cute-3', url: 'https://media.giphy.com/media/3oz8xRF0v9WMAUVLNK/giphy.gif', tags: ['cute', 'aww', 'baby'] },
  { id: 'cute-4', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', tags: ['cute', 'bear'] },
  { id: 'sad-1', url: 'https://media.giphy.com/media/xT0xeJpnJ7WcASZuk8/giphy.gif', tags: ['sad', 'cry', 'miss'] },
  { id: 'sad-2', url: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif', tags: ['sad', 'sorry'] },
  { id: 'sad-3', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', tags: ['sad', 'lonely'] },
  { id: 'funny-1', url: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif', tags: ['funny', 'meme', 'lol'] },
  { id: 'funny-2', url: 'https://media.giphy.com/media/26xBPq4qOCDR9NfjO/giphy.gif', tags: ['funny', 'reaction'] },
  { id: 'funny-3', url: 'https://media.giphy.com/media/3o7bu2fck3qlqxc8w/giphy.gif', tags: ['funny', 'sarcasm'] },
  { id: 'funny-4', url: 'https://media.giphy.com/media/l3V0j3ytFyGHqiV7W/giphy.gif', tags: ['funny', 'awkward'] },
  { id: 'funny-5', url: 'https://media.giphy.com/media/3o7aDbf4RrSX4WJHu/giphy.gif', tags: ['funny', 'wow'] },
  { id: 'hug-1', url: 'https://media.giphy.com/media/xUA7aZd91YpRfUtHwg/giphy.gif', tags: ['hug', 'love', 'comfort'] },
  { id: 'hug-2', url: 'https://media.giphy.com/media/3o6Zt481isNVvbQI96/giphy.gif', tags: ['hug', 'friends'] },
  { id: 'kiss-1', url: 'https://media.giphy.com/media/3o7abldb0gie3izhdy/giphy.gif', tags: ['kiss', 'love', 'romance'] },
  { id: 'kiss-2', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5ktqM/giphy.gif', tags: ['kiss', 'couple'] },
  { id: 'party-1', url: 'https://media.giphy.com/media/26BRuo6sLetlooafm/giphy.gif', tags: ['party', 'celebration', 'happy'] },
  { id: 'party-2', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', tags: ['party', 'dance'] },
  { id: 'party-3', url: 'https://media.giphy.com/media/3o6Zt4HU9Q0qVef7eE/giphy.gif', tags: ['party', 'confetti'] },
  { id: 'hi-1', url: 'https://media.giphy.com/media/ICOgDjpFdZbdm/giphy.gif', tags: ['hello', 'hi', 'wave'] },
  { id: 'hi-2', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', tags: ['hello', 'hey'] },
  { id: 'bye-1', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', tags: ['bye', 'goodnight'] },
  { id: 'thanks-1', url: 'https://media.giphy.com/media/3oz8xAFtAyAUropGri/giphy.gif', tags: ['thanks', 'thank you'] },
  { id: 'sorry-1', url: 'https://media.giphy.com/media/3o6ZtaO9BZHcDMzfy8/giphy.gif', tags: ['sorry', 'apology'] },
  { id: 'angry-1', url: 'https://media.giphy.com/media/l3V0wHgZtiGyCgplo/giphy.gif', tags: ['angry', 'mad'] },
  { id: 'sleep-1', url: 'https://media.giphy.com/media/3o6Zt7X1oNmTwc9Vcc/giphy.gif', tags: ['sleep', 'tired', 'goodnight'] },
  { id: 'food-1', url: 'https://media.giphy.com/media/3o7btYLAW7doynq3pO/giphy.gif', tags: ['food', 'hungry', 'pizza'] },
  { id: 'food-2', url: 'https://media.giphy.com/media/3o7btMRhgvsej6H6Eo/giphy.gif', tags: ['food', 'yum'] },
  { id: 'sponge-1', url: 'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif', tags: ['funny', 'meme', 'trending'] },
  { id: 'cat-1', url: 'https://media.giphy.com/media/mlvseq9YhlbZ6/giphy.gif', tags: ['cute', 'cat', 'animals'] },
  { id: 'cat-2', url: 'https://media.giphy.com/media/MDJ9JW3yiC4Uy6ptAK/giphy.gif', tags: ['cute', 'cat'] },
  { id: 'dog-1', url: 'https://media.giphy.com/media/4Zxig5C7YVZ4s/giphy.gif', tags: ['cute', 'dog', 'animals'] },
  { id: 'dog-2', url: 'https://media.giphy.com/media/5PhRV2KCzgFxt/giphy.gif', tags: ['cute', 'dog', 'happy'] },
  { id: 'heart-1', url: 'https://media.giphy.com/media/26gsjCZpPolPr3s40/giphy.gif', tags: ['love', 'hearts'] },
  { id: 'heart-2', url: 'https://media.giphy.com/media/26BRBKyqYlxBbvXfO/giphy.gif', tags: ['love', 'hearts', 'romance'] },
  { id: 'heart-3', url: 'https://media.giphy.com/media/l0MYGb1RzjK9qH20U/giphy.gif', tags: ['love', 'miss you'] },
  { id: 'think-1', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif', tags: ['thinking', 'hmm'] },
  { id: 'ok-1', url: 'https://media.giphy.com/media/111ebjYsN70qIo/giphy.gif', tags: ['ok', 'thumbs up', 'yes'] },
  { id: 'no-1', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', tags: ['no', 'nope'] },
  { id: 'cheer-1', url: 'https://media.giphy.com/media/5GoVLqeueo5Pa/giphy.gif', tags: ['cheer', 'support', 'happy'] },
  { id: 'cheer-2', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', tags: ['support', 'hug'] },
  { id: 'flirt-1', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', tags: ['flirt', 'wink', 'love'] },
  { id: 'flirt-2', url: 'https://media.giphy.com/media/3o7aDbf4RrSX4WJHu/giphy.gif', tags: ['flirt', 'cute'] },
  { id: 'bday-1', url: 'https://media.giphy.com/media/26tOZIgPg6Wj6pLyE/giphy.gif', tags: ['birthday', 'party', 'celebration'] },
  { id: 'bday-2', url: 'https://media.giphy.com/media/l0HlHFRbRozaXBmRi/giphy.gif', tags: ['birthday', 'cake'] },
  { id: 'fire-1', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', tags: ['fire', 'lit', 'trending'] },
  { id: 'clap-1', url: 'https://media.giphy.com/media/7rj26ZLuToxOCQPezx/giphy.gif', tags: ['clap', 'bravo', 'happy'] },
  { id: 'shy-1', url: 'https://media.giphy.com/media/3o7abldb0gie3izhdy/giphy.gif', tags: ['shy', 'blush', 'cute'] },
  { id: 'cool-1', url: 'https://media.giphy.com/media/3o7btYLAW7doynq3pO/giphy.gif', tags: ['cool', 'sunglasses'] },
  { id: 'stress-1', url: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif', tags: ['stress', 'anxious'] },
  { id: 'work-1', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif', tags: ['work', 'busy'] },
  { id: 'weekend-1', url: 'https://media.giphy.com/media/26BRuo6sLetlooafm/giphy.gif', tags: ['weekend', 'party', 'happy'] },
  { id: 'coffee-1', url: 'https://media.giphy.com/media/3o6Zt481isNVvbQI96/giphy.gif', tags: ['coffee', 'morning'] },
  { id: 'rain-1', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', tags: ['rain', 'sad', 'mood'] },
  { id: 'sun-1', url: 'https://media.giphy.com/media/26gsjCZpPolPr3s40/giphy.gif', tags: ['sun', 'happy', 'summer'] },
];
