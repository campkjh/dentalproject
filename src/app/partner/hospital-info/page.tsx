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

function usableImage(src?: string | null) {
  if (!src) return null;
  if (src.startsWith('/images/hospital_')) return null;
  return src;
}

function SegmentNav() {
  return (
    <nav className="partner-inline-segment" aria-label="병원관리 탭">
      <Link href="/partner/hospital-info" className="is-active">병원</Link>
      <Link href="/partner/doctors">멤버</Link>
      <Link href="/partner/reviews">리뷰</Link>
    </nav>
  );
}

function EditButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button className="partner-edit-button" type="button" aria-label={label} onClick={onClick}>
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
  const [mode, setMode] = useState<'overview' | 'cover' | 'hours' | 'intro'>('overview');
  const [introDraft, setIntroDraft] = useState('');

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
        if (!cancelled) {
          setHospital(data.hospital ?? null);
          setIntroDraft(data.hospital?.introduction ?? '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    document.body.classList.toggle('partner-editing', mode !== 'overview');
    return () => {
      document.body.classList.remove('partner-editing');
    };
  }, [mode]);

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
  const cover = usableImage(hospital.cover_images?.[0]) ?? usableImage(hospital.image_url);
  const logo = usableImage(hospital.image_url);
  const hours = hourLines(hospital);

  const openMode = (nextMode: typeof mode) => {
    setPhotoMenuOpen(false);
    window.scrollTo(0, 0);
    setMode(nextMode);
  };
  const goOverview = () => openMode('overview');

  if (mode === 'cover') {
    return (
      <div className="partner-mobile-screen partner-edit-screen cover">
        <button className="partner-edit-back" type="button" onClick={goOverview} aria-label="뒤로">
          <img src="/partner-template/chevron-left.svg" alt="" />
        </button>
        <section className="partner-edit-content">
          <div className="partner-edit-title">
            <h1>대문사진</h1>
            <p>이미지는 3:1비율의 사진으로 첨부해주세요.<br />jpg, png, jpeg, avif 10mb이하의 이미지 파일</p>
          </div>
          <div className="partner-cover-upload-grid">
            <button type="button" onClick={() => setPhotoMenuOpen(true)}>
              <span><img src="/partner-template/camera.svg" alt="" /></span>
            </button>
            <button type="button" className="is-hidden" aria-hidden="true" tabIndex={-1} />
          </div>
        </section>
        {photoMenuOpen && (
          <div className="partner-photo-action-menu edit">
            <button type="button" onClick={() => setPhotoMenuOpen(false)}>앨범에서 사진 선택</button>
            <button type="button" onClick={() => setPhotoMenuOpen(false)}>사진촬영</button>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'hours') {
    return (
      <div className="partner-mobile-screen partner-edit-screen with-save">
        <button className="partner-edit-back" type="button" onClick={goOverview} aria-label="뒤로">
          <img src="/partner-template/chevron-left.svg" alt="" />
        </button>
        <section className="partner-edit-content compact">
          <div className="partner-edit-title small-gap">
            <h1>운영일 및 시간</h1>
            <p>운영시간 미기입 시 휴무일로 간주됩니다.</p>
          </div>
          <textarea className="partner-hours-note" placeholder="기타 휴진일 안내" defaultValue={hospital.holiday_notice ?? ''} />
          <div className="partner-hours-table">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => {
              const matched = hospital.operating_hours?.find((row) => row.day === day);
              const weekend = index === 0 || index === 6;
              return (
                <div key={day} className="partner-hours-row">
                  <span className={weekend ? 'weekend' : undefined}>{day}</span>
                  <input aria-label={`${day} 시작시간`} defaultValue={matched?.start_time ?? (day === '일' ? '' : '10:00')} placeholder="시작시간" />
                  <input aria-label={`${day} 마감시간`} defaultValue={matched?.end_time ?? (day === '일' ? '' : day === '화' || day === '금' ? '21:00' : day === '토' ? '16:00' : '19:00')} placeholder="마감시간" />
                </div>
              );
            })}
          </div>
        </section>
        <button className="partner-edit-save" type="button" onClick={goOverview}>저장하기</button>
      </div>
    );
  }

  if (mode === 'intro') {
    return (
      <div className="partner-mobile-screen partner-edit-screen with-save">
        <button className="partner-edit-back" type="button" onClick={goOverview} aria-label="뒤로">
          <img src="/partner-template/chevron-left.svg" alt="" />
        </button>
        <section className="partner-edit-content compact">
          <div className="partner-edit-title">
            <h1>병원소개</h1>
          </div>
          <p className="partner-intro-count">
            {introDraft.length}/<span>220</span>
          </p>
          <textarea
            className="partner-intro-textarea"
            value={introDraft}
            maxLength={220}
            onChange={(e) => setIntroDraft(e.target.value)}
            placeholder="병원소개글 등록"
          />
        </section>
        <button
          className="partner-edit-save"
          type="button"
          onClick={() => {
            setHospital((prev) => prev ? { ...prev, introduction: introDraft } : prev);
            goOverview();
          }}
        >
          저장하기
        </button>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <SegmentNav />
      </header>

      <section className="partner-hospital-cover">
        {cover ? (
          <img
            src={cover}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <button
          className="partner-edit-button"
          type="button"
          aria-label="대문사진 수정"
          onClick={() => openMode('cover')}
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
            {logo ? <img src={logo} alt="" /> : <img src="/partner-template/camera.svg" alt="" />}
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
            <EditButton label="운영일 및 시간 수정" onClick={() => openMode('hours')} />
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
            <button className="partner-edit-button" type="button" aria-label="병원소개 수정" onClick={() => openMode('intro')}>
              <img src="/partner-template/edit.svg" alt="" />
            </button>
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
