import { apiRequest } from '@/src/services/api';
import { postMultipart } from '@/src/services/multipart';
import type { MediaUploadProgress } from '@/src/services/multipart';

export type ApiMemory = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  mediaVersion?: string | null;
  mediaType: 'image' | 'video';
  memoryAt: string;
  isSpecialMoment: boolean | string;
  creatorId: string;
  creatorName: string;
  canManage?: boolean;
  createdAt: string;
  updatedAt: string;
};

export const memoriesApi = {
  list() {
    return apiRequest<{ memories: ApiMemory[] }>('/memories');
  },
  create(payload: {
    title: string;
    description?: string;
    memoryAt: string;
    imageUri?: string | null;
    mediaType?: 'image' | 'video';
    isSpecialMoment?: boolean;
    onProgress?: (value: MediaUploadProgress) => void;
  }) {
    const fields: Record<string, string> = {
      title: payload.title,
      description: payload.description ?? '',
      memoryAt: payload.memoryAt,
      isSpecialMoment: payload.isSpecialMoment ? 'true' : 'false',
    };
    const file = payload.imageUri
      ? { field: 'image', uri: payload.imageUri, kind: payload.mediaType ?? 'image' }
      : undefined;
    return postMultipart<{ memory: ApiMemory }>('/memories', fields, file, 'POST', payload.onProgress);
  },
  update(
    id: string,
    patch: {
      title?: string;
      description?: string;
      memoryAt?: string;
      isSpecialMoment?: boolean;
      removeMedia?: boolean;
      imageUri?: string | null;
      mediaType?: 'image' | 'video';
      onProgress?: (value: MediaUploadProgress) => void;
    },
  ) {
    if (patch.imageUri) {
      const fields: Record<string, string> = {};
      if (patch.title !== undefined) fields.title = patch.title;
      if (patch.description !== undefined) fields.description = patch.description;
      if (patch.memoryAt !== undefined) fields.memoryAt = patch.memoryAt;
      if (patch.isSpecialMoment !== undefined) fields.isSpecialMoment = patch.isSpecialMoment ? 'true' : 'false';
      if (patch.removeMedia !== undefined) fields.removeMedia = patch.removeMedia ? 'true' : 'false';
      return postMultipart<{ memory: ApiMemory }>(
        `/memories/${id}`,
        fields,
        { field: 'image', uri: patch.imageUri, kind: patch.mediaType ?? 'image' },
        'PATCH',
        patch.onProgress,
      );
    }
    const { imageUri, mediaType, onProgress, ...jsonPatch } = patch;
    void imageUri;
    void mediaType;
    void onProgress;
    return apiRequest<{ memory: ApiMemory }>(`/memories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(jsonPatch),
    });
  },
  remove(id: string) {
    return apiRequest<{ ok: boolean }>(`/memories/${id}`, { method: 'DELETE' });
  },
};
