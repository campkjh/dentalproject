'use client';

// 병원 신청 — 프리티풀 파트너 신청(RegisterKit) 결: 한 화면 한 질문 · 진행 막대 N/전체 · 리스트 · 선택 카드 · 스위치 · 아래 큰 버튼.
//  · 흐름 두 갈래(261102): 병원 등록 8단계 / 원장 등록 6단계 = 기존 병원을 찾아 골라 그 병원에 소속을 요청(병원 대표가 수락).
//  · 과는 고르면 바로 다음 · 과·진료과목은 리스트(과는 검색, 진료과목은 전체 선택) · 머리 = 뒤로 + 홈.
//  · 중간저장(localStorage hospitalRegisterDraft)·제출(/api/hospital-applications) — 원장 등록은 doctorInfo.hospitalId 로 보낸다.
//  · 부품 = components/hospital-register(RegisterKit · HospitalPicker · 약관 시트 · 서류 올리기), 약관 문안 = agreements.ts.
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { haptic } from '@/lib/haptics';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  RegisterShell,
  RgCheck,
  RgCta,
  RgEmpty,
  RgField,
  RgHeaderButton,
  RgList,
  RgNote,
  RgOption,
  RgRow,
  RgRowMark,
  RgRows,
  RgSearch,
  RgToggle,
  rgCx as cx,
  rgStyles as s,
} from '@/components/hospital-register/RegisterKit';
import { agreementItems, type AgreementItem } from '@/components/hospital-register/agreements';
import { AgreementSheet, SequentialAgreeFlow } from '@/components/hospital-register/AgreementSheets';
import { DocUploadRow, ProfilePhotoUploader } from '@/components/hospital-register/Uploaders';
import HospitalPicker, { hospitalImageFallback, type PickedHospital } from '@/components/hospital-register/HospitalPicker';
import AddressSearchSheet from '@/components/common/AddressSearchSheet';
import {
  defaultTreatments,
  formatBiznum,
  formatPhone,
  treatmentsBySpecialty,
} from '@/components/hospital-register/register-data';

type StepKey = 'specialty' | 'treatments' | 'type' | 'address' | 'agree' | 'info' | 'hours' | 'owner' | 'hospital' | 'doctor';

// 등록 유형을 고르기 전(1~3단계)은 두 흐름이 같다
const HOSPITAL_FLOW: StepKey[] = ['specialty', 'treatments', 'type', 'address', 'agree', 'info', 'hours', 'owner'];
const DOCTOR_FLOW: StepKey[] = ['specialty', 'treatments', 'type', 'hospital', 'agree', 'doctor'];

// 주소를 고른 뒤 시트가 내려가고 나서 상세 주소 칸에 커서
const LEAVE_FOCUS_MS = 320;
// 과를 고르고 체크가 보인 뒤 다음 단계로
const PICK_ADVANCE_MS = 260;

/** 단계별 제목 — 위 작은 파란 글씨 · 큰 제목 · 회색 한 줄 */
const STEP_META: Record<StepKey, { eyebrow: string; title: string; sub: string }> = {
  specialty: { eyebrow: '과 선택', title: '어떤 과에 해당하시나요?', sub: '해당하는 과를 하나 골라 주세요.' },
  treatments: { eyebrow: '진료과목', title: '진료과목을 골라 주세요', sub: '여러 개 고를 수 있어요.' },
  type: { eyebrow: '등록 유형', title: '어떻게 등록할까요?', sub: '병원을 새로 등록하거나, 기존 병원에 원장으로 등록할 수 있어요.' },
  address: { eyebrow: '병원 주소', title: '병원 주소를 알려 주세요', sub: '환자에게 보이는 위치 정보예요.' },
  agree: { eyebrow: '약관 동의', title: '약관에 동의해 주세요', sub: '서비스 이용을 위해 약관 동의가 필요해요.' },
  info: { eyebrow: '병원 기본정보', title: '병원 기본정보를 입력해 주세요', sub: '환자에게 보이는 정보예요. 정확히 입력해 주세요.' },
  hours: { eyebrow: '운영시간', title: '운영시간을 알려 주세요', sub: '요일마다 진료 여부와 시간을 정해요.' },
  owner: { eyebrow: '대표 원장 정보', title: '원장 정보를 입력해 주세요', sub: '자격 서류는 앞에서 첨부했어요. 환자에게 보일 기본 정보만 입력해 주세요.' },
  hospital: { eyebrow: '소속 병원', title: '어느 병원에 소속되시나요?', sub: '병원을 찾아 고르면 그 병원에 원장 등록을 요청해요.' },
  doctor: { eyebrow: '원장 정보', title: '원장 정보를 입력해 주세요', sub: '병원에서 요청을 확인할 때 보는 정보예요.' },
};

// 검색 비교용 — 띄어쓰기·대소문자 무시
const squash = (v: string) => v.toLowerCase().replace(/\s+/g, '');

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
  // 원장 등록 — 병원 찾기 검색어(병원 새로 등록으로 넘어가면 병원명에 미리 채움) · 고른 병원
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [targetHospital, setTargetHospital] = useState<PickedHospital | null>(null);
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [done, setDone] = useState(false);
  const flow = registerType === 'doctor' ? DOCTOR_FLOW : HOSPITAL_FLOW;
  const total = flow.length;
  const stepKey = flow[Math.min(step, total) - 1];
  // 주소 검색 시트(다음 우편번호를 시트 안에) · 고르면 상세 주소 칸으로
  const [addrOpen, setAddrOpen] = useState(false);
  const addrDetailRef = useRef<HTMLInputElement>(null);

  // 검색어를 들고 들어왔으면 병원 기본정보 병원명에 미리 채운다
  useEffect(() => {
    if (stepKey === 'info' && hospitalSearch.trim() && !hospitalInfo.name) {
      setHospitalInfo((prev) => ({ ...prev, name: hospitalSearch.trim() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  // 과를 고르면 잠깐 체크를 보여 주고 다음 단계로
  const advanceTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);
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
      if (d.targetHospital?.id) setTargetHospital(d.targetHospital);
      if (Array.isArray(d.agreements)) setAgreements(new Set(d.agreements));
      if (d.hospitalInfo) setHospitalInfo(d.hospitalInfo);
      if (Array.isArray(d.operatingHours)) setOperatingHours(d.operatingHours);
      if (d.doctorInfo) setDoctorInfo(d.doctorInfo);
      if (d.documents && typeof d.documents === 'object') setDocuments(d.documents);
    } catch {}
  }, []);

  const saveDraft = (message = '입력한 내용이 저장되었습니다.') => {
    try {
      const payload = {
        step,
        selectedSpecialty,
        selectedTreatments: Array.from(selectedTreatments),
        registerType,
        hospitalSearch,
        targetHospital,
        agreements: Array.from(agreements),
        hospitalInfo,
        operatingHours,
        doctorInfo,
        documents,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('hospitalRegisterDraft', JSON.stringify(payload));
      showToast(message);
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleNext = () => {
    if (step < total) setStep(step + 1);
  };

  // 홈 — 고른 게 있으면 중간저장해 두고 나간다(다시 들어오면 이어서)
  const goHome = () => {
    window.clearTimeout(advanceTimer.current);
    if (selectedSpecialty) saveDraft('입력한 내용은 중간저장해 뒀어요.');
    router.push('/');
  };

  const pickSpecialty = (id: string) => {
    if (advanceTimer.current) return;
    if (id !== selectedSpecialty) {
      setSelectedSpecialty(id);
      setSelectedTreatments(new Set());
    }
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = 0;
      setStep(2);
    }, PICK_ADVANCE_MS);
  };

  // 찾는 병원이 없을 때 — 병원 등록 흐름의 주소 단계로 건너간다
  const switchToNewHospital = () => {
    haptic('light');
    setRegisterType('hospital');
    setTargetHospital(null);
    setStep(HOSPITAL_FLOW.indexOf('address') + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const treatmentList = (selectedSpecialty && treatmentsBySpecialty[selectedSpecialty]) || defaultTreatments;
  const allTreatmentsOn = treatmentList.every((t) => selectedTreatments.has(t));
  const toggleAllTreatments = () => {
    setSelectedTreatments(allTreatmentsOn ? new Set() : new Set(treatmentList));
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
    switch (stepKey) {
      case 'specialty':
        return !!selectedSpecialty;
      case 'treatments':
        return selectedTreatments.size > 0;
      case 'type':
        return !!registerType;
      case 'address':
        return !!(hospitalInfo.postalCode && hospitalInfo.address);
      case 'agree':
        return allRequiredAgreed;
      case 'info':
        return !!(hospitalInfo.name && hospitalInfo.ownerName && hospitalInfo.phone && hospitalInfo.businessNumber);
      case 'hours':
      case 'owner':
        return true;
      case 'hospital':
        return !!targetHospital;
      case 'doctor':
        return !!(doctorInfo.name.trim() && doctorInfo.profileImage && documents['의사 면허증']);
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
            hospitalId: registerType === 'doctor' ? targetHospital?.id ?? '' : undefined,
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
      setDone(true);
    } catch {
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (stepKey) {
      case 'specialty': {
        // 과 이름 또는 그 과의 진료(예: 임플란트 → 치과)로 찾는다
        const q = squash(specialtyQuery);
        const rows = specialties.flatMap((sp) => {
          if (!q || squash(sp.name).includes(q)) return [{ sp, hit: '' }];
          const hit = (treatmentsBySpecialty[sp.id] ?? []).find((t) => squash(t).includes(q));
          return hit ? [{ sp, hit }] : [];
        });
        return (
          <div>
            <RgSearch value={specialtyQuery} onChange={setSpecialtyQuery} placeholder="과 이름이나 진료로 찾기" />
            {rows.length ? (
              <RgRows role="radiogroup" label="과">
                {rows.map(({ sp, hit }) => {
                  const on = selectedSpecialty === sp.id;
                  return (
                    <RgRow
                      key={sp.id}
                      on={on}
                      onClick={() => pickSpecialty(sp.id)}
                      // eslint-disable-next-line @next/next/no-img-element
                      lead={<span className={s.rowIcon}><img src={sp.icon} alt="" /></span>}
                      label={sp.name}
                      sub={hit || undefined}
                      trail={<RgRowMark on={on} />}
                    />
                  );
                })}
              </RgRows>
            ) : (
              <RgEmpty title={`‘${specialtyQuery.trim()}’에 맞는 과가 없어요`} desc="다른 말로 찾아 보세요." />
            )}
          </div>
        );
      }

      case 'treatments':
        return (
          <RgRows label="진료과목">
            <RgRow
              role="checkbox"
              strong
              on={allTreatmentsOn}
              onClick={toggleAllTreatments}
              lead={<RgCheck on={allTreatmentsOn} />}
              label="전체 선택"
              trail={
                <span className={s.rowCount}>
                  <b>{selectedTreatments.size}</b> / {treatmentList.length}
                </span>
              }
            />
            <div className={s.rowsGap} aria-hidden="true" />
            {treatmentList.map((t) => {
              const on = selectedTreatments.has(t);
              return <RgRow key={t} role="checkbox" on={on} onClick={() => toggleTreatment(t)} lead={<RgCheck on={on} />} label={t} />;
            })}
          </RgRows>
        );

      case 'type':
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
              hint="마이닥에 있는 병원을 찾아 소속을 요청해요"
            />
          </RgList>
        );

      case 'hospital':
        return (
          <HospitalPicker
            category={selectedSpecialty}
            categoryName={specialties.find((c) => c.id === selectedSpecialty)?.name ?? ''}
            query={hospitalSearch}
            onQuery={setHospitalSearch}
            picked={targetHospital}
            onPick={setTargetHospital}
            onRegisterNew={switchToNewHospital}
          />
        );

      case 'doctor':
        return (
          <div>
            {targetHospital && (
              <div className={s.picked}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={targetHospital.image} alt="" onError={hospitalImageFallback} className={s.rowThumb} />
                <span className={s.pickedT}>
                  <span className={s.pickedEyebrow}>요청할 병원</span>
                  <span className={s.pickedName}>{targetHospital.name}</span>
                </span>
              </div>
            )}
            <ProfilePhotoUploader value={doctorInfo.profileImage} onChange={(url) => setDoctorInfo((prev) => ({ ...prev, profileImage: url }))} />
            <RgField label="원장명" required>
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
            <RgField label="자격 서류" hint="PDF · JPG · PNG (각 10MB 이하)">
              <RgList>
                <DocUploadRow title="의사 면허증" desc="보건복지부 발급, 본인 명의" required value={documents['의사 면허증'] ?? ''} onChange={setDoc('의사 면허증')} />
                <DocUploadRow title="전문의 자격증" desc="해당 진료과 전문의일 때" value={documents['전문의 자격증'] ?? ''} onChange={setDoc('전문의 자격증')} />
              </RgList>
              <RgNote>병원 대표 원장이 요청을 확인하고 수락하면 그 병원 소속 원장으로 등록돼요. 서류는 자격 확인 외에 쓰지 않아요.</RgNote>
            </RgField>
          </div>
        );

      case 'address':
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
                  onClick={() => setAddrOpen(true)}
                />
                <button type="button" onClick={() => setAddrOpen(true)} className={s.smallBtn}>
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
                ref={addrDetailRef}
                placeholder="건물명, 동·호수 등"
                className="qd-input"
              />
            </RgField>
          </div>
        );

      case 'agree':
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

      case 'info':
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

      case 'hours':
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

      case 'owner':
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

  // 완료 화면 — 원장 등록은 병원이 수락하기 전이라 홈으로
  if (done && registerType === 'doctor') {
    return (
      <RegisterShell showBack={false} cta={<RgCta onClick={() => router.push('/')}>홈으로</RgCta>}>
        <div className="flex min-h-full flex-col items-center justify-center pb-10 pt-16 text-center">
          <span className={s.doneIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="qd-a-title m-0 text-[24px] font-semibold leading-[1.4] tracking-[-0.4px] text-[#191F28]">원장 등록을 요청했어요</h1>
          <p className="qd-a-sub m-0 mt-2.5 text-[15px] leading-[1.6] text-[#8B95A1]">
            {targetHospital?.name ?? '병원'}에서 요청을 수락하면
            <br />
            알림으로 알려드릴게요.
          </p>
        </div>
      </RegisterShell>
    );
  }
  if (done) {
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

  const meta = STEP_META[stepKey];
  const isLast = step >= total;
  return (
    <>
      <RegisterShell
        step={Math.min(step, total)}
        total={total}
        eyebrow={meta?.eyebrow}
        title={meta?.title}
        sub={meta?.sub}
        onBack={handleBack}
        onHome={goHome}
        right={<RgHeaderButton onClick={() => saveDraft()}>중간저장</RgHeaderButton>}
        cta={
          <RgCta
            disabled={!canProceed() || submitting}
            onClick={() => {
              if (isLast) void submit();
              else handleNext();
            }}
          >
            {submitting ? '제출 중…' : isLast ? (registerType === 'doctor' ? '원장 등록 요청하기' : '완료') : '다음'}
          </RgCta>
        }
      >
        {renderStep()}
      </RegisterShell>

      {addrOpen && (
        <AddressSearchSheet
          initialQuery={hospitalInfo.address}
          onSelect={(data) => {
            setHospitalInfo((prev) => ({ ...prev, postalCode: data.zonecode, address: data.address }));
            window.setTimeout(() => addrDetailRef.current?.focus(), LEAVE_FOCUS_MS);
          }}
          onClose={() => setAddrOpen(false)}
        />
      )}

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
