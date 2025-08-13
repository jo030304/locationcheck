/* eslint-disable @typescript-eslint/no-explicit-any */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  headers?: Record<string, string>;
  body?: any;
  skipAuth?: boolean; // true면 Authorization 헤더 자동 주입 생략 (카카오 로그인 전용)
  signal?: AbortSignal;
};

const BASE_URL = 'https://walkmeong.site';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    const newAccess = data?.data?.accessToken || data?.accessToken;
    const newRefresh = data?.data?.refreshToken || data?.refreshToken;
    if (newAccess) setTokens(newAccess, newRefresh);
    return Boolean(newAccess);
  } catch {
    return false;
  }
}

export async function request<T = any>(
  method: HttpMethod,
  url: string,
  { headers = {}, body, skipAuth = false, signal }: RequestOptions = {}
): Promise<T> {
  const authHeaders: Record<string, string> = {};
  const token = getAccessToken();
  if (!skipAuth && token) authHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 401 처리: 토큰 갱신 후 1회 재시도
  if (res.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryToken = getAccessToken();
      const retryRes = await fetch(`${BASE_URL}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(retryToken ? { Authorization: `Bearer ${retryToken}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
      if (!retryRes.ok) throw await buildError(retryRes);
      return (await parseResponse<T>(retryRes)) as T;
    }
  }

  if (!res.ok) throw await buildError(res);
  return (await parseResponse<T>(res)) as T;
}

async function parseResponse<T>(res: Response): Promise<T | undefined> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  // JSON 이외의 응답은 undefined 반환
  return undefined;
}

async function buildError(res: Response) {
  let detail: any = undefined;
  try {
    detail = await res.json();
  } catch {
    detail = await res.text();
  }
  const err = new Error(`HTTP ${res.status} ${res.statusText}`);
  (err as any).status = res.status;
  (err as any).detail = detail;
  return err;
}

export const apiGet = <T = any>(url: string, opts?: RequestOptions) =>
  request<T>('GET', url, opts);
export const apiPost = <T = any>(
  url: string,
  body?: any,
  opts?: RequestOptions
) => request<T>('POST', url, { ...opts, body });
export const apiPut = <T = any>(
  url: string,
  body?: any,
  opts?: RequestOptions
) => request<T>('PUT', url, { ...opts, body });
export const apiPatch = <T = any>(
  url: string,
  body?: any,
  opts?: RequestOptions
) => request<T>('PATCH', url, { ...opts, body });
export const apiDelete = <T = any>(url: string, opts?: RequestOptions) =>
  request<T>('DELETE', url, opts);

export function authHeaderForKakao(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  } as Record<string, string>;
}

