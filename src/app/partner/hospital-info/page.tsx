'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useStore } from '@/store';
import { compressImage } from '@/lib/compressImage';

type OperatingHour = {
  day?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_closed?: boolean | null;
};

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
  operating_hours?: OperatingHour[] | null;
};

type Mode = 'overview' | 'cover' | 'hours' | 'intro' | 'location';
type HourDraft = { day: string; start_time: string; end_time: string };
type DaumPostcodeData = {
  address?: string;
  roadAddress?: string;
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void };
    };
  }
}

const DISPLAY_DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];
const EDIT_DAY_ORDER = ['일', '월', '화', '수', '목', '금', '토'];
const DAUM_POSTCODE_SCRIPT_ID = 'daum-postcode-script';
let daumPostcodeLoader: Promise<void> | null = null;

function usableImage(src?: string | null) {
  if (!src) return null;
  if (src.startsWith('/images/hospital_')) return null;
  if (src.startsWith('data:')) return null;
  return src;
}

function buildHourDrafts(hospital: HospitalRow | null): HourDraft[] {
  return EDIT_DAY_ORDER.map((day) => {
    const row = hospital?.operating_hours?.find((item) => item.day === day);
    return {
      day,
      start_time: row?.is_closed ? '' : row?.start_time ?? '',
      end_time: row?.is_closed ? '' : row?.end_time ?? '',
    };
  });
}

function hourLines(hospital: HospitalRow) {
  const rows = hospital.operating_hours ?? [];
  return DISPLAY_DAY_ORDER
    .map((day) => rows.find((row) => row.day === day))
    .filter((row): row is OperatingHour => Boolean(row))
    .map((row) => {
      if (row.is_closed || !row.start_time || !row.end_time) return `${row.day} 휴진`;
      return `${row.day} ${row.start_time}~${row.end_time}`;
    });
}

function loadDaumPostcode() {
  if (typeof window === 'undefined') return Promise.reject(new Error('주소 검색을 사용할 수 없습니다.'));
  if (window.daum?.Postcode) return Promise.resolve();
  if (daumPostcodeLoader) return daumPostcodeLoader;

  daumPostcodeLoader = new Promise((resolve, reject) => {
    const existing = document.getElementById(DAUM_POSTCODE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('주소 검색을 불러오지 못했습니다.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = DAUM_POSTCODE_SCRIPT_ID;
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('주소 검색을 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  return daumPostcodeLoader;
}

export default function PartnerHospitalInfoPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const addressDetailInputRef = useRef<HTMLInputElement>(null);
  const {
    data: hospitalData,
    loading,
    mutate: mutateHospital,
  } = useMyHospitalData<HospitalRow>(authUser?.id);
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [introDraft, setIntroDraft] = useState('');
  const [holidayDraft, setHolidayDraft] = useState('');
  const [hoursDraft, setHoursDraft] = useState<HourDraft[]>(() => buildHourDrafts(null));
  const [addressDraft, setAddressDraft] = useState('');
  const [addressDetailDraft, setAddressDetailDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverIdx, setCoverIdx] = useState(0);

  const syncDrafts = useCallback((row: HospitalRow | null) => {
    setIntroDraft(row?.introduction ?? '');
    setHolidayDraft(row?.holiday_notice ?? '');
    setHoursDraft(buildHourDrafts(row));
    setAddressDraft(row?.address ?? '');
    setAddressDetailDraft(row?.address_detail ?? '');
  }, []);

  const patchLocalHospital = useCallback((updater: (current: HospitalRow | null) => HospitalRow | null) => {
    setHospital((current) => {
      const next = updater(current);
      mutateHospital((cached) => cached ? { ...cached, hospital: next } : cached);
      return next;
    });
  }, [mutateHospital]);

  useEffect(() => {
    const next = hospitalData?.hospital ?? null;
    setHospital(next);
    if (mode === 'overview') syncDrafts(next);
  }, [hospitalData, mode, syncDrafts]);

  useEffect(() => {
    document.body.classList.toggle('partner-editing', mode !== 'overview');
    return () => { document.body.classList.remove('partner-editing'); };
  }, [mode]);

  useEffect(() => {
    if (mode === 'location') void loadDaumPostcode().catch(() => undefined);
  }, [mode]);

  const openMode = (nextMode: Mode) => { window.scrollTo(0, 0); setMode(nextMode); };
  const goOverview = () => openMode('overview');

  /* ── 서버 API로 병원 정보 패치 ── */
  const patchHospitalAPI = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/my-hospital', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as any).error || '저장에 실패했습니다.');
    }
  };

  /* ── 운영시간 서버 API ── */
  const saveHoursAPI = async (hours: HourDraft[]) => {
    const payload = hours.map((r) => ({
      day: r.day,
      start_time: r.start_time.trim() || null,
      end_time: r.end_time.trim() || null,
      is_closed: !r.start_time.trim() && !r.end_time.trim(),
    }));
    const res = await fetch('/api/my-hospital/hours', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: payload }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as any).error || '운영시간 저장에 실패했습니다.');
    }
  };

  /* ── 이미지 업로드 공통 ── */
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append('file', compressed);
    fd.append('folder', folder);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as any).error || '이미지 업로드에 실패했습니다.');
    }
    const blob = await res.json();
    if (!blob.url) throw new Error('업로드 URL을 확인할 수 없습니다.');
    return blob.url as string;
  };

  /* ── 대문사진 업로드 (기존에 추가) ── */
  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 등록할 수 있습니다.'); return; }
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, 'hospital-covers');
      const existing = hospital?.cover_images?.filter(usableImage) ?? [];
      const next = [...existing, url];
      await patchHospitalAPI({ coverImages: next });
      patchLocalHospital((prev) => prev ? { ...prev, cover_images: next } : prev);
      showToast('대문사진을 저장했습니다.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setUploadingCover(false);
    }
  };

  /* ── 대문사진 삭제 ── */
  const handleCoverDelete = async (idx: number) => {
    const next = (hospital?.cover_images ?? []).filter((_, i) => i !== idx);
    try {
      await patchHospitalAPI({ coverImages: next });
      patchLocalHospital((prev) => prev ? { ...prev, cover_images: next } : prev);
      setCoverIdx(Math.max(0, idx - 1));
      showToast('사진을 삭제했습니다.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제에 실패했습니다.');
    }
  };

  /* ── 프로필(로고) 업로드 ── */
  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { showToast('이미지 파일만 등록할 수 있습니다.'); return; }
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, 'hospital-logos');
      await patchHospitalAPI({ imageUrl: url });
      patchLocalHospital((prev) => prev ? { ...prev, image_url: url } : prev);
      showToast('프로필사진을 저장했습니다.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveIntro = async () => {
    setSaving(true);
    try {
      await patchHospitalAPI({ introduction: introDraft });
      patchLocalHospital((prev) => prev ? { ...prev, introduction: introDraft } : prev);
      showToast('병원소개를 저장했습니다.');
      goOverview();
    } catch (e) { showToast(e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const saveHours = async () => {
    const hasInvalid = hoursDraft.some((r) => {
      const s = r.start_time.trim(); const e = r.end_time.trim();
      return (s && !e) || (!s && e);
    });
    if (hasInvalid) { showToast('시작시간과 마감시간을 모두 입력해주세요.'); return; }
    setSaving(true);
    try {
      await saveHoursAPI(hoursDraft);
      await patchHospitalAPI({ holidayNotice: holidayDraft });
      const hours = hoursDraft.map((r) => ({
        day: r.day,
        start_time: r.start_time || null,
        end_time: r.end_time || null,
        is_closed: !r.start_time && !r.end_time,
      }));
      patchLocalHospital((prev) => prev ? { ...prev, holiday_notice: holidayDraft, operating_hours: hours } : prev);
      showToast('운영시간을 저장했습니다.');
      goOverview();
    } catch (e) { showToast(e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const saveLocation = async () => {
    if (!addressDraft.trim()) {
      showToast('도로명 주소를 검색해 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      await patchHospitalAPI({ address: addressDraft, addressDetail: addressDetailDraft });
      patchLocalHospital((prev) => prev ? { ...prev, address: addressDraft, address_detail: addressDetailDraft } : prev);
      showToast('위치 정보를 저장했습니다.');
      goOverview();
    } catch (e) { showToast(e instanceof Error ? e.message : '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const openPostcode = async () => {
    try {
      await loadDaumPostcode();
      if (!window.daum?.Postcode) throw new Error('주소 검색을 불러오지 못했습니다.');
      new window.daum.Postcode({
        oncomplete: (data) => {
          const selectedAddress = data.roadAddress || data.address || '';
          if (!selectedAddress) {
            showToast('선택한 주소를 확인할 수 없습니다.');
            return;
          }
          setAddressDraft(selectedAddress);
          window.setTimeout(() => addressDetailInputRef.current?.focus(), 0);
        },
      }).open();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '주소 검색을 불러오지 못했습니다.');
    }
  };

  const updateHourDraft = (day: string, field: 'start_time' | 'end_time', value: string) => {
    setHoursDraft((prev) => prev.map((r) => r.day === day ? { ...r, [field]: value } : r));
  };

  /* 수정 화면 공통 헤더 — 뒤로 버튼 + 타이틀 */
  const EditHeader = ({ title, padded = false }: { title: string; padded?: boolean }) => (
    <header className={`partner-profile-edit-head${padded ? ' is-padded' : ''}`}>
      <button type="button" onClick={goOverview} aria-label="뒤로">
        <img src="/partner-template/chevron-left.svg" alt="" />
      </button>
      <h1>{title}</h1>
    </header>
  );

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

  const coverImages = (hospital.cover_images ?? []).filter(usableImage) as string[];
  const logo = usableImage(hospital.image_url);
  const address = hospital.address ?? hospital.location ?? '';
  const tags = hospital.tags?.filter(Boolean).slice(0, 3) ?? [];
  const hours = hourLines(hospital);

  /* ── 대문사진 수정 화면 ── */
  if (mode === 'cover') {
    return (
      <div className="partner-mobile-screen partner-edit-screen cover" style={{ display: 'flex', flexDirection: 'column' }}>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="partner-hidden-file"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (f) void handleCoverUpload(f);
          }}
        />
        <EditHeader title="대문사진" />
        <section className="partner-edit-content" style={{ paddingTop: 20 }}>
          <div className="partner-edit-title">
            <h1>대문사진</h1>
            <p>슬라이드 배너용 사진을 최대 5장까지 등록할 수 있습니다.<br />jpg, png, avif 50MB 이하 (자동 압축)</p>
          </div>

          {/* 기존 사진 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coverImages.map((url, idx) => (
              <div key={url} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 140 }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => handleCoverDelete(idx)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
                    color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label="사진 삭제"
                >×</button>
              </div>
            ))}
          </div>

          {/* 추가 버튼 */}
          {coverImages.length < 5 && (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              style={{
                width: '100%', height: 100, border: '2px dashed #D1D5DB', borderRadius: 12,
                background: '#F9FAFB', cursor: uploadingCover ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {uploadingCover
                ? <span style={{ fontSize: 13, color: '#6B7280' }}>업로드 중...</span>
                : (
                  <>
                    <img src="/partner-template/camera.svg" alt="" style={{ width: 28, height: 28, opacity: 0.5 }} />
                    <span style={{ fontSize: 13, color: '#6B7280' }}>사진 추가 ({coverImages.length}/5)</span>
                  </>
                )}
            </button>
          )}
        </section>
      </div>
    );
  }

  /* ── 운영시간 수정 화면 ── */
  if (mode === 'hours') {
    return (
      <div className="partner-mobile-screen partner-edit-screen with-save" style={{ display: 'flex', flexDirection: 'column' }}>
        <EditHeader title="운영일 및 시간" padded />
        <section className="partner-edit-content compact" style={{ paddingTop: 20 }}>
          <div className="partner-edit-title small-gap">
            <h1>운영일 및 시간</h1>
            <p>운영시간 미기입 시 휴무일로 간주됩니다.</p>
          </div>
          <textarea
            className="partner-hours-note"
            placeholder="기타 휴진일 안내"
            value={holidayDraft}
            onChange={(e) => setHolidayDraft(e.target.value)}
          />
          <div className="partner-hours-table">
            {hoursDraft.map((row, index) => {
              const weekend = index === 0 || index === 6;
              return (
                <div key={row.day} className="partner-hours-row">
                  <span className={weekend ? 'weekend' : undefined}>{row.day}</span>
                  <input
                    type="time"
                    aria-label={`${row.day} 시작시간`}
                    value={row.start_time}
                    onChange={(e) => updateHourDraft(row.day, 'start_time', e.target.value)}
                  />
                  <input
                    type="time"
                    aria-label={`${row.day} 마감시간`}
                    value={row.end_time}
                    onChange={(e) => updateHourDraft(row.day, 'end_time', e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </section>
        <button className="partner-edit-save" type="button" onClick={saveHours} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    );
  }

  /* ── 위치 수정 화면 ── */
  if (mode === 'location') {
    return (
      <div className="partner-mobile-screen partner-edit-screen with-save" style={{ display: 'flex', flexDirection: 'column' }}>
        <EditHeader title="병원위치 수정" />
        <section className="partner-edit-content compact" style={{ gap: 16, paddingTop: 20 }}>
          {addressDraft && (
            <iframe
              title="지도"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(addressDraft)}&output=embed&hl=ko`}
              style={{ width: '100%', height: 200, border: 0, borderRadius: 14 }}
              loading="lazy"
            />
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>주소</label>
            <div className="partner-location-address-row">
              <input
                type="text"
                value={addressDraft}
                readOnly
                placeholder="도로명 주소를 검색해주세요"
                style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 16, boxSizing: 'border-box' }}
              />
              <button type="button" onClick={openPostcode}>주소 검색</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>상세주소</label>
            <input
              ref={addressDetailInputRef}
              type="text"
              value={addressDetailDraft}
              onChange={(e) => setAddressDetailDraft(e.target.value)}
              placeholder="예) 3층 301호"
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 16, boxSizing: 'border-box' }}
            />
          </div>
        </section>
        <button className="partner-edit-save" type="button" onClick={saveLocation} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    );
  }

  /* ── 병원소개 수정 화면 ── */
  if (mode === 'intro') {
    return (
      <div className="partner-mobile-screen partner-edit-screen with-save" style={{ display: 'flex', flexDirection: 'column' }}>
        <EditHeader title="병원소개" />
        <section className="partner-edit-content compact" style={{ paddingTop: 20 }}>

          <p className="partner-intro-count">{introDraft.length}/<span>220</span></p>
          <textarea
            className="partner-intro-textarea"
            value={introDraft}
            maxLength={220}
            onChange={(e) => setIntroDraft(e.target.value)}
            placeholder="병원소개글 등록"
          />
        </section>
        <button className="partner-edit-save" type="button" onClick={saveIntro} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    );
  }

  /* ── 메인 개요 화면 ── */
  return (
    <div className="partner-mobile-screen has-fixed-title">
      {/* 숨겨진 파일 인풋 */}
      <input ref={coverInputRef} type="file" accept="image/*" className="partner-hidden-file"
        onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void handleCoverUpload(f); }} />
      <input ref={logoInputRef} type="file" accept="image/*" className="partner-hidden-file"
        onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void handleLogoUpload(f); }} />

      {/* 대문사진 슬라이더 */}
      <section className="partner-hospital-cover" style={{ position: 'relative', overflow: 'hidden' }}>
        {coverImages.length > 0 ? (
          <>
            <img
              src={coverImages[coverIdx % coverImages.length]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            {/* 슬라이드 도트 */}
            {coverImages.length > 1 && (
              <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                {coverImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCoverIdx(i)}
                    style={{
                      width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                      background: i === coverIdx % coverImages.length ? '#fff' : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </div>
            )}
            {/* 좌우 화살표 */}
            {coverImages.length > 1 && (
              <>
                <button type="button" onClick={() => setCoverIdx((p) => (p - 1 + coverImages.length) % coverImages.length)}
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>‹</button>
                <button type="button" onClick={() => setCoverIdx((p) => (p + 1) % coverImages.length)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>›</button>
              </>
            )}
          </>
        ) : null}
        <button className="partner-edit-button" type="button" aria-label="대문사진 수정" onClick={() => openMode('cover')}>
          <img src="/partner-template/edit.svg" alt="" />
        </button>
      </section>

      <section className="partner-hospital-content">
        {/* 로고/프로필 */}
        <div className="partner-hospital-profile">
          <button
            type="button"
            className="partner-hospital-logo"
            onClick={() => logoInputRef.current?.click()}
            aria-label="병원 프로필사진 변경"
            disabled={uploadingLogo}
            style={{ position: 'relative' }}
          >
            {logo
              ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <img src="/partner-template/camera.svg" alt="" />}
            {uploadingLogo && (
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>업로드 중</span>
            )}
          </button>
          <div className="partner-hospital-summary">
            <span className="partner-category-chip">{hospital.category ?? '진료과 미등록'}</span>
            <h2>{hospital.name ?? '병원명 미등록'}</h2>
            {address ? <p>{address}</p> : <p className="partner-info-placeholder">주소를 등록해주세요.</p>}
            {hospital.phone ? <p>{hospital.phone}</p> : null}
            {tags.length > 0 && (
              <div className="partner-tag-row">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            )}
          </div>
        </div>

        {/* 운영시간 */}
        <section className="partner-info-section">
          <div className="partner-info-section-head">
            <h2>운영일 및 시간</h2>
            <button className="partner-edit-button" type="button" aria-label="운영시간 수정" onClick={() => openMode('hours')}>
              <img src="/partner-template/edit.svg" alt="" />
            </button>
          </div>
          <div className="partner-info-copy">
            {hospital.holiday_notice ? <p>*{hospital.holiday_notice}</p> : null}
            {hours.length > 0
              ? hours.map((line) => <p key={line}>{line}</p>)
              : <p className="partner-info-placeholder">운영시간을 등록해주세요.</p>}
          </div>
        </section>

        {/* 병원소개 */}
        <section className="partner-info-section">
          <div className="partner-info-section-head">
            <h2>병원소개</h2>
            <button className="partner-edit-button" type="button" aria-label="병원소개 수정" onClick={() => openMode('intro')}>
              <img src="/partner-template/edit.svg" alt="" />
            </button>
          </div>
          {hospital.introduction
            ? <p className="partner-info-description">{hospital.introduction}</p>
            : <p className="partner-info-placeholder">병원소개를 등록해주세요.</p>}
        </section>

        {/* 병원위치 */}
        <section className="partner-info-section">
          <h2 style={{ display: 'flex', alignItems: 'center' }}>
            병원위치
            <button type="button" onClick={() => openMode('location')}
              style={{ marginLeft: 'auto', fontSize: 13, color: '#8037FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>수정</button>
          </h2>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, height: 180 }}>
            {address ? (
              <iframe
                title="병원위치 지도"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=ko`}
                style={{ width: '100%', height: '100%', border: 0 }}
                loading="lazy"
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>주소를 등록하면 지도가 표시됩니다</span>
              </div>
            )}
          </div>
          {address
            ? <p className="partner-info-description">{address}</p>
            : <p className="partner-info-placeholder">주소를 등록해주세요.</p>}
          {hospital.address_detail ? <p className="partner-info-description">{hospital.address_detail}</p> : null}
        </section>
      </section>
    </div>
  );
}
