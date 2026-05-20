'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

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
type PhotoTarget = 'cover' | 'logo';
type HourDraft = { day: string; start_time: string; end_time: string };

const DISPLAY_DAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];
const EDIT_DAY_ORDER = ['일', '월', '화', '수', '목', '금', '토'];
const FALLBACK_MAP = '/partner-template/map.png';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function usableImage(src?: string | null) {
  if (!src) return null;
  if (src.startsWith('/images/hospital_')) return null;
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
  return DISPLAY_DAY_ORDER
    .map((day) => rows.find((row) => row.day === day))
    .filter((row): row is OperatingHour => Boolean(row))
    .map((row) => {
      if (row.is_closed || !row.start_time || !row.end_time) return `${row.day} 휴진`;
      return `${row.day} ${row.start_time}~${row.end_time}`;
    });
}

export default function PartnerHospitalInfoPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoMenuTarget, setPhotoMenuTarget] = useState<PhotoTarget | null>(null);
  const [mode, setMode] = useState<Mode>('overview');
  const [introDraft, setIntroDraft] = useState('');
  const [holidayDraft, setHolidayDraft] = useState('');
  const [hoursDraft, setHoursDraft] = useState<HourDraft[]>(() => buildHourDrafts(null));
  const [addressDraft, setAddressDraft] = useState('');
  const [addressDetailDraft, setAddressDetailDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<PhotoTarget | null>(null);

  const syncDrafts = useCallback((row: HospitalRow | null) => {
    setIntroDraft(row?.introduction ?? '');
    setHolidayDraft(row?.holiday_notice ?? '');
    setHoursDraft(buildHourDrafts(row));
    setAddressDraft(row?.address ?? '');
    setAddressDetailDraft(row?.address_detail ?? '');
  }, []);

  const reloadHospital = useCallback(async () => {
    const res = await fetch('/api/my-hospital', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const nextHospital = data.hospital ?? null;
    setHospital(nextHospital);
    syncDrafts(nextHospital);
  }, [syncDrafts]);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await reloadHospital();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, reloadHospital]);

  useEffect(() => {
    document.body.classList.toggle('partner-editing', mode !== 'overview');
    return () => {
      document.body.classList.remove('partner-editing');
    };
  }, [mode]);

  const openMode = (nextMode: Mode) => {
    setPhotoMenuTarget(null);
    window.scrollTo(0, 0);
    setMode(nextMode);
  };

  const goOverview = () => openMode('overview');

  const patchHospital = async (body: Record<string, unknown>) => {
    if (!hospital?.id) throw new Error('병원 정보를 찾을 수 없습니다.');
    if (!hasSupabaseEnv()) throw new Error('Supabase 환경변수가 설정되지 않았습니다.');

    const sb = createClient();
    const patch: Record<string, unknown> = {};
    if (typeof body.introduction === 'string') patch.introduction = body.introduction;
    if (typeof body.holidayNotice === 'string') patch.holiday_notice = body.holidayNotice;
    if (typeof body.imageUrl === 'string') patch.image_url = body.imageUrl;
    if (Array.isArray(body.coverImages)) patch.cover_images = body.coverImages;
    if (typeof body.name === 'string') patch.name = body.name;
    if (typeof body.phone === 'string') patch.phone = body.phone;
    if (typeof body.address === 'string') patch.address = body.address;
    if (Array.isArray(body.tags)) patch.tags = body.tags;

    const { error } = await sb.from('hospitals').update(patch).eq('id', hospital.id);
    if (error) throw new Error(error.message);
  };

  const saveIntro = async () => {
    setSaving(true);
    try {
      await patchHospital({ introduction: introDraft });
      setHospital((prev) => (prev ? { ...prev, introduction: introDraft } : prev));
      showToast('병원소개를 저장했습니다.');
      goOverview();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const saveHours = async () => {
    const hours = hoursDraft.map((row) => {
      const start = row.start_time.trim();
      const end = row.end_time.trim();
      return {
        day: row.day,
        start_time: start || null,
        end_time: end || null,
        is_closed: !start && !end,
      };
    });

    const hasInvalidRange = hours.some((row) => !row.is_closed && (!row.start_time || !row.end_time));
    if (hasInvalidRange) {
      showToast('운영 시작시간과 마감시간을 모두 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      if (!hospital?.id) throw new Error('병원 정보를 찾을 수 없습니다.');
      const sb = createClient();
      const upsertRows = hours.map((h) => ({
        hospital_id: hospital.id,
        day: h.day,
        start_time: h.start_time ?? null,
        end_time: h.end_time ?? null,
        is_closed: h.is_closed ?? false,
      }));
      const { error: hoursErr } = await sb.from('operating_hours').upsert(upsertRows, { onConflict: 'hospital_id,day' });
      if (hoursErr) throw new Error(hoursErr.message);
      await patchHospital({ holidayNotice: holidayDraft });
      setHospital((prev) => (
        prev
          ? { ...prev, holiday_notice: holidayDraft, operating_hours: hours }
          : prev
      ));
      showToast('운영시간을 저장했습니다.');
      goOverview();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const saveLocation = async () => {
    setSaving(true);
    try {
      await patchHospital({ address: addressDraft, addressDetail: addressDetailDraft });
      setHospital((prev) => prev ? { ...prev, address: addressDraft, address_detail: addressDetailDraft } : prev);
      showToast('위치 정보를 저장했습니다.');
      goOverview();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updateHourDraft = (day: string, field: 'start_time' | 'end_time', value: string) => {
    setHoursDraft((prev) => prev.map((row) => (
      row.day === day ? { ...row, [field]: value } : row
    )));
  };

  const selectImage = (target: PhotoTarget) => {
    setPhotoMenuTarget(null);
    const input = target === 'cover' ? coverInputRef.current : logoInputRef.current;
    input?.click();
  };

  const uploadImage = async (target: PhotoTarget, file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 등록할 수 있습니다.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showToast('10MB 이하 이미지만 등록할 수 있습니다.');
      return;
    }

    setUploadingTarget(target);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', target === 'cover' ? 'hospital-covers' : 'hospital-logos');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const payload = await uploadRes.json().catch(() => ({}));
        throw new Error(payload.error || '이미지 업로드에 실패했습니다.');
      }
      const blob = await uploadRes.json();
      const url = blob.url as string | undefined;
      if (!url) throw new Error('업로드 URL을 확인할 수 없습니다.');

      if (target === 'cover') {
        await patchHospital({ coverImages: [url] });
        setHospital((prev) => (prev ? { ...prev, cover_images: [url] } : prev));
      } else {
        await patchHospital({ imageUrl: url });
        setHospital((prev) => (prev ? { ...prev, image_url: url } : prev));
      }
      showToast('이미지를 저장했습니다.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '이미지 저장에 실패했습니다.');
    } finally {
      setUploadingTarget(null);
    }
  };

  const renderImageInputs = () => (
    <>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/avif,image/webp"
        className="partner-hidden-file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void uploadImage('cover', file);
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/avif,image/webp"
        className="partner-hidden-file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void uploadImage('logo', file);
        }}
      />
    </>
  );

  const renderPhotoMenu = () => (
    photoMenuTarget ? (
      <div className={`partner-photo-action-menu ${mode === 'cover' ? 'edit' : ''}`}>
        <button type="button" onClick={() => selectImage(photoMenuTarget)}>앨범에서 사진 선택</button>
        <button type="button" onClick={() => selectImage(photoMenuTarget)}>사진촬영</button>
      </div>
    ) : null
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

  const tags = hospital.tags?.filter(Boolean).slice(0, 3) ?? [];
  const address = hospital.address ?? hospital.location ?? '';
  const cover = usableImage(hospital.cover_images?.[0]) ?? usableImage(hospital.image_url);
  const logo = usableImage(hospital.image_url);
  const hours = hourLines(hospital);

  const openMap = () => {
    if (!address) {
      showToast('주소가 등록되어 있지 않습니다.');
      return;
    }
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (mode === 'cover') {
    return (
      <div className="partner-mobile-screen partner-edit-screen cover">
        {renderImageInputs()}
        <button className="partner-edit-back" type="button" onClick={goOverview} aria-label="뒤로">
          <img src="/partner-template/chevron-left.svg" alt="" />
        </button>
        <section className="partner-edit-content">
          <div className="partner-edit-title">
            <h1>대문사진</h1>
            <p>이미지는 3:1비율의 사진으로 첨부해주세요.<br />jpg, png, jpeg, avif 10mb이하의 이미지 파일</p>
          </div>
          <div className="partner-cover-upload-grid">
            <button type="button" onClick={() => setPhotoMenuTarget('cover')} disabled={uploadingTarget === 'cover'}>
              {cover ? (
                <img className="partner-cover-upload-preview" src={cover} alt="" />
              ) : (
                <span><img src="/partner-template/camera.svg" alt="" /></span>
              )}
            </button>
            <button type="button" className="is-hidden" aria-hidden="true" tabIndex={-1} />
          </div>
          {uploadingTarget === 'cover' && <p className="partner-upload-status">업로드 중...</p>}
        </section>
        {renderPhotoMenu()}
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
          <textarea
            className="partner-hours-note"
            placeholder="기타 휴진일 안내"
            value={holidayDraft}
            onChange={(event) => setHolidayDraft(event.target.value)}
          />
          <div className="partner-hours-table">
            {hoursDraft.map((row, index) => {
              const weekend = index === 0 || index === 6;
              return (
                <div key={row.day} className="partner-hours-row">
                  <span className={weekend ? 'weekend' : undefined}>{row.day}</span>
                  <input
                    aria-label={`${row.day} 시작시간`}
                    value={row.start_time}
                    placeholder="시작시간"
                    onChange={(event) => updateHourDraft(row.day, 'start_time', event.target.value)}
                  />
                  <input
                    aria-label={`${row.day} 마감시간`}
                    value={row.end_time}
                    placeholder="마감시간"
                    onChange={(event) => updateHourDraft(row.day, 'end_time', event.target.value)}
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

  if (mode === 'location') {
    return (
      <div className="partner-mobile-screen partner-edit-screen with-save">
        <button className="partner-edit-back" type="button" onClick={goOverview} aria-label="뒤로">
          <img src="/partner-template/chevron-left.svg" alt="" />
        </button>
        <section className="partner-edit-content compact" style={{ gap: 16 }}>
          <div className="partner-edit-title"><h1>병원위치 수정</h1></div>
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
            <input
              type="text"
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
              placeholder="예) 서울특별시 강남구 테헤란로 123"
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>상세주소</label>
            <input
              type="text"
              value={addressDetailDraft}
              onChange={(e) => setAddressDetailDraft(e.target.value)}
              placeholder="예) 3층 301호"
              style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        </section>
        <button className="partner-edit-save" type="button" onClick={saveLocation} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
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
        <button className="partner-edit-save" type="button" onClick={saveIntro} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen">
      {renderImageInputs()}
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
            onClick={() => setPhotoMenuTarget('logo')}
            aria-label="병원 사진 등록"
            disabled={uploadingTarget === 'logo'}
          >
            {logo ? <img src={logo} alt="" /> : <img src="/partner-template/camera.svg" alt="" />}
          </button>
          <div className="partner-hospital-summary">
            <span className="partner-category-chip">{hospital.category ?? '진료과 미등록'}</span>
            <h2>{hospital.name ?? '병원명 미등록'}</h2>
            {address ? (
              <p>{address}</p>
            ) : (
              <p className="partner-info-placeholder">주소를 등록해주세요.</p>
            )}
            {hospital.phone ? <p>{hospital.phone}</p> : null}
            {tags.length > 0 && (
              <div className="partner-tag-row">
                {tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="partner-info-section">
          <div className="partner-info-section-head">
            <h2>운영일 및 시간</h2>
            <EditButton label="운영일 및 시간 수정" onClick={() => openMode('hours')} />
          </div>
          <div className="partner-info-copy">
            {hospital.holiday_notice ? <p>*{hospital.holiday_notice}</p> : null}
            {hours.length > 0 ? (
              hours.map((line) => <p key={line}>{line}</p>)
            ) : (
              <p className="partner-info-placeholder">운영시간을 등록해주세요.</p>
            )}
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
          <h2>
            병원위치
            <button type="button" onClick={() => openMode('location')} style={{ marginLeft: 'auto', fontSize: 13, color: '#8037FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>수정</button>
          </h2>
          <div className="partner-map-card" style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, height: 180 }}>
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
            {address && (
              <button type="button" aria-label="지도 열기" onClick={openMap} style={{ position: 'absolute', top: 8, right: 8, background: 'white', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                <img src="/partner-template/expand.svg" alt="" style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
          {address ? (
            <p className="partner-info-description">{address}</p>
          ) : (
            <p className="partner-info-placeholder">주소를 등록해주세요.</p>
          )}
          {hospital.address_detail ? (
            <p className="partner-info-description">{hospital.address_detail}</p>
          ) : null}
        </section>
      </section>

      {uploadingTarget === 'logo' && <p className="partner-upload-status floating">업로드 중...</p>}
      {renderPhotoMenu()}
    </div>
  );
}
