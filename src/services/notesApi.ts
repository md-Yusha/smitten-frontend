import { apiRequest } from '@/src/services/api';

export type ApiNote = {
  id: string;
  title: string;
  description: string;
  visibility?: 'SHARED' | 'PRIVATE';
  noteAt: string;
  creatorId: string;
  creatorName: string;
  canManage?: boolean;
  createdAt: string;
};

export const notesApi = {
  list() {
    return apiRequest<{ notes: ApiNote[] }>('/notes');
  },
  create(payload: { title: string; description?: string; noteAt: string; visibility?: 'SHARED' | 'PRIVATE' }) {
    return apiRequest<{ note: ApiNote }>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update(id: string, patch: { title?: string; description?: string; noteAt?: string; visibility?: 'SHARED' | 'PRIVATE' }) {
    return apiRequest<{ note: ApiNote }>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  remove(id: string) {
    return apiRequest<{ ok: boolean }>(`/notes/${id}`, { method: 'DELETE' });
  },
};
