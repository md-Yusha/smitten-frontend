import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'smitten:notification-inbox';

export type NotificationInboxItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  category?: 'chat' | 'buzz' | 'memory' | 'diary' | 'game' | 'vault' | 'account';
};

type NotificationInboxState = {
  items: NotificationInboxItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (item: Omit<NotificationInboxItem, 'read'>) => void;
  markAllRead: () => void;
  markCategoryRead: (category: NotificationInboxItem['category']) => void;
  clear: () => void;
};

function inferCategory(item: NotificationInboxItem): NotificationInboxItem {
  if (item.category) return item;
  const text = `${item.title} ${item.message}`.toLowerCase();
  const category = text.includes('message') || text.includes('chat') ? 'chat'
    : text.includes('buzz') || text.includes('ping') ? 'buzz'
      : text.includes('game') || text.includes('challenge') || text.includes('invite') ? 'game'
        : text.includes('vault') ? 'vault'
          : text.includes('diary') || text.includes('note') ? 'diary'
            : text.includes('memory') || text.includes('calendar') ? 'memory'
              : undefined;
  return category ? { ...item, category } : item;
}

async function persist(items: NotificationInboxItem[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    /* best effort */
  }
}

export const useNotificationInboxStore = create<NotificationInboxState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as NotificationInboxItem[]) : [];
      set({ items: Array.isArray(parsed) ? parsed.map(inferCategory) : [], hydrated: true });
    } catch {
      set({ items: [], hydrated: true });
    }
  },
  add: (item) => {
    const next = [{ ...item, read: false }, ...get().items].slice(0, 50);
    set({ items: next });
    void persist(next);
  },
  markAllRead: () => {
    const next = get().items.map((item) => ({ ...item, read: true }));
    set({ items: next });
    void persist(next);
  },
  markCategoryRead: (category) => {
    const next = get().items.map((item) => item.category === category ? { ...item, read: true } : item);
    set({ items: next });
    void persist(next);
  },
  clear: () => {
    set({ items: [] });
    void persist([]);
  },
}));

export function unreadNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (item.read ? 0 : 1), 0);
}

export function unreadChatNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category === 'chat' ? 1 : 0), 0);
}

export function unreadNonChatNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category !== 'chat' ? 1 : 0), 0);
}

export function unreadMemoryNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category === 'memory' ? 1 : 0), 0);
}

export function unreadDiaryNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category === 'diary' ? 1 : 0), 0);
}

export function unreadVaultNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category === 'vault' ? 1 : 0), 0);
}

export function unreadGameNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category === 'game' ? 1 : 0), 0);
}

export function unreadBuzzNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (!item.read && item.category === 'buzz' ? 1 : 0), 0);
}
