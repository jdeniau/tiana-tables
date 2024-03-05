export function getErrorMessage(error: unknown, fallback?: string): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback ?? 'An unknown error occurred';
}
