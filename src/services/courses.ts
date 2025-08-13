/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiGet, apiPost } from './apiClient';

export type CourseRecommendationsParams = {
  latitude: number;
  longitude: number;
  radius?: number; // meters
  sortBy?: 'tailcopterScoreDesc' | 'recent';
  areaName?: string;
  petSize?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ALL';
  page?: number;
  size?: number;
};

export async function getCourseRecommendations(
  params: CourseRecommendationsParams
) {
  const query = new URLSearchParams();
  query.set('latitude', String(params.latitude));
  query.set('longitude', String(params.longitude));
  if (params.radius) query.set('radius', String(params.radius));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.areaName) query.set('areaName', params.areaName);
  if (params.petSize) query.set('petSize', params.petSize);
  if (params.page) query.set('page', String(params.page));
  if (params.size) query.set('size', String(params.size));
  return apiGet(`/api/v1/courses/recommendations?${query.toString()}`);
}

export async function getCourseDetails(courseId: string) {
  return apiGet(`/api/v1/courses/${courseId}`);
}

export async function getCoursePhotozones(courseId: string) {
  return apiGet(`/api/v1/courses/${courseId}/marking-photozones`);
}

export async function getNewCourseBaseDetails(walkRecordId: string) {
  return apiGet(
    `/api/v1/courses/new/details?walkRecordId=${encodeURIComponent(walkRecordId)}`
  );
}

export type CreateCoursePayload = {
  walkRecordId: string;
  courseName: string;
  difficulty: '상' | '중' | '하';
  recommendedPetSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  selectedFeatures?: string[]; // max 3, each maxLength 5
  coverImageUrl?: string; // optional per updated API
};

export async function createCourse(payload: CreateCoursePayload) {
  return apiPost('/api/v1/courses/new', payload);
}
