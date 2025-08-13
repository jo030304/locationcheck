/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiGet, apiPost, apiPut } from './apiClient';

export async function fetchTerms(): Promise<any> {
  return apiGet('/api/v1/users/terms');
}

export async function agreeToTerms(agreedTermIds: string[]) {
  return apiPost('/api/v1/users/me/terms', { agreedTermIds });
}

export type UpdateProfilePayload = {
  petName?: string;
  breedId?: string;
  petBirthDate?: string; // YYYY-MM-DD
  petSize?: string; // e.g., '소형' | '중형' | '대형'
  petProfileImageUrl?: string;
  preferredLocationId?: string;
};

export async function updateProfile(payload: UpdateProfilePayload) {
  return apiPut('/api/v1/users/me/profile', payload);
}

export async function getMyProfile() {
  return apiGet('/api/v1/users/me/profile');
}

export async function getSummaryProfile() {
  return apiGet('/api/v1/users/me/summary-profile');
}

export async function getMyWalkRecords(params?: {
  page?: number;
  size?: number;
  sortBy?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.size) query.set('size', String(params.size));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  const qs = query.toString();
  return apiGet(`/api/v1/users/me/walk-records${qs ? `?${qs}` : ''}`);
}

