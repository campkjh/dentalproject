import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { detailMetadata, unavailableDetailMetadata } from '@/lib/share-metadata';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const sb = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data, error } = await sb.from('hospitals').select('name, address, location, cover_images, logo_url')
      .eq(isUuid ? 'id' : 'slug', id).eq('status', 'approved').maybeSingle();
    if (error || !data) return unavailableDetailMetadata();
    return detailMetadata({ path: `/hospital/detail/${encodeURIComponent(id)}`, title: data.name,
      description: `${data.address || data.location || ''} · 마이닥에서 병원 정보와 시술을 확인하세요.`,
      image: data.cover_images?.find(Boolean) || data.logo_url });
  } catch { return unavailableDetailMetadata(); }
}

export default function HospitalLayout({ children }: { children: React.ReactNode }) { return children; }
