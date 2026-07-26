import { apiRequest } from './api';

export type LovePing = {
  id: string;
  senderId: string;
  senderName: string;
  kind?: string;
  createdAt: string;
  direction?: 'sent' | 'received';
};

export const coupleApi = {
  sendLove(kind?: string) {
    return apiRequest<{ love: LovePing }>('/couple/love', { 
      method: 'POST', 
      body: JSON.stringify({ kind }) 
    });
  },
  getPendingLove() {
    return apiRequest<{ loves: LovePing[] }>('/couple/love/pending');
  },
  getLoveHistory() {
    return apiRequest<{ loves: LovePing[] }>('/couple/love/history');
  },
  markLoveRead(id: string) {
    return apiRequest<{ ok: boolean }>(`/couple/love/${id}/read`, { method: 'POST' });
  },
};
