'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Camera, ChevronLeft, Plane, Search } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';

type RegisterType = 'hospital' | 'doctor';
type Step = 'type' | 'hospital-info' | 'hospital-search' | 'doctor-info' | 'success';

type HospitalResult = {
  id: string;
  name: string;
  address?: string | null;
  location?: string | null;
};

type UploadKey = 'profileImage' | 'licenseImage' | 'certificationImage';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/avif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}

function formatBiznum(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
}

export default function HospitalRegisterPage() {
  const router = useRouter();
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('type');
  const [registerType, setRegisterType] = useState<RegisterType | null>(null);
  const [hospitalInfo, setHospitalInfo] = useState({
    name: '',
    ownerName: '',
    phone: '',
    businessNumber: '',
    address: '',
  });
  const [doctorInfo, setDoctorInfo] = useState({
    name: '',
    specialty: '',
    profileImage: '',
    licenseImage: '',
    certificationImage: '',
  });
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalResults, setHospitalResults] = useState<HospitalResult[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<UploadKey | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (registerType !== 'doctor' || hospitalSearch.trim().length === 0 || !hasSupabaseEnv()) {
      setHospitalResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const sb = createClient();
        const query = hospitalSearch.trim();
        const { data } = await sb
          .from('hospitals')
          .select('id, name, address, location')
          .eq('status', 'approved')
          .or(`name.ilike.%${query}%,address.ilike.%${query}%,location.ilike.%${query}%`)
          .limit(8);
        setHospitalResults((data ?? []) as HospitalResult[]);
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [hospitalSearch, registerType]);

  const pageTitle = useMemo(() => {
    if (step === 'type') return '병원/원장등록을 선택해주세요.';
    if (step === 'hospital-search') return '병원을 검색해주세요!';
    if (step === 'hospital-info') return '병원 정보를 입력해주세요';
    if (step === 'doctor-info') return '원장 정보';
    return '';
  }, [step]);

  const canSubmitDoctorInfo = Boolean(
    doctorInfo.name.trim() &&
    doctorInfo.profileImage &&
    doctorInfo.licenseImage &&
    (registerType === 'hospital' || selectedHospital)
  );

  const canSubmitHospitalInfo = Boolean(
    hospitalInfo.name.trim() &&
    hospitalInfo.ownerName.trim() &&
    hospitalInfo.phone.trim() &&
    hospitalInfo.businessNumber.trim()
  );

  const goBack = () => {
    if (step === 'type') {
      router.back();
      return;
    }
    if (step === 'hospital-search' || step === 'hospital-info') {
      setStep('type');
      return;
    }
    if (step === 'doctor-info') {
      setStep(registerType === 'doctor' ? 'hospital-search' : 'hospital-info');
      return;
    }
    router.push('/');
  };

  const chooseType = (type: RegisterType) => {
    setRegisterType(type);
    setStep(type === 'doctor' ? 'hospital-search' : 'hospital-info');
  };

  const handleImageUpload = async (key: UploadKey, file?: File | null) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      showToast('jpg, png, jpeg, avif 형식만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showToast('10mb 이하 이미지만 업로드할 수 있습니다.');
      return;
    }

    setUploadingKey(key);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('folder', 'doctor-applications');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('업로드 실패');
      const blob = await res.json();
      setDoctorInfo((current) => ({ ...current, [key]: blob.url }));
    } catch {
      showToast('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingKey(null);
    }
  };

  const openSubmitDialog = () => {
    if (!canSubmitDoctorInfo) {
      showToast('필수 정보를 모두 입력해 주세요.');
      return;
    }
    setShowSubmitDialog(true);
  };

  const submitApplication = async () => {
    if (!authUser) {
      showToast('로그인 후 신청이 가능합니다.');
      router.push('/login?mode=login');
      return;
    }
    if (!registerType) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/hospital-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerType,
          specialty: 'dental',
          treatments: [],
          hospitalInfo,
          doctorInfo: {
            ...doctorInfo,
            hospitalId: selectedHospital?.id,
          },
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '신청에 실패했습니다.');
        return;
      }
      setShowSubmitDialog(false);
      setStep('success');
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="hospital-signup-screen success">
        <main className="hospital-signup-success">
          <div className="hospital-signup-plane">
            <Plane size={66} strokeWidth={1.8} />
          </div>
          <h1>회원가입을 축하해요!</h1>
          <p>
            {registerType === 'doctor'
              ? '병원 관리자 승인 후 서비스를 이용하실 수 있어요'
              : '관리자 승인 후 서비스를 이용하실 수 있어요'}
          </p>
        </main>
        <button className="hospital-signup-bottom-button" type="button" onClick={() => router.push('/')}>
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="hospital-signup-screen">
      <button className="hospital-signup-back" type="button" onClick={goBack} aria-label="뒤로">
        <ChevronLeft size={34} strokeWidth={2.2} />
      </button>

      {step === 'type' && (
        <main className="hospital-signup-type">
          <div className="hospital-signup-symbol question">?</div>
          <h1>{pageTitle}</h1>
          <div className="hospital-signup-type-actions">
            <button type="button" className="secondary" onClick={() => chooseType('hospital')}>
              병원등록
            </button>
            <button type="button" className="primary" onClick={() => chooseType('doctor')}>
              원장등록
            </button>
          </div>
        </main>
      )}

      {step === 'hospital-search' && (
        <main className="hospital-signup-search">
          <div className="hospital-signup-symbol building">
            <Building2 size={42} strokeWidth={1.8} />
          </div>
          <h1>{pageTitle}</h1>
          <label className="hospital-signup-search-field">
            <Search size={22} />
            <input
              value={hospitalSearch}
              onChange={(event) => {
                setHospitalSearch(event.target.value);
                setSelectedHospital(null);
              }}
              placeholder="검색"
              autoFocus
            />
          </label>

          {hospitalSearch.trim().length > 0 && (
            <div className="hospital-signup-results">
              {searching ? (
                <p>검색 중...</p>
              ) : hospitalResults.length === 0 ? (
                <p>검색 결과가 없습니다</p>
              ) : (
                hospitalResults.map((hospital) => (
                  <button
                    key={hospital.id}
                    type="button"
                    onClick={() => {
                      setSelectedHospital(hospital);
                      setHospitalSearch(hospital.name);
                      setStep('doctor-info');
                    }}
                  >
                    <strong>{hospital.name}</strong>
                    {(hospital.address || hospital.location) && <span>{hospital.address || hospital.location}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </main>
      )}

      {step === 'hospital-info' && (
        <>
          <main className="hospital-signup-form">
            <h1>{pageTitle}</h1>
            <label className="hospital-signup-field">
              <span>[필수]병원명</span>
              <input
                value={hospitalInfo.name}
                onChange={(event) => setHospitalInfo((current) => ({ ...current, name: event.target.value }))}
                placeholder="참포도나무치과의원"
              />
            </label>
            <label className="hospital-signup-field">
              <span>[필수]대표자명</span>
              <input
                value={hospitalInfo.ownerName}
                onChange={(event) => setHospitalInfo((current) => ({ ...current, ownerName: event.target.value }))}
                placeholder="이양구"
              />
            </label>
            <label className="hospital-signup-field">
              <span>[필수]전화번호</span>
              <input
                value={hospitalInfo.phone}
                inputMode="numeric"
                onChange={(event) => setHospitalInfo((current) => ({ ...current, phone: formatPhone(event.target.value) }))}
                placeholder="010 1234 5678"
              />
            </label>
            <label className="hospital-signup-field">
              <span>[필수]사업자등록번호</span>
              <input
                value={hospitalInfo.businessNumber}
                inputMode="numeric"
                onChange={(event) => setHospitalInfo((current) => ({ ...current, businessNumber: formatBiznum(event.target.value) }))}
                placeholder="574 17 02394"
              />
            </label>
          </main>
          <button
            className="hospital-signup-bottom-button"
            type="button"
            disabled={!canSubmitHospitalInfo}
            onClick={() => {
              if (!canSubmitHospitalInfo) {
                showToast('병원 필수 정보를 입력해 주세요.');
                return;
              }
              setDoctorInfo((current) => ({
                ...current,
                name: current.name || hospitalInfo.ownerName,
              }));
              setStep('doctor-info');
            }}
          >
            다음으로
          </button>
        </>
      )}

      {step === 'doctor-info' && (
        <>
          <main className="hospital-signup-form doctor">
            <h1>{pageTitle}</h1>

            <section className="hospital-signup-photo-section">
              <h2>[필수]프로필사진</h2>
              <p>1:1규격의 jpg, png, jpeg, avif 10mb이하 이미지 파일</p>
              <button
                type="button"
                className={`hospital-signup-profile-upload ${doctorInfo.profileImage ? 'has-image' : ''}`}
                onClick={() => profileInputRef.current?.click()}
                disabled={uploadingKey === 'profileImage'}
                aria-label="프로필사진 첨부"
              >
                {doctorInfo.profileImage ? (
                  <img src={doctorInfo.profileImage} alt="" />
                ) : (
                  <Camera size={34} />
                )}
              </button>
              <input
                ref={profileInputRef}
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.avif,image/jpeg,image/png,image/avif"
                onChange={(event) => handleImageUpload('profileImage', event.target.files?.[0])}
              />
            </section>

            <label className="hospital-signup-field">
              <span>[필수]이름</span>
              <input
                value={doctorInfo.name}
                onChange={(event) => setDoctorInfo((current) => ({ ...current, name: event.target.value }))}
                placeholder="이양구"
              />
            </label>

            <label className="hospital-signup-field">
              <span>[선택]전문의 타이틀</span>
              <input
                value={doctorInfo.specialty}
                onChange={(event) => setDoctorInfo((current) => ({ ...current, specialty: event.target.value }))}
                placeholder="OOO과 전문의"
              />
            </label>

            {registerType === 'doctor' && selectedHospital && (
              <section className="hospital-signup-selected-hospital">
                <span>신청 병원</span>
                <strong>{selectedHospital.name}</strong>
              </section>
            )}

            <section className="hospital-signup-doc-section">
              <h2>증빙자료첨부</h2>
              <p>jpg, png, jpeg, avif 10mb이하의 이미지 파일</p>
              <div className="hospital-signup-doc-grid">
                <ProofUpload
                  label="[필수]의사면허"
                  image={doctorInfo.licenseImage}
                  disabled={uploadingKey === 'licenseImage'}
                  onClick={() => licenseInputRef.current?.click()}
                />
                <ProofUpload
                  label="[선택]전문의자격증"
                  image={doctorInfo.certificationImage}
                  disabled={uploadingKey === 'certificationImage'}
                  onClick={() => certInputRef.current?.click()}
                />
              </div>
              <input
                ref={licenseInputRef}
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.avif,image/jpeg,image/png,image/avif"
                onChange={(event) => handleImageUpload('licenseImage', event.target.files?.[0])}
              />
              <input
                ref={certInputRef}
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.avif,image/jpeg,image/png,image/avif"
                onChange={(event) => handleImageUpload('certificationImage', event.target.files?.[0])}
              />
            </section>
          </main>

          <button
            className="hospital-signup-bottom-button"
            type="button"
            disabled={!canSubmitDoctorInfo || Boolean(uploadingKey)}
            onClick={openSubmitDialog}
          >
            다음으로
          </button>
        </>
      )}

      {showSubmitDialog && (
        <div className="hospital-signup-dialog-layer" role="presentation" onClick={() => setShowSubmitDialog(false)}>
          <div className="hospital-signup-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="submit-title">정말로 프로필을 제출 하시겠습니까?</h2>
            <p>허위로 제출하실 시 제재가 있을 수 있습니다.</p>
            <div>
              <button type="button" className="confirm" onClick={submitApplication} disabled={submitting}>
                네
              </button>
              <button type="button" className="cancel" onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProofUpload({
  label,
  image,
  disabled,
  onClick,
}: {
  label: string;
  image: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="hospital-signup-proof">
      <button type="button" onClick={onClick} disabled={disabled} aria-label={`${label} 첨부`}>
        {image ? <img src={image} alt="" /> : <span />}
        <em>
          <Camera size={30} />
        </em>
      </button>
      <strong>{label}</strong>
    </div>
  );
}
