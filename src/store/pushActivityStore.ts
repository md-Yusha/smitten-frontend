import { create } from 'zustand';

type AppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

type PushActivityState = {
  chatScreenActive: boolean;
  appState: AppState;
  setChatScreenActive: (active: boolean) => void;
  setAppState: (state: AppState) => void;
};

export const usePushActivityStore = create<PushActivityState>((set) => ({
  chatScreenActive: false,
  appState: 'unknown',
  setChatScreenActive: (chatScreenActive) => set({ chatScreenActive }),
  setAppState: (appState) => set({ appState }),
}));

export function shouldShowMessageNotification(): boolean {
  const { chatScreenActive, appState } = usePushActivityStore.getState();
  if (chatScreenActive) return false;
  return true;
}
