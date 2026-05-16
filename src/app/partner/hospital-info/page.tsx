'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type HospitalRow = {
  id: string;
  name?: string | null;
  category?: string | null;
  phone?: string | null;
  address?: string | null;
  address_detail?: string | null;
  location?: string | null;
  introduction?: string | null;
  holiday_notice?: string | null;
  tags?: string[] | null;
  cover_images?: string[] | null;
  image_url?: string | null;
  operating_hours?: Array<{
    day?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    is_closed?: boolean | null;
  }> | null;
};

const DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];
const FALLBACK_MAP = '/partner-template/map.png';

function SegmentNav() {
  return (
    <nav className="partner-inline-segment" aria-label="병원관리 탭">
      <Link href="/partner/hospital-info" className="is-active">병원</Link>
      <Link href="/partner/doctors">멤버</Link>
      <Link href="/partner/reviews">리뷰</Link>
    </nav>
  );
}

function EditButton({ label }: { label: string }) {
  return (
    <button className="partner-edit-button" type="button" aria-label={label}>
      <img src="/partner-template/edit.svg" alt="" />
    </button>
  );
}

function hourLines(hospital: HospitalRow) {
  const rows = hospital.operating_hours ?? [];
  const ordered = DAY_ORDER.map((day) => rows.find((row) => row.day === day)).filter(Boolean);
  if (ordered.length === 0) {
    return ['월 10:00~19:00', '화 10:00~21:00', '수 10:00~19:00', '목 10:00~19:00', '금 10:00~21:00', '토 10:00~16:00'];
  }
  return ordered.map((row) => {
    if (!row) return '';
    if (row.is_closed) return `${row.day} 휴진`;
    return `${row.day} ${row.start_time ?? '10:00'}~${row.end_time ?? '19:00'}`;
  });
}

export default function PartnerHospitalInfoPage() {
  const { authUser } = useSession();
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setHospital(data.hospital ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  if (loading) return <div className="partner-loading">불러오는 중...</div>;

  if (!hospital) {
    return (
      <div className="partner-empty-state">
        <p>등록된 병원이 없습니다.</p>
        <span>병원 등록 후 병원관리 화면을 사용할 수 있습니다.</span>
        <Link href="/hospital/register">병원 등록하기</Link>
      </div>
    );
  }

  const tags = hospital.tags?.length ? hospital.tags.slice(0, 3) : ['치아교정', '임플란트', '라미네이트'];
  const address = hospital.address ?? hospital.location ?? '주소 정보 없음';
  const cover = hospital.cover_images?.[0] ?? hospital.image_url;
  const hours = hourLines(hospital);

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <SegmentNav />
      </header>

      <section className="partner-hospital-cover">
        {cover ? <img src={cover} alt="" /> : null}
        <button
          className="partner-edit-button"
          type="button"
          aria-label="대문사진 수정"
          onClick={() => setPhotoMenuOpen((value) => !value)}
        >
          <img src="/partner-template/edit.svg" alt="" />
        </button>
      </section>

      <section className="partner-hospital-content">
        <div className="partner-hospital-profile">
          <button
            type="button"
            className="partner-hospital-logo"
            onClick={() => setPhotoMenuOpen((value) => !value)}
            aria-label="병원 사진 등록"
          >
            {hospital.image_url ? <img src={hospital.image_url} alt="" /> : <img src="/partner-template/camera.svg" alt="" />}
          </button>
          <div className="partner-hospital-summary">
            <span className="partner-category-chip">{hospital.category ?? '치과'}</span>
            <h2>{hospital.name ?? '병원명'}</h2>
            <p>{address}</p>
            <p>{hospital.phone ?? '1588-0831'}</p>
            <div className="partner-tag-row">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <section className="partner-info-section">
          <div className="partner-info-section-head">
            <h2>운영일 및 시간</h2>
            <EditButton label="운영일 및 시간 수정" />
          </div>
          <div className="partner-info-copy">
            <p>*{hospital.holiday_notice || '공휴일 휴진'}</p>
            {hours.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className="partner-info-section">
          <div className="partner-info-section-head">
            <h2>병원소개</h2>
            <EditButton label="병원소개 수정" />
          </div>
          {hospital.introduction ? (
            <p className="partner-info-description">{hospital.introduction}</p>
          ) : (
            <p className="partner-info-placeholder">병원소개를 등록해주세요.</p>
          )}
        </section>

        <section className="partner-info-section">
          <h2>병원위치</h2>
          <div className="partner-map-card">
            <img src={FALLBACK_MAP} alt="" />
            <button type="button" aria-label="지도 확대">
              <img src="/partner-template/expand.svg" alt="" />
            </button>
          </div>
          <p className="partner-info-description">{address}</p>
          <p className="partner-info-description">
            {hospital.address_detail ||
              '양재역 8번 출구 방향 도보 5분 이내 위치 양재역 7번 출구에서 셔틀버스 통해 간편하게 내원 가능합니다.(운영 시간 병원 문의)'}
          </p>
        </section>
      </section>

      {photoMenuOpen && (
        <div className="partner-photo-action-menu">
          <button type="button" onClick={() => setPhotoMenuOpen(false)}>앨범에서 사진 선택</button>
          <button type="button" onClick={() => setPhotoMenuOpen(false)}>사진촬영</button>
        </div>
      )}
    </div>
  );
}
