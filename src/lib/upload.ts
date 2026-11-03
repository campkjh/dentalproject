'use client';

import { upload } from '@vercel/blob/client';

export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

/**
 * 브라우저에서 Vercel Blob 으로 바로 올린다(서버 함수 4.5MB 한도 없이 25MB까지).
 * 토큰은 /api/upload/client 가 로그인 확인 후 발급한다. 돌려주는 값은 공개 URL.
 */
export async function uploadDirect(file: File, folder: string): Promise<string> {
  if (file.size > UPLOAD_MAX_BYTES) throw new Error('25MB 이하 파일만 올릴 수 있어요.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const blob = await upload(`${folder}/${Date.now()}.${ext}`, file, {
    access: 'public',
    handleUploadUrl: '/api/upload/client',
    contentType: file.type || undefined,
    multipart: file.size > 5 * 1024 * 1024,
  });
  return blob.url;
}
