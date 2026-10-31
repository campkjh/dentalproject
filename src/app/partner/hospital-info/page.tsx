'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useMyHospitalData } from '@/lib/partner/my-hospital-cache';
import { useStore } from '@/store';
import { compressImage } from '@/lib/compressImage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NaverMap from '@/components/common/NaverMap';
import MonoIcon from '@/components/common/MonoIcon';

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
  lat?: number | null;
  lng?: number | null;
  introduction?: string | null;
  holiday_notice?: string | null;
  tags?: string[] | null;
  cover_images?: string[] | null;
  logo_url?: string | null;
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
      patchLocalHospital((prev) => prev ? { ...prev, logo_url: url } : prev);
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

  /* 수정 화면 공통 헤더 — 고객 상세 머리(TopBar .qd-*)와 같은 결: 56 줄 둥근 뒤로 + 아래 큰 제목(+ 회색 한 줄).
     뒤로 = 개요로 돌아가기(라우터 뒤로 아님)라 TopBar 대신 같은 클래스로 직접 그린다. 그늘은 partner-v2.css 가 html[data-pd-scrolled] 로 켠다 */
  const EditHeader = ({ title, sub }: { title: string; sub?: React.ReactNode }) => (
    <>
      <header className="qd-header">
        <button type="button" onClick={goOverview} className="qd-back" aria-label="뒤로 가기">
          <i aria-hidden="true" className="pd-back-icon" />
        </button>
      </header>
      <div className="qd-titlewrap">
        <h1 className="qd-h1 qd-a-title">{title}</h1>
        {sub && <p className="qd-sub">{sub}</p>}
      </div>
    </>
  );

  if (loading) return <div className="partner-loading">불러오는 중...</div>;

  if (!hospital) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
        <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
          <MonoIcon name="hospital" size={34} color="#B0B8C1" />
        </span>
        <p className="qd-a-item mt-5 text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>등록된 병원이 없어요</p>
        <p className="qd-a-item mt-1.5 break-keep text-[15px] leading-[1.6] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>병원을 등록하면 병원관리 화면을 쓸 수 있어요.</p>
        <Link
          href="/hospital/register"
          className="qd-a-item mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] active:bg-[#DCEBFF]"
          style={{ animationDelay: '.18s' }}
        >
          병원 등록하기
        </Link>
      </div>
    );
  }

  const coverImages = (hospital.cover_images ?? []).filter(usableImage) as string[];
  const logo = usableImage(hospital.logo_url) ?? usableImage(hospital.image_url);
  const address = hospital.address ?? hospital.location ?? '';
  const tags = hospital.tags?.filter(Boolean).slice(0, 3) ?? [];
  const hours = hourLines(hospital);

  /* ── 대문사진 수정 화면 ── */
  if (mode === 'cover') {
    return (
      <div className="partner-mobile-screen partner-edit-screen" style={{ display: 'flex', flexDirection: 'column' }}>
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
        <EditHeader title="대문사진" sub="병원 홈 맨 위에 넘겨 보는 사진이에요. 최대 5장까지 올릴 수 있어요." />
        <section className="mx-auto w-full max-w-[640px] px-5 pb-10 pt-5">
          <div className="space-y-2.5">
            {coverImages.map((url, idx) => (
              <div key={url} className="qd-a-item relative h-[160px] overflow-hidden rounded-[16px] bg-[#F2F4F6]" style={{ animationDelay: `${0.04 * idx}s` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-2.5 top-2.5 inline-flex h-6 items-center rounded-[6px] bg-black/45 px-2 text-[12.5px] font-semibold text-white">{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleCoverDelete(idx)}
                  className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 transition-transform active:scale-95"
                  aria-label="사진 삭제"
                >
                  <MonoIcon name="bin" size={18} color="#FFFFFF" />
                </button>
              </div>
            ))}
          </div>

          {coverImages.length < 5 && (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className={`flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-[16px] bg-[#F2F4F6] transition-colors active:bg-[#E5E8EB] disabled:opacity-70 ${coverImages.length > 0 ? 'mt-2.5' : ''}`}
            >
              {uploadingCover ? (
                <span className="text-[15px] font-semibold text-[#6B7684]">올리는 중...</span>
              ) : (
                <>
                  <MonoIcon name="camera" size={26} color="#8B95A1" />
                  <span className="text-[15px] font-semibold text-[#4E5968]">사진 추가 <span className="text-[#8B95A1]">{coverImages.length}/5</span></span>
                </>
              )}
            </button>
          )}

          <p className="mt-4 flex gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
            <MonoIcon name="info-circle" size={18} color="#B0B8C1" className="mt-px" />
            jpg, png, avif 50MB 이하 사진을 올려 주세요. 자동으로 압축돼요.
          </p>
        </section>
      </div>
    );
  }

  /* ── 운영시간 수정 화면 ── */
  if (mode === 'hours') {
    return (
      <div className="partner-mobile-screen partner-edit-screen" style={{ display: 'flex', flexDirection: 'column', paddingBottom: SAVE_BAR_SPACE }}>
        <EditHeader title="운영일 및 시간" sub="시간을 비워 둔 요일은 휴진으로 보여요." />
        <section className="mx-auto w-full max-w-[640px] px-5 pb-6 pt-5">
          <textarea
            className={`${FIELD} !h-[96px] resize-none !px-4 !py-3.5 !leading-[1.5]`}
            placeholder="기타 휴진일 안내 (예: 공휴일 휴진)"
            value={holidayDraft}
            onChange={(e) => setHolidayDraft(e.target.value)}
          />
          <div className="mt-5 flex items-center gap-2 px-1 text-[14px] text-[#8B95A1]">
            <span className="w-8 shrink-0">요일</span>
            <span className="flex-1">시작</span>
            <span className="w-3 shrink-0" />
            <span className="flex-1">마감</span>
          </div>
          <div className="mt-1.5 space-y-2">
            {hoursDraft.map((row, index) => {
              const weekend = index === 0 || index === 6;
              return (
                <div key={row.day} className="flex items-center gap-2">
                  <span className={`w-8 shrink-0 pl-1 text-[16px] font-semibold ${weekend ? 'text-[#8B95A1]' : 'text-[#333D4B]'}`}>{row.day}</span>
                  <input
                    type="time"
                    aria-label={`${row.day} 시작시간`}
                    value={row.start_time}
                    onChange={(e) => updateHourDraft(row.day, 'start_time', e.target.value)}
                    className={`${FIELD} !min-h-12 min-w-0 flex-1 !px-3 tabular-nums`}
                  />
                  <span className="w-3 shrink-0 text-center text-[15px] text-[#B0B8C1]">~</span>
                  <input
                    type="time"
                    aria-label={`${row.day} 마감시간`}
                    value={row.end_time}
                    onChange={(e) => updateHourDraft(row.day, 'end_time', e.target.value)}
                    className={`${FIELD} !min-h-12 min-w-0 flex-1 !px-3 tabular-nums`}
                  />
                </div>
              );
            })}
          </div>
        </section>
        <SaveBar onClick={saveHours} disabled={saving} label={saving ? '저장 중...' : '저장하기'} />
      </div>
    );
  }

  /* ── 위치 수정 화면 ── */
  if (mode === 'location') {
    return (
      <div className="partner-mobile-screen partner-edit-screen" style={{ display: 'flex', flexDirection: 'column', paddingBottom: SAVE_BAR_SPACE }}>
        <EditHeader title="병원위치 수정" />
        <section className="mx-auto w-full max-w-[640px] space-y-5 px-5 pb-6 pt-5">
          {addressDraft && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-[16px] bg-[#F2F4F6]">
              <NaverMap address={addressDraft} name={hospital.name ?? undefined} />
            </div>
          )}
          <div>
            <label className="mb-2 block text-[15px] font-semibold text-[#4E5968]">주소</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={addressDraft}
                readOnly
                placeholder="도로명 주소를 검색해 주세요"
                className={`${FIELD} !min-h-14 min-w-0 flex-1 !px-4`}
              />
              <button
                type="button"
                onClick={openPostcode}
                className="h-14 shrink-0 rounded-[14px] bg-[#EFF5FE] px-4 text-[16px] font-semibold text-[#2F6FE4] transition-all active:scale-[0.98]"
              >
                주소 검색
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[15px] font-semibold text-[#4E5968]">상세주소</label>
            <input
              ref={addressDetailInputRef}
              type="text"
              value={addressDetailDraft}
              onChange={(e) => setAddressDetailDraft(e.target.value)}
              placeholder="예) 3층 301호"
              className={`${FIELD} !min-h-14 !px-4`}
            />
          </div>
        </section>
        <SaveBar onClick={saveLocation} disabled={saving} label={saving ? '저장 중...' : '저장하기'} />
      </div>
    );
  }

  /* ── 병원소개 수정 화면 ── */
  if (mode === 'intro') {
    return (
      <div className="partner-mobile-screen partner-edit-screen" style={{ display: 'flex', flexDirection: 'column', paddingBottom: SAVE_BAR_SPACE }}>
        <EditHeader title="병원소개" />
        <section className="mx-auto w-full max-w-[640px] px-5 pb-6 pt-5">
          <textarea
            className={`${FIELD} !h-[240px] resize-none !px-4 !py-3.5 !leading-[1.6]`}
            value={introDraft}
            maxLength={220}
            onChange={(e) => setIntroDraft(e.target.value)}
            placeholder="병원을 소개하는 글을 써 주세요"
          />
          <p className="mt-2 text-right text-[14px] tabular-nums text-[#8B95A1]">
            <span className="font-semibold text-[#333D4B]">{introDraft.length}</span>/220
          </p>
        </section>
        <SaveBar onClick={saveIntro} disabled={saving} label={saving ? '저장 중...' : '저장하기'} />
      </div>
    );
  }

  /* ── 메인 개요 화면 — 상품 상세 '병원 정보' 결: 사진 · 병원 줄 · 회색 이름 정보 줄 · 회색 띠로 칸 나눔 ── */
  const infoRows = [
    { label: '주소', value: address || <span className="text-[#B0B8C1]">주소를 등록해 주세요</span> },
    ...(hospital.phone ? [{ label: '전화', value: hospital.phone }] : []),
    ...(tags.length > 0 ? [{ label: '키워드', value: tags.map((t) => t.replace(/^#/, '')).join(', ') }] : []),
  ];

  return (
    <div className="partner-mobile-screen has-fixed-title">
      {/* 숨겨진 파일 인풋 */}
      <input ref={coverInputRef} type="file" accept="image/*" className="partner-hidden-file"
        onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void handleCoverUpload(f); }} />
      <input ref={logoInputRef} type="file" accept="image/*" className="partner-hidden-file"
        onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void handleLogoUpload(f); }} />

      {/* 대문사진 슬라이더 */}
      <section className="px-5 pt-1">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[16px] bg-[#F2F4F6]">
          {coverImages.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImages[coverIdx % coverImages.length]}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              {coverImages.length > 1 && (
                <>
                  <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                    {coverImages.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCoverIdx(i)}
                        aria-label={`${i + 1}번째 사진`}
                        className={`h-1.5 rounded-full transition-all ${i === coverIdx % coverImages.length ? 'w-4 bg-white' : 'w-1.5 bg-white/55'}`}
                      />
                    ))}
                  </div>
                  <button type="button" aria-label="이전 사진" onClick={() => setCoverIdx((p) => (p - 1 + coverImages.length) % coverImages.length)}
                    className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white">
                    <ChevronLeft size={18} />
                  </button>
                  <button type="button" aria-label="다음 사진" onClick={() => setCoverIdx((p) => (p + 1) % coverImages.length)}
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <MonoIcon name="camera" size={30} color="#B0B8C1" />
              <span className="text-[14px] text-[#8B95A1]">대문사진을 올려 주세요</span>
            </div>
          )}
          <button
            type="button"
            aria-label="대문사진 수정"
            onClick={() => openMode('cover')}
            className="absolute right-2.5 top-2.5 inline-flex h-8 items-center gap-1 rounded-full bg-black/45 pl-2.5 pr-3 text-[13.5px] font-semibold text-white transition-transform active:scale-95"
          >
            <MonoIcon name="pencil" size={15} color="#FFFFFF" />
            편집
          </button>
        </div>
      </section>

      {/* 병원 줄 + 이름 정보 줄 */}
      <section className="bg-white px-5 pb-7 pt-5">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            aria-label="병원 프로필사진 변경"
            disabled={uploadingLogo}
            className="relative h-[60px] w-[60px] shrink-0 overflow-visible rounded-[16px] bg-[#F2F4F6]"
          >
            {logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logo} alt="" className="h-full w-full rounded-[16px] object-cover" />
              : <span className="flex h-full w-full items-center justify-center"><MonoIcon name="hospital" size={28} color="#B0B8C1" /></span>}
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#4E5968]">
              <MonoIcon name="camera" size={13} color="#FFFFFF" />
            </span>
            {uploadingLogo && (
              <span className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/45 text-[11px] font-semibold text-white">올리는 중</span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <span className="inline-flex h-6 items-center rounded-[6px] bg-[#EFF5FE] px-2 text-[13px] font-semibold text-[#2F6FE4]">{hospital.category ?? '진료과 미등록'}</span>
            <h2 className="mt-1 truncate text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">{hospital.name ?? '병원명 미등록'}</h2>
          </div>
        </div>
        <div className="mt-4">
          {infoRows.map((r) => (
            <p key={r.label} className="flex min-h-11 items-center py-1.5">
              <span className="w-[76px] shrink-0 text-[16px] text-[#8B95A1]">{r.label}</span>
              <span className="min-w-0 flex-1 break-keep text-[16px] text-[#333D4B]">{r.value}</span>
            </p>
          ))}
        </div>
      </section>

      {/* 운영시간 */}
      <div className="h-2.5 bg-[#F2F4F6]" />
      <section className="bg-white px-5 py-7">
        <SectionHead title="운영일 및 시간" label="운영시간 수정" onEdit={() => openMode('hours')} />
        {hours.length > 0 ? (
          <dl className="mt-3">
            {hours.map((line) => {
              const [day, ...rest] = line.split(' ');
              const value = rest.join(' ');
              const closed = value === '휴진';
              return (
                <div key={line} className="flex min-h-11 items-center justify-between py-1.5 text-[16px]">
                  <dt className={day === '토' || day === '일' ? 'text-[#8B95A1]' : 'text-[#6B7684]'}>{day}요일</dt>
                  <dd className={`tabular-nums ${closed ? 'text-[#B0B8C1]' : 'text-[#333D4B]'}`}>{closed ? '휴진' : value.replace('~', ' – ')}</dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="mt-3 text-[15px] text-[#B0B8C1]">운영시간을 등록해 주세요.</p>
        )}
        {hospital.holiday_notice ? (
          <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
            <MonoIcon name="exclamation-circle" size={17} color="#B0B8C1" className="mt-0.5" />
            {hospital.holiday_notice}
          </p>
        ) : null}
      </section>

      {/* 병원소개 */}
      <div className="h-2.5 bg-[#F2F4F6]" />
      <section className="bg-white px-5 py-7">
        <SectionHead title="병원소개" label="병원소개 수정" onEdit={() => openMode('intro')} />
        {hospital.introduction
          ? <p className="mt-3 whitespace-pre-wrap break-words text-[16px] leading-[1.7] text-[#333D4B]">{hospital.introduction}</p>
          : <p className="mt-3 text-[15px] text-[#B0B8C1]">병원소개를 등록해 주세요.</p>}
      </section>

      {/* 병원위치 */}
      <div className="h-2.5 bg-[#F2F4F6]" />
      <section className="bg-white px-5 pb-10 pt-7">
        <SectionHead title="병원위치" label="병원위치 수정" onEdit={() => openMode('location')} />
        <div className="relative mt-3 aspect-[16/10] overflow-hidden rounded-[16px] bg-[#F2F4F6]">
          {address ? (
            <NaverMap address={address} lat={hospital.lat} lng={hospital.lng} name={hospital.name ?? undefined} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <MonoIcon name="pin-location" size={28} color="#B0B8C1" />
              <span className="text-[14px] text-[#8B95A1]">주소를 등록하면 지도가 보여요</span>
            </div>
          )}
        </div>
        {address
          ? <p className="mt-3 text-[15px] leading-[1.5] text-[#191F28]">{address}</p>
          : <p className="mt-3 text-[15px] text-[#B0B8C1]">주소를 등록해 주세요.</p>}
        {hospital.address_detail ? (
          <p className="mt-1.5 whitespace-pre-line rounded-[14px] bg-[#F2F4F6] px-4 py-3 text-[14px] leading-[1.6] text-[#4E5968]">{hospital.address_detail}</p>
        ) : null}
      </section>
    </div>
  );
}

/* 입력 칸 — 회색 면 · 테두리 없음 · 16 글자. .partner-page input 전역 결(테두리·15px)을 ! 로 덮는다 */
const FIELD = 'block w-full !rounded-[14px] !border-0 !bg-[#F2F4F6] !text-[16px] !font-normal !text-[#191F28] outline-none transition-colors focus:!bg-[#EDEFF2] focus:!shadow-none';
const SAVE_BAR_SPACE = 'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 104px)';

/** 칸 제목 줄 — 20 굵은 제목 + 오른쪽 파란 '수정' */
function SectionHead({ title, label, onEdit }: { title: string; label: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">{title}</h2>
      <button type="button" aria-label={label} onClick={onEdit} className="-mr-2 inline-flex h-9 items-center rounded-[10px] px-2 text-[15px] font-semibold text-[#3180F7] active:bg-[#F2F4F6]">
        수정
      </button>
    </div>
  );
}

/** 바닥 저장 버튼 — 위 선 대신 흰 그라데이션 */
function SaveBar({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[75] bg-white px-4 pt-2" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)' }}>
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-white/0 to-white" />
      <div className="mx-auto max-w-[608px]">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex h-14 w-full items-center justify-center rounded-[18px] bg-[#4A82EE] text-[17px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
