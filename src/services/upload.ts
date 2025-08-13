/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiPost } from './apiClient';

export type PresignedUrlRequest = {
  fileName: string;
  fileType: 'image/jpeg' | 'image/png' | 'image/jpg' | 'image/webp';
  uploadType: 'profile' | 'marking' | 'course_cover';
};

export async function createPresignedUrl(payload: PresignedUrlRequest) {
  return apiPost('/api/v1/upload/presigned-url', payload);
}

export async function uploadToS3(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
  });
  if (!res.ok) throw new Error('S3 업로드 실패');
}

