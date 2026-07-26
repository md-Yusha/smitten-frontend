import { apiRequest } from './api';

export type NotificationSettings = {
  enabled: boolean;
  chat: boolean;
  buzz: boolean;
  memories: boolean;
  diary: boolean;
  games: boolean;
  registered: boolean;
};

export type NotificationSettingsPatch = Partial<Omit<NotificationSettings, 'registered'>>;

export const notificationsApi = {
  getSettings() {
    return apiRequest<NotificationSettings>('/notifications/settings');
  },
  updateSettings(settings: boolean | NotificationSettingsPatch) {
    return apiRequest<NotificationSettings>('/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify(typeof settings === 'boolean' ? { enabled: settings } : settings),
    });
  },
  registerPushToken(expoPushToken: string) {
    return apiRequest<{ ok: boolean } & NotificationSettings>('/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ expoPushToken }),
    });
  },
  unregisterPushToken() {
    return apiRequest<{ ok: boolean }>('/notifications/register', { method: 'DELETE' });
  },
};
