/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiGet } from './apiClient';

export async function searchLocations(keyword: string) {
  const q = new URLSearchParams({ keyword });
  return apiGet(`/api/v1/locations/search?${q.toString()}`);
}

export async function searchBreeds(keyword?: string) {
  const q = new URLSearchParams();
  if (keyword) q.set('keyword', keyword);
  const qs = q.toString();
  return apiGet(`/api/v1/breeds/search${qs ? `?${qs}` : ''}`);
}

