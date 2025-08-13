/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiGet, apiPatch, apiPost, apiPut } from './apiClient';

export type StartWalkPayload = {
  walk_type: 'EXISTING_COURSE' | 'NEW_COURSE';
  course_id?: string | null;
};

export async function startWalk(payload: StartWalkPayload) {
  return apiPost('/api/v1/walk-records', payload);
}

export async function updateWalkTrack(
  walkRecordId: string,
  payload: {
    currentPathCoordinates: number[][];
    currentDistanceMeters: number;
    currentDurationSeconds: number;
  }
) {
  return apiPatch(`/api/v1/walk-records/${walkRecordId}/track`, payload);
}

export async function updateWalkStatus(
  walkRecordId: string,
  payload: {
    status: 'STARTED' | 'PAUSED' | 'COMPLETED' | 'CANCELED' | 'ABANDONED';
  }
) {
  return apiPatch(`/api/v1/walk-records/${walkRecordId}/status`, payload);
}

export async function endWalk(
  walkRecordId: string,
  payload: {
    finalDurationSeconds: number;
    finalDistanceMeters: number;
    finalPathCoordinates: number[][];
  }
) {
  return apiPut(`/api/v1/walk-records/${walkRecordId}/end`, payload);
}

export async function saveWalkDiary(
  walkRecordId: string,
  payload: {
    title?: string | null;
    walkDate?: string | null; // YYYY-MM-DD
    pathImageUrl?: string | null;
    distanceMeters: number;
    markingCount: number;
    tailcopterScore: number;
  }
) {
  return apiPost(`/api/v1/walk-records/${walkRecordId}/save`, payload);
}

export async function getWalkDiaryDetails(walkRecordId: string) {
  return apiGet(`/api/v1/walk-records/${walkRecordId}/details`);
}

export async function saveTailcopterScore(
  walkRecordId: string,
  tailcopterScore: number
) {
  return apiPut(`/api/v1/walk-records/${walkRecordId}/score`, {
    tailcopterScore,
  });
}

