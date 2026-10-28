'use client';

// 병원 '사진 색 카드'(가로형) — 프리티풀 PartnerToneCard 그대로.
//  바탕·테두리 = 대표 사진에서 뽑은 색(lib/image-tone 'scene'), 16:9 사진 아래쪽이 그 색으로 녹아 이어진다.
//  이름 17 굵게 · 한 줄 정보(지역 | 후기 N개) · 흰 반투명 칩(한 줄만).
import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { useImageTone } from '@/lib/image-tone';

export type HospitalToneCardData = {
  id: string;
  name: string;
  location: string;
  image: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  tags: string[];
};

const CARD_FADE = 'linear-gradient(to bottom, #000 0%, #000 50%, rgba(0,0,0,.4) 78%, transparent 100%)';

export default function HospitalToneCard({ hospital, index = 0 }: { hospital: HospitalToneCardData; index?: number }) {
  const [broken, setBroken] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const tone = useImageTone(broken ? null : hospital.image, 'scene');
  const sub = tone?.sub || '#6B7684';
  const chips = Array.from(new Set(hospital.tags.filter(Boolean)));

  return (
    <Link
      href={`/hospital/detail/${hospital.id}`}
      className="group card-press block h-full overflow-hidden rounded-[20px] border"
      style={{ backgroundColor: tone?.bg || '#F2F4F6', borderColor: tone?.line || '#EAEDF0', transition: 'background-color .5s ease, border-color .5s ease' }}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
        {!broken && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hospital.image}
            alt={hospital.name}
            loading={index < 2 ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            style={{ WebkitMaskImage: CARD_FADE, maskImage: CARD_FADE }}
            onError={() => setBroken(true)}
          />
        )}
        {hospital.logo && !logoBroken && (
          <span className="absolute left-2.5 top-2.5 h-8 w-8 overflow-hidden rounded-full bg-white/90" style={{ boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,.08)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hospital.logo} alt="" className="h-full w-full object-cover" onError={() => setLogoBroken(true)} />
          </span>
        )}
      </div>
      <div className="relative -mt-4 px-4 pb-4">
        <p className="truncate text-[17px] font-bold leading-[1.4] tracking-[-0.4px] text-[#191F28]">{hospital.name}</p>
        <p className="mt-1 flex items-center gap-x-1.5 whitespace-nowrap text-[13px] leading-[1.5] tracking-[-0.2px]" style={{ color: sub }}>
          <span className="inline-flex min-w-0 shrink items-center gap-[3px]">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{hospital.location}</span>
          </span>
          <span aria-hidden className="h-2.5 w-px" style={{ backgroundColor: sub, opacity: 0.35 }} />
          <span className="inline-flex shrink-0 items-center gap-[3px]"><Star size={12} fill="currentColor" stroke="none" />{hospital.rating.toFixed(1)}</span>
          <span className="shrink-0">후기 {hospital.reviewCount.toLocaleString()}개</span>
        </p>
        {chips.length > 0 && (
          <div className="mt-2.5 flex h-[26px] flex-wrap gap-1 overflow-hidden">
            {chips.map(tag => (
              <span key={tag} className="flex h-[26px] items-center whitespace-nowrap rounded-[8px] bg-white/60 px-2 text-[12.5px] font-semibold tracking-[-0.2px] text-[#333D4B]">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
