type ApiErrorLike = Error & { status: number; body?: unknown };

/** Short hint when the phone cannot reach the API (backend off, wrong URL, ngrok down). */
export function getNetworkErrorMessage(_error?: unknown): string {
  return 'Server error. Please try again in a moment.';
}

function isApiError(error: unknown): error is ApiErrorLike {
  return error instanceof Error && typeof (error as { status?: unknown }).status === 'number';
}

/** Map API / network errors to copy that fits in-app alerts. */
export function formatApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isApiError(error)) {
    if (error.status === 0) return getNetworkErrorMessage();
    if (error.status === 401) {
      return error.message || 'Invalid email or password.';
    }
    if (error.status === 403) {
      return error.message || 'You do not have permission to do that.';
    }
    if (error.status === 404) {
      return error.message || 'Not found.';
    }
    if (error.status === 409) {
      return error.message || 'This already exists.';
    }
    if (error.status >= 500) {
      return getNetworkErrorMessage();
    }
    return error.message || fallback;
  }

  if (error instanceof TypeError) {
    return getNetworkErrorMessage(error);
  }

  if (error instanceof Error && /network|fetch|abort|timed? out|connection/i.test(error.message)) {
    return getNetworkErrorMessage(error);
  }

  if (error instanceof Error && error.message.trim()) {
    if (/video tools|video editing|newly rebuilt apk|expo go|older builds/i.test(error.message)) {
      return error.message;
    }
    if (/payment options|phonepe checkout|try again/i.test(error.message)) {
      return error.message;
    }
    return fallback;
  }

  return fallback;
}
