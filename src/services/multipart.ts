import { API_V1, apiFetchHeaders } from '@/src/services/apiConfig';
import { ApiError } from '@/src/services/api';
import { getNetworkErrorMessage } from '@/src/services/formatApiError';
import {
  cleanupPreparedMedia,
  prepareMediaForUpload,
  type PreparedUploadMedia,
  type UploadImagePreset,
  type UploadMediaKind,
} from '@/src/services/mediaCompression';
import { refreshAccessToken } from '@/src/services/tokenRefresh';
import { getAccessToken } from '@/src/services/tokenStorage';

export type MediaUploadProgress = {
  phase: 'preparing' | 'uploading';
  progress: number;
  detail?: string;
};

function parseResponse<T>(text: string, status: number): T & { error?: string } {
  if (!text) return {} as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    if (status === 413) {
      return { error: 'Media is too large for the upload server.' } as T & { error?: string };
    }
    throw new ApiError(
      status >= 200 && status < 300 ? 'Invalid server response' : getNetworkErrorMessage(),
      status,
    );
  }
}

function sendFormData(
  path: string,
  method: 'POST' | 'PATCH',
  token: string | null,
  formData: FormData,
  uploadId: string,
  onProgress?: (progress: MediaUploadProgress) => void,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${API_V1}${path}`);
    const headers = apiFetchHeaders();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Upload-Id', uploadId);
    headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress?.({ phase: 'uploading', progress: Math.min(1, event.loaded / event.total) });
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? '' });
    xhr.onerror = () => reject(new ApiError('Upload connection was interrupted. Please try again.', 0));
    xhr.ontimeout = () => reject(new ApiError('Upload timed out. Check your connection and try again.', 0));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(formData);
  });
}

async function recoverCompletedUpload<T>(
  path: string,
  uploadId: string,
  token: string | null,
): Promise<{ status: number; text: string } | null> {
  if (path !== '/vault') return null;
  try {
    const headers = apiFetchHeaders();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(
      `${API_V1}/vault/upload-status/${encodeURIComponent(uploadId)}`,
      { headers },
    );
    if (!response.ok) return null;
    const data = await response.json() as T;
    return { status: response.status, text: JSON.stringify(data) };
  } catch {
    return null;
  }
}

export async function postMultipart<T>(
  path: string,
  fields: Record<string, string>,
  file?: {
    field: string;
    uri: string;
    kind?: UploadMediaKind;
    preset?: UploadImagePreset;
  },
  method: 'POST' | 'PATCH' = 'POST',
  onProgress?: (progress: MediaUploadProgress) => void,
): Promise<T> {
  let token = await getAccessToken();
  let prepared: PreparedUploadMedia | null = null;
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  if (file) {
    try {
      onProgress?.({ phase: 'preparing', progress: 0 });
      prepared = await prepareMediaForUpload(
        file.uri,
        file.kind ?? 'image',
        file.preset,
        (progress, detail) => onProgress?.({ phase: 'preparing', progress, detail }),
      );
    } catch (e) {
      // Surface errors from media preparation (compression/validation)
      // so they can be observed in client logs instead of failing silently.
      // Re-throw as ApiError so callers can handle it consistently.
      console.warn('[mediaUpload] preparation stopped:', e instanceof Error ? e.message : String(e));
      throw new ApiError(
        `Could not prepare media for upload: ${e instanceof Error ? e.message : String(e)}`,
        400,
      );
    }
  }

  try {
    const makeFormData = () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) formData.append(key, value);
      if (file && prepared) {
        formData.append(file.field, {
          uri: prepared.uri,
          name: prepared.name,
          type: prepared.type,
        } as unknown as Blob);
      }
      return formData;
    };

    onProgress?.({ phase: 'uploading', progress: 0 });
    let response: { status: number; text: string };
    try {
      response = await sendFormData(path, method, token, makeFormData(), uploadId, onProgress);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 0) throw error;
      const recovered = await recoverCompletedUpload<T>(path, uploadId, token);
      if (recovered) {
        console.info('[mediaUpload] recovered completed upload response', { uploadId, path });
        response = recovered;
      } else {
        console.warn('[mediaUpload] connection interrupted; retrying prepared file', { uploadId, path });
        response = await sendFormData(path, method, token, makeFormData(), uploadId, onProgress);
      }
    }
    if (response.status === 401 && token) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        token = newToken;
        response = await sendFormData(path, method, token, makeFormData(), uploadId, onProgress);
      }
    }

    const data = parseResponse<T>(response.text, response.status);
    if (response.status < 200 || response.status >= 300) {
      throw new ApiError(
        typeof data === 'object' && data && 'error' in data && data.error
          ? String(data.error)
          : `Request failed (${response.status})`,
        response.status,
        data,
      );
    }
    onProgress?.({ phase: 'uploading', progress: 1 });
    return data;
  } finally {
    if (file && prepared) cleanupPreparedMedia(file.uri, prepared.uri);
  }
}
