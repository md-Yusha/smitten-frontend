import { apiRequest } from '@/src/services/api';

export type ApiSpecialMoment = {
  id: string;
  title: string;
  momentAt: string;
  creatorId: string;
  creatorName: string;
  canManage?: boolean;
  createdAt: string;
};

export const specialMomentsApi = {
  list() {
    return apiRequest<{ moments: ApiSpecialMoment[] }>('/special-moments');
  },
  create(payload: { title: string; momentAt: string }) {
    return apiRequest<{ moment: ApiSpecialMoment }>('/special-moments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, patch: { title?: string; momentAt?: string }) {
    return apiRequest<{ moment: ApiSpecialMoment }>(`/special-moments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  remove(id: string) {
    return apiRequest<{ ok: boolean }>(`/special-moments/${id}`, { method: 'DELETE' });
  },
};
