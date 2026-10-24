export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 0,
    public readonly retryAt = 0,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function retryDeadline(value: string | null, now = Date.now()): number {
  if (value !== null && value.trim() !== '' && Number.isFinite(Number(value))) {
    return now + Math.max(0, Number(value)) * 1_000;
  }
  const timestamp = value === null ? NaN : Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(now, timestamp) : now + 30_000;
}

export function responseError(response: Response): ApiError {
  const messages: Record<number, string> = {
    400: 'Data belum valid. Periksa isian form.',
    401: 'Username, password, atau sesi tidak valid.',
    403: 'Anda tidak memiliki izin untuk permintaan ini.',
    404: 'Data tidak ditemukan.',
    409: 'Data masih digunakan atau bertentangan dengan data yang ada.',
    429: 'Terlalu banyak permintaan. Tunggu sebelum mencoba lagi.',
  };
  return new ApiError(
    messages[response.status] ?? 'API sedang bermasalah. Silakan coba lagi nanti.',
    response.status,
    response.status === 429 ? retryDeadline(response.headers.get('Retry-After')) : 0,
  );
}
