export type ChatTheme = {
  id: string;
  label: string;
  wallpaper: string;
  selfBubble: string;
  partnerBubble: string;
};

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'cream',
    label: 'Cream',
    wallpaper: '#ECE5DD',
    selfBubble: '#DCF8C6',
    partnerBubble: '#FFFFFF',
  },
  {
    id: 'blush',
    label: 'Blush',
    wallpaper: '#FFFFFF',
    selfBubble: '#FCE4EC',
    partnerBubble: '#FFFFFF',
  },
  {
    id: 'sky',
    label: 'Sky',
    wallpaper: '#E3F2FD',
    selfBubble: '#BBDEFB',
    partnerBubble: '#FFFFFF',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    wallpaper: '#EDE7F6',
    selfBubble: '#E1BEE7',
    partnerBubble: '#FFFFFF',
  },
  {
    id: 'night',
    label: 'Night',
    wallpaper: '#0B141A',
    selfBubble: '#005C4B',
    partnerBubble: '#1F2C34',
  },
];

export function getChatTheme(id: string | null | undefined): ChatTheme {
  return CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0]!;
}
