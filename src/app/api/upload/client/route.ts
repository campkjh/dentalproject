import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 브라우저에서 Vercel Blob 으로 바로 올릴 때 쓰는 토큰 발급 — 서버 함수 본문 한도(4.5MB)를 넘는
// 상세 이미지(최대 25MB)·서류도 올릴 수 있다. 로그인한 사람만, 이미지·PDF만, 25MB까지.
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_FOLDERS = ['product-images', 'product-details', 'hospital-covers', 'hospital-logos', 'hospital-docs', 'doctor-profiles', 'images'];

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const sb = await createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error('로그인이 필요합니다.');
        const folder = pathname.split('/')[0];
        if (!ALLOWED_FOLDERS.includes(folder)) throw new Error('올릴 수 없는 위치입니다.');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf'],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '업로드에 실패했습니다.' }, { status: 400 });
  }
}
