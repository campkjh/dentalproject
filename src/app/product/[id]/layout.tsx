import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { detailMetadata, unavailableDetailMetadata } from '@/lib/share-metadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const sb = await createClient();
    // 공유 크롤러도 고객 홈에 공개된 승인 상품만 조회한다.
    const { data, error } = await sb.from('products')
      .select('title, price, image_url, hospital:hospitals!products_hospital_id_fkey(name, status)')
      .eq('id', id).eq('status', 'active').eq('approval_status', 'approved').maybeSingle();
    const hospital = Array.isArray(data?.hospital) ? data.hospital[0] : data?.hospital;
    if (error || !data || hospital?.status !== 'approved') return unavailableDetailMetadata();
    const description = `${hospital.name} · ${Number(data.price).toLocaleString('ko-KR')}원 · 마이닥에서 시술 정보와 예약을 확인하세요.`;
    return detailMetadata({ path: `/product/${encodeURIComponent(id)}`, title: data.title, description, image: data.image_url });
  } catch { return unavailableDetailMetadata(); }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) { return children; }
