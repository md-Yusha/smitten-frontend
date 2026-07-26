import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'smitten:notification-inbox';

export type NotificationInboxItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type NotificationInboxState = {
  items: NotificationInboxItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (item: Omit<NotificationInboxItem, 'read'>) => void;
  markAllRead: () => void;
  clear: () => void;
};

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
      set({ items: Array.isArray(parsed) ? parsed : [], hydrated: true });
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
  clear: () => {
    set({ items: [] });
    void persist([]);
  },
}));

export function unreadNotificationCount(items: NotificationInboxItem[]): number {
  return items.reduce((count, item) => count + (item.read ? 0 : 1), 0);
}
