'use client';

// 병원 신청 — 프리티풀 파트너 신청(RegisterKit) 결: 한 화면 한 질문 · 진행 막대 N/8 · 선택 카드 · 칩 · 스위치 · 아래 큰 버튼.
//  · 단계·입력 항목·검증(canProceed)·중간저장(localStorage hospitalRegisterDraft)·제출(/api/hospital-applications)은 옛 화면 그대로.
//  · 부품 = components/hospital-register(RegisterKit · 약관 시트 · 서류 올리기), 약관 문안 = agreements.ts.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  RegisterShell,
  RgCheck,
  RgChip,
  RgChips,
  RgCta,
  RgField,
  RgHeaderButton,
  RgList,
  RgNote,
  RgOption,
  RgTile,
  RgTiles,
  RgToggle,
  rgCx as cx,
  rgStyles as s,
} from '@/components/hospital-register/RegisterKit';
import { agreementItems, type AgreementItem } from '@/components/hospital-register/agreements';
import { AgreementSheet, SequentialAgreeFlow } from '@/components/hospital-register/AgreementSheets';
import { DocUploadRow, ProfilePhotoUploader } from '@/components/hospital-register/Uploaders';
import {
  defaultTreatments,
  formatBiznum,
  formatPhone,
  openPostcode,
  treatmentsBySpecialty,
} from '@/components/hospital-register/register-data';

const TOTAL_STEPS = 8;

/** 단계별 제목 — 위 작은 파란 글씨 · 큰 제목 · 회색 한 줄 */
const STEP_META: Record<number, { eyebrow: string; title: string; sub: string }> = {
  1: { eyebrow: '과 선택', title: '어떤 과에 해당하시나요?', sub: '해당하는 과를 하나 골라 주세요.' },
  2: { eyebrow: '진료과목', title: '진료과목을 골라 주세요', sub: '여러 개 고를 수 있어요.' },
  3: { eyebrow: '등록 유형', title: '어떻게 등록할까요?', sub: '병원을 새로 등록하거나, 기존 병원에 원장으로 등록할 수 있어요.' },
  4: { eyebrow: '병원 주소', title: '병원 주소를 알려 주세요', sub: '환자에게 보이는 위치 정보예요.' },
  5: { eyebrow: '약관 동의', title: '약관에 동의해 주세요', sub: '서비스 이용을 위해 약관 동의가 필요해요.' },
  6: { eyebrow: '병원 기본정보', title: '병원 기본정보를 입력해 주세요', sub: '환자에게 보이는 정보예요. 정확히 입력해 주세요.' },
  7: { eyebrow: '운영시간', title: '운영시간을 알려 주세요', sub: '요일마다 진료 여부와 시간을 정해요.' },
  8: { eyebrow: '대표 원장 정보', title: '원장 정보를 입력해 주세요', sub: '자격 서류는 앞에서 첨부했어요. 환자에게 보일 기본 정보만 입력해 주세요.' },
};

const REQUIRED_DOCS = [
  { title: '사업자등록증', desc: '국세청 발급, 의료기관 명의' },
  { title: '의료기관 개설신고증', desc: '의료법 제33조 · 관할 보건소 발급' },
  { title: '의사 면허증', desc: '보건복지부 발급, 대표자 명의' },
  { title: '대표자 신분증 사본', desc: '주민등록증 또는 운전면허증' },
];

const OPTIONAL_DOCS = [
  { title: '전문의 자격증', desc: '대표 원장 전문의 자격 (해당 진료과)' },
  { title: '의료기관 대표자 인감증명서', desc: '3개월 이내 발급, 직인 대신 제출 가능' },
  { title: '의료광고 사전심의 필증', desc: '의료법 제57조 · 의사회 심의 필증' },
  { title: '법인 등기부등본', desc: '의료법인·상법법인일 때' },
  { title: '진료과목별 전문의 자격증', desc: '복수 전문의 운영 시 첨부' },
];

export default function HospitalRegisterPage() {
  const router = useRouter();
  const { showToast, categories } = useStore();
  const specialties = categories;
  const { authUser } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(new Set());
  const [registerType, setRegisterType] = useState<'hospital' | 'doctor' | null>(null);
  const [hospitalSearch, setHospitalSearch] = useState('');

  // 검색어를 들고 들어왔으면 6단계 병원명에 미리 채운다
  useEffect(() => {
    if (step === 6 && hospitalSearch && !hospitalInfo.name) {
      setHospitalInfo((prev) => ({ ...prev, name: hospitalSearch }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const [agreements, setAgreements] = useState<Set<string>>(new Set());
  const [viewingAgreement, setViewingAgreement] = useState<AgreementItem | null>(null);
  const [hospitalInfo, setHospitalInfo] = useState({
    name: '',
    ownerName: '',
    phone: '',
    businessNumber: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    logoUrl: '',
  });
  const [operatingHours, setOperatingHours] = useState(
    ['월', '화', '수', '목', '금', '토'].map((day) => ({
      day,
      start: '10:00',
      end: '19:00',
      closed: day === '토',
    }))
  );
  const [doctorInfo, setDoctorInfo] = useState({
    name: '',
    specialty: '',
    licenseNumber: '',
    profileImage: '',
  });
  const [documents, setDocuments] = useState<Record<string, string>>({});

  // 들어올 때 중간저장 되살리기
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem('hospitalRegisterDraft');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.step) setStep(d.step);
      if (d.selectedSpecialty) setSelectedSpecialty(d.selectedSpecialty);
      if (Array.isArray(d.selectedTreatments)) setSelectedTreatments(new Set(d.selectedTreatments));
      if (d.registerType) setRegisterType(d.registerType);
      if (typeof d.hospitalSearch === 'string') setHospitalSearch(d.hospitalSearch);
      if (Array.isArray(d.agreements)) setAgreements(new Set(d.agreements));
      if (d.hospitalInfo) setHospitalInfo(d.hospitalInfo);
      if (Array.isArray(d.operatingHours)) setOperatingHours(d.operatingHours);
      if (d.doctorInfo) setDoctorInfo(d.doctorInfo);
      if (d.documents && typeof d.documents === 'object') setDocuments(d.documents);
    } catch {}
  }, []);

  const saveDraft = () => {
    try {
      const payload = {
        step,
        selectedSpecialty,
        selectedTreatments: Array.from(selectedTreatments),
        registerType,
        hospitalSearch,
        agreements: Array.from(agreements),
        hospitalInfo,
        operatingHours,
        doctorInfo,
        documents,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('hospitalRegisterDraft', JSON.stringify(payload));
      showToast('입력한 내용이 저장되었습니다.');
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const toggleTreatment = (t: string) => {
    setSelectedTreatments((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const [showAgreeFlow, setShowAgreeFlow] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const nonAllItems = agreementItems.filter((a) => !a.isAll);
  const allChecked = nonAllItems.every((a) => agreements.has(a.id));

  const toggleAgreement = (id: string) => {
    if (id === 'all') {
      if (allChecked) {
        setAgreements(new Set());
        setSignatureDataUrl(null);
      } else {
        // 바로 켜지 않고 한 장씩 읽고 동의하는 흐름을 연다
        setShowAgreeFlow(true);
      }
    } else {
      setAgreements((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const allRequiredAgreed = agreementItems.filter((a) => a.required).every((a) => agreements.has(a.id));

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!selectedSpecialty;
      case 2:
        return selectedTreatments.size > 0;
      case 3:
        return !!registerType;
      case 4:
        return !!(hospitalInfo.postalCode && hospitalInfo.address);
      case 5:
        return allRequiredAgreed;
      case 6:
        return !!(hospitalInfo.name && hospitalInfo.ownerName && hospitalInfo.phone && hospitalInfo.businessNumber);
      case 7:
        return true;
      case 8:
        return true;
      default:
        return false;
    }
  };

  const setDoc = (title: string) => (url: string) =>
    setDocuments((prev) => {
      if (!url) {
        const next = { ...prev };
        delete next[title];
        return next;
      }
      return { ...prev, [title]: url };
    });

  const submit = async () => {
    if (!authUser) {
      showToast('로그인 후 신청이 가능합니다.');
      router.push('/login');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hospital-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerType,
          specialty: selectedSpecialty,
          treatments: Array.from(selectedTreatments),
          hospitalInfo,
          operatingHours,
          doctorInfo: {
            ...doctorInfo,
            licenseImage: documents['의사 면허증'] || '',
            certificationImage: documents['전문의 자격증'] || '',
          },
          documents,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        showToast(j.error || '신청에 실패했습니다.');
        return;
      }
      try {
        localStorage.removeItem('hospitalRegisterDraft');
      } catch {}
      setStep(TOTAL_STEPS + 1);
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <RgTiles>
            {specialties.map((sp) => (
              <RgTile
                key={sp.id}
                on={selectedSpecialty === sp.id}
                onClick={() => {
                  setSelectedSpecialty(sp.id);
                  setSelectedTreatments(new Set());
                }}
                // eslint-disable-next-line @next/next/no-img-element
                icon={<img src={sp.icon} alt="" className="h-8 w-8" />}
                label={sp.name}
              />
            ))}
          </RgTiles>
        );

      case 2: {
        const list = selectedSpecialty ? treatmentsBySpecialty[selectedSpecialty] ?? defaultTreatments : defaultTreatments;
        return (
          <>
            <RgChips>
              {list.map((t) => (
                <RgChip key={t} on={selectedTreatments.has(t)} onClick={() => toggleTreatment(t)}>
                  {t}
                </RgChip>
              ))}
            </RgChips>
            {selectedTreatments.size > 0 && (
              <p className={s.hint} style={{ marginTop: 16 }}>
                <b className="font-semibold text-[#3180F7]">{selectedTreatments.size}개</b> 골랐어요
              </p>
            )}
          </>
        );
      }

      case 3:
        return (
          <RgList>
            <RgOption
              role="radio"
              on={registerType === 'hospital'}
              onClick={() => setRegisterType('hospital')}
              label="병원 등록"
              hint="새 병원을 등록하고 관리해요"
            />
            <RgOption
              role="radio"
              on={registerType === 'doctor'}
              onClick={() => setRegisterType('doctor')}
              label="원장 등록"
              hint="기존 병원에 원장으로 등록을 요청해요"
            />
          </RgList>
        );

      case 4:
        return (
          <div>
            <RgField label="우편번호">
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={hospitalInfo.postalCode}
                  readOnly
                  placeholder="우편번호"
                  className="qd-input min-w-0 flex-1 cursor-pointer"
                  onClick={() => openPostcode(setHospitalInfo)}
                />
                <button type="button" onClick={() => openPostcode(setHospitalInfo)} className={s.smallBtn}>
                  주소 검색
                </button>
              </div>
            </RgField>
            <RgField label="기본 주소">
              <input
                type="text"
                value={hospitalInfo.address}
                onChange={(e) => setHospitalInfo((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="주소 검색으로 입력해 주세요"
                className="qd-input"
              />
            </RgField>
            <RgField label="상세 주소" hint="선택 사항이에요.">
              <input
                type="text"
                value={hospitalInfo.addressDetail}
                onChange={(e) => setHospitalInfo((prev) => ({ ...prev, addressDetail: e.target.value }))}
                placeholder="건물명, 동·호수 등"
                className="qd-input"
              />
            </RgField>
          </div>
        );

      case 5:
        return (
          <div>
            <RgOption on={allChecked} onClick={() => toggleAgreement('all')} label="모두 동의합니다" hint="필수 약관을 한 장씩 읽고 서명해요" />
            <div className="mt-3 flex flex-col">
              {nonAllItems.map((item) => {
                const on = agreements.has(item.id);
                return (
                  <div key={item.id} className="flex min-h-[48px] items-center gap-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleAgreement(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-[20px] text-left"
                    >
                      <RgCheck on={on} small />
                      <span className={cx('min-w-0 flex-1 text-[15px] leading-[1.45]', on ? 'text-[#191F28]' : 'text-[#4E5968]')}>
                        {item.label}
                      </span>
                    </button>
                    {item.body && (
                      <button
                        type="button"
                        onClick={() => setViewingAgreement(item)}
                        className="flex-none rounded-[8px] px-2 py-1.5 text-[13px] font-medium text-[#8B95A1] underline underline-offset-2 active:bg-[#F2F4F6]"
                        aria-label={`${item.label} 전문 보기`}
                      >
                        보기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <RgField label="병원명" required>
              <input
                type="text"
                value={hospitalInfo.name}
                onChange={(e) => setHospitalInfo((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="병원명을 입력해 주세요"
                className="qd-input"
              />
            </RgField>
            <RgField label="대표자명" required hint={<span className="block text-right">최대 5자 · {hospitalInfo.ownerName.length}/5</span>}>
              <input
                type="text"
                value={hospitalInfo.ownerName}
                maxLength={5}
                onChange={(e) => setHospitalInfo((prev) => ({ ...prev, ownerName: e.target.value.slice(0, 5) }))}
                placeholder="대표자명을 입력해 주세요"
                className="qd-input"
              />
            </RgField>
            <RgField label="전화번호" required>
              <input
                type="tel"
                inputMode="numeric"
                value={hospitalInfo.phone}
                onChange={(e) => setHospitalInfo((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
                placeholder="010 1234 5678"
                className="qd-input"
              />
            </RgField>
            <RgField label="사업자등록번호" required>
              <input
                type="text"
                inputMode="numeric"
                value={hospitalInfo.businessNumber}
                onChange={(e) => setHospitalInfo((prev) => ({ ...prev, businessNumber: formatBiznum(e.target.value) }))}
                placeholder="574 17 02394"
                className="qd-input"
              />
            </RgField>

            {/* 서류 첨부 — 의료법 관련 필수·선택 서류 */}
            <RgField label="필수 서류" hint="PDF · JPG · PNG (각 10MB 이하)">
              <RgList>
                {REQUIRED_DOCS.map((doc) => (
                  <DocUploadRow key={doc.title} title={doc.title} desc={doc.desc} required value={documents[doc.title] ?? ''} onChange={setDoc(doc.title)} />
                ))}
              </RgList>
            </RgField>
            <RgField label="선택 서류">
              <RgList>
                {OPTIONAL_DOCS.map((doc) => (
                  <DocUploadRow key={doc.title} title={doc.title} desc={doc.desc} value={documents[doc.title] ?? ''} onChange={setDoc(doc.title)} />
                ))}
              </RgList>
              <RgNote>
                의료법 제33조, 제57조 및 관련 고시에 따라 의료기관 운영 자격을 확인하기 위해 위 서류가 필요해요. 제출된 서류는 심사 목적 외에 쓰지 않으며 승인 뒤 안전하게 파기돼요.
              </RgNote>
            </RgField>
          </div>
        );

      case 7:
        return (
          <RgList>
            {operatingHours.map((oh, idx) => (
              <div key={oh.day} className={s.dayCard} style={!oh.closed ? { borderColor: '#C9DDFD' } : undefined}>
                <RgToggle
                  checked={!oh.closed}
                  onChange={(open) => {
                    const updated = [...operatingHours];
                    updated[idx] = { ...oh, closed: !open };
                    setOperatingHours(updated);
                  }}
                  label={`${oh.day}요일`}
                  hint={oh.closed ? '휴진' : `${oh.start} ~ ${oh.end}`}
                />
                {!oh.closed && (
                  <div className={s.dayTimes}>
                    <input
                      type="time"
                      aria-label={`${oh.day}요일 시작 시간`}
                      value={oh.start}
                      onChange={(e) => {
                        const updated = [...operatingHours];
                        updated[idx] = { ...oh, start: e.target.value };
                        setOperatingHours(updated);
                      }}
                      className={s.time}
                    />
                    <span className="text-[#B0B8C1]">~</span>
                    <input
                      type="time"
                      aria-label={`${oh.day}요일 끝 시간`}
                      value={oh.end}
                      onChange={(e) => {
                        const updated = [...operatingHours];
                        updated[idx] = { ...oh, end: e.target.value };
                        setOperatingHours(updated);
                      }}
                      className={s.time}
                    />
                  </div>
                )}
              </div>
            ))}
          </RgList>
        );

      case 8:
        return (
          <div>
            <ProfilePhotoUploader value={doctorInfo.profileImage} onChange={(url) => setDoctorInfo((prev) => ({ ...prev, profileImage: url }))} />
            <RgField label="원장명">
              <input
                type="text"
                value={doctorInfo.name}
                onChange={(e) => setDoctorInfo((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="원장명을 입력해 주세요"
                className="qd-input"
              />
            </RgField>
            <RgField label="전문분야" hint="선택 사항이에요.">
              <input
                type="text"
                value={doctorInfo.specialty}
                onChange={(e) => setDoctorInfo((prev) => ({ ...prev, specialty: e.target.value }))}
                placeholder="예) 임플란트, 보철"
                className="qd-input"
              />
            </RgField>
          </div>
        );

      default:
        return null;
    }
  };

  // 완료 화면
  if (step > TOTAL_STEPS) {
    return (
      <RegisterShell showBack={false} cta={<RgCta onClick={() => router.push('/partner')}>시작하기</RgCta>}>
        <div className="flex min-h-full flex-col items-center justify-center pb-10 pt-16 text-center">
          <span className={s.doneIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="qd-a-title m-0 text-[24px] font-semibold leading-[1.4] tracking-[-0.4px] text-[#191F28]">회원가입을 축하해요!</h1>
          <p className="qd-a-sub m-0 mt-2.5 text-[15px] leading-[1.6] text-[#8B95A1]">
            병원 등록이 완료되었습니다.
            <br />
            심사 후 승인이 완료되면 알려드릴게요.
          </p>
        </div>
      </RegisterShell>
    );
  }

  const meta = STEP_META[step];
  return (
    <>
      <RegisterShell
        step={step}
        total={TOTAL_STEPS}
        eyebrow={meta?.eyebrow}
        title={meta?.title}
        sub={meta?.sub}
        onBack={handleBack}
        right={<RgHeaderButton onClick={saveDraft}>중간저장</RgHeaderButton>}
        cta={
          <RgCta
            disabled={!canProceed() || submitting}
            onClick={() => {
              if (step === TOTAL_STEPS) void submit();
              else handleNext();
            }}
          >
            {submitting ? '제출 중…' : step === TOTAL_STEPS ? '완료' : '다음'}
          </RgCta>
        }
      >
        {renderStep()}
      </RegisterShell>

      {/* 약관 한 장 보기 */}
      {viewingAgreement && (
        <AgreementSheet
          item={viewingAgreement}
          onClose={() => setViewingAgreement(null)}
          onAgree={() => {
            setAgreements((prev) => new Set(prev).add(viewingAgreement.id));
            setViewingAgreement(null);
          }}
        />
      )}

      {/* '모두 동의' — 차례로 읽고 서명 */}
      {showAgreeFlow && (
        <SequentialAgreeFlow
          items={nonAllItems}
          existingSignature={signatureDataUrl}
          onClose={() => setShowAgreeFlow(false)}
          onComplete={(signedIds, sigUrl) => {
            setAgreements(new Set(signedIds));
            setSignatureDataUrl(sigUrl);
            setShowAgreeFlow(false);
          }}
        />
      )}
    </>
  );
}
