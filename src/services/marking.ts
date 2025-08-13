import { apiGet, apiPost } from './apiClient';

export async function createMarkingPhoto(payload: {
  walkRecordId: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
}) {
  return apiPost('/api/v1/marking-photos', payload);
}

export async function getPhotozoneDetails(photozoneId: string) {
  return apiGet(`/api/v1/marking-photozones/${photozoneId}`);
}

export async function addPhotoToPhotozone(
  photozoneId: string,
  payload: { photoUrl: string; walkRecordId: string }
) {
  return apiPost(`/api/v1/marking-photozones/${photozoneId}/photos`, payload);
}

