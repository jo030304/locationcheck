/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  apiPost,
  authHeaderForKakao,
  setTokens,
  clearTokens,
} from './apiClient';

type KakaoLoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    isProfileSetupCompleted: boolean;
  };
  accessToken?: string; // 안전장치: 최상위에 토큰이 나올 가능성 대비
  refreshToken?: string;
};

export async function loginWithKakaoAccessToken(kakaoAccessToken: string) {
  const res = await apiPost<KakaoLoginResponse>(
    '/api/v1/auth/kakao',
    undefined,
    {
      skipAuth: true,
      headers: authHeaderForKakao(kakaoAccessToken),
    }
  );

  const data = res?.data ?? res;
  const accessToken = data?.accessToken ?? (res as any)?.accessToken;
  const refreshToken = data?.refreshToken ?? (res as any)?.refreshToken;
  if (accessToken) setTokens(accessToken, refreshToken);
  return data;
}

export async function logout() {
  // 서버 로그 기록용
  try {
    await apiPost('/api/v1/auth/logout');
  } finally {
    clearTokens();
  }
}
