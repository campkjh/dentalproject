'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Eye,
  FileText,
  Plane,
  Search,
  Upload,
} from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

const TOTAL_STEPS = 8;

const specialties = [
  { id: 'dental', name: '치과', icon: '🦷' },
  { id: 'derma', name: '피부과', icon: '✨' },
  { id: 'plastic', name: '성형외과', icon: '💎' },
  { id: 'eye', name: '안과', icon: '👁' },
  { id: 'uro-ob', name: '비뇨/산부', icon: '🏥' },
  { id: 'health', name: '건강/심리', icon: '💚' },
];

const dentalTreatments = [
  '임플란트',
  '충치치료',
  '스케일링',
  '치아교정',
  '라미네이트',
  '미백',
  '잇몸치료',
  '사랑니발치',
  '턱관절치료',
  '소아치과',
  '보철치료',
  '치아성형',
];

const agreementItems = [
  { id: 'all', label: '모두 동의합니다.', isAll: true },
  { id: 'terms', label: '(필수) 서비스 이용약관', required: true },
  { id: 'privacy', label: '(필수) 개인정보 수집·이용 동의', required: true },
  { id: 'medical', label: '(필수) 의료정보 제공 동의', required: true },
  { id: 'marketing', label: '(선택) 마케팅 수신 동의', required: false },
];

export default function HospitalRegisterPage() {
  const router = useRouter();
  const { showToast } = useStore();

  const [step, setStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(
    new Set()
  );
  const [registerType, setRegisterType] = useState<'hospital' | 'doctor' | null>(
    null
  );
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [agreements, setAgreements] = useState<Set<string>>(new Set());
  const [hospitalInfo, setHospitalInfo] = useState({
    name: '',
    ownerName: '',
    phone: '',
    businessNumber: '',
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
  });

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const toggleTreatment = (t: string) => {
    setSelectedTreatments((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  };

  const toggleAgreement = (id: string) => {
    if (id === 'all') {
      const nonAllItems = agreementItems.filter((a) => !a.isAll);
      const allChecked = nonAllItems.every((a) => agreements.has(a.id));
      if (allChecked) {
        setAgreements(new Set());
      } else {
        setAgreements(new Set(nonAllItems.map((a) => a.id)));
      }
    } else {
      setAgreements((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const allRequiredAgreed = agreementItems
    .filter((a) => a.required)
    .every((a) => agreements.has(a.id));

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!selectedSpecialty;
      case 2:
        return selectedTreatments.size > 0;
      case 3:
        return !!registerType;
      case 4:
        return hospitalSearch.length > 0;
      case 5:
        return allRequiredAgreed;
      case 6:
        return !!(
          hospitalInfo.name &&
          hospitalInfo.ownerName &&
          hospitalInfo.phone &&
          hospitalInfo.businessNumber
        );
      case 7:
        return true;
      case 8:
        return true;
      default:
        return false;
    }
  };

  const getStepTitle = (): string => {
    switch (step) {
      case 1:
        return '과 선택';
      case 2:
        return '진료과목 선택';
      case 3:
        return '등록 유형 선택';
      case 4:
        return '병원 검색';
      case 5:
        return '약관 동의';
      case 6:
        return '병원 기본정보';
      case 7:
        return '운영시간 설정';
      case 8:
        return '원장 정보';
      default:
        return '';
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                어떤 과에 해당하시나요?
              </h2>
              <p className="text-sm text-gray-500">
                해당하는 과를 선택해주세요.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {specialties.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSpecialty(s.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                    selectedSpecialty === s.id
                      ? 'border-[#7C3AED] bg-[#EDE9FE]/30'
                      : 'border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span
                    className={`font-medium text-sm ${
                      selectedSpecialty === s.id
                        ? 'text-[#7C3AED]'
                        : 'text-gray-700'
                    }`}
                  >
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                진료과목을 선택해주세요
              </h2>
              <p className="text-sm text-gray-500">
                복수 선택이 가능합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {dentalTreatments.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTreatment(t)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTreatments.has(t)
                      ? 'bg-[#7C3AED] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                등록 유형을 선택해주세요
              </h2>
              <p className="text-sm text-gray-500">
                병원을 새로 등록하거나, 기존 병원에 원장으로 등록할 수 있습니다.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setRegisterType('hospital')}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  registerType === 'hospital'
                    ? 'border-[#7C3AED] bg-[#EDE9FE]/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900">
                      병원 등록
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      새 병원을 등록하고 관리합니다
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className={
                      registerType === 'hospital'
                        ? 'text-[#7C3AED]'
                        : 'text-gray-300'
                    }
                  />
                </div>
              </button>
              <button
                onClick={() => setRegisterType('doctor')}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  registerType === 'doctor'
                    ? 'border-[#7C3AED] bg-[#EDE9FE]/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900">
                      원장 등록
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      기존 병원에 원장으로 등록 요청합니다
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className={
                      registerType === 'doctor'
                        ? 'text-[#7C3AED]'
                        : 'text-gray-300'
                    }
                  />
                </div>
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                병원을 검색해주세요
              </h2>
              <p className="text-sm text-gray-500">
                등록하려는 병원을 검색합니다.
              </p>
            </div>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                placeholder="병원명을 입력해주세요"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
              />
            </div>

            {hospitalSearch.length > 0 && (
              <div className="space-y-2">
                <button
                  className="w-full p-3 rounded-xl border border-gray-200 text-left hover:border-[#7C3AED] transition-colors"
                >
                  <p className="font-medium text-sm text-gray-900">
                    참포도나무치과의원
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    서울 서초구 양재동 20-7
                  </p>
                </button>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-2">
                    원하는 병원이 없나요?
                  </p>
                  <button className="text-sm text-[#7C3AED] font-medium">
                    직접 등록하기
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                약관에 동의해주세요
              </h2>
              <p className="text-sm text-gray-500">
                서비스 이용을 위해 약관 동의가 필요합니다.
              </p>
            </div>
            <div className="space-y-1">
              {agreementItems.map((item, idx) => (
                <div key={item.id}>
                  {idx === 1 && (
                    <div className="h-px bg-gray-100 my-2" />
                  )}
                  <button
                    onClick={() => toggleAgreement(item.id)}
                    className="w-full flex items-center gap-3 py-3 text-left"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.isAll
                          ? agreements.size ===
                            agreementItems.filter((a) => !a.isAll).length
                            ? 'bg-[#7C3AED]'
                            : 'border-2 border-gray-300'
                          : agreements.has(item.id)
                            ? 'bg-[#7C3AED]'
                            : 'border-2 border-gray-300'
                      }`}
                    >
                      <Check size={12} className="text-white" />
                    </div>
                    <span
                      className={`text-sm ${
                        item.isAll ? 'font-bold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {item.label}
                    </span>
                    {!item.isAll && (
                      <ChevronRight
                        size={16}
                        className="text-gray-300 ml-auto flex-shrink-0"
                      />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                병원 기본정보를 입력해주세요
              </h2>
              <p className="text-sm text-gray-500">
                정확한 정보를 입력해주세요.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  병원명
                </label>
                <input
                  type="text"
                  value={hospitalInfo.name}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="병원명을 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  대표자명
                </label>
                <input
                  type="text"
                  value={hospitalInfo.ownerName}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      ownerName: e.target.value,
                    }))
                  }
                  placeholder="대표자명을 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={hospitalInfo.phone}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="전화번호를 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  value={hospitalInfo.businessNumber}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      businessNumber: e.target.value,
                    }))
                  }
                  placeholder="사업자등록번호를 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>

              {/* Document uploads */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  서류 첨부
                </label>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-300 hover:border-[#7C3AED] transition-colors">
                    <Upload size={18} className="text-gray-400" />
                    <div className="text-left">
                      <p className="text-sm text-gray-600">사업자등록증</p>
                      <p className="text-xs text-gray-400">
                        PDF, JPG, PNG (10MB 이하)
                      </p>
                    </div>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-300 hover:border-[#7C3AED] transition-colors">
                    <Upload size={18} className="text-gray-400" />
                    <div className="text-left">
                      <p className="text-sm text-gray-600">의료기관개설신고증</p>
                      <p className="text-xs text-gray-400">
                        PDF, JPG, PNG (10MB 이하)
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                운영시간을 설정해주세요
              </h2>
              <p className="text-sm text-gray-500">
                요일별 운영시간을 설정합니다.
              </p>
            </div>
            <div className="space-y-3">
              {operatingHours.map((oh, idx) => (
                <div
                  key={oh.day}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                >
                  <span className="w-6 text-sm font-medium text-gray-700 text-center">
                    {oh.day}
                  </span>
                  {oh.closed ? (
                    <span className="flex-1 text-sm text-gray-400 text-center">
                      휴진
                    </span>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="time"
                        value={oh.start}
                        onChange={(e) => {
                          const updated = [...operatingHours];
                          updated[idx] = { ...oh, start: e.target.value };
                          setOperatingHours(updated);
                        }}
                        className="flex-1 text-sm text-center bg-white rounded-lg py-2 border border-gray-200"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="time"
                        value={oh.end}
                        onChange={(e) => {
                          const updated = [...operatingHours];
                          updated[idx] = { ...oh, end: e.target.value };
                          setOperatingHours(updated);
                        }}
                        className="flex-1 text-sm text-center bg-white rounded-lg py-2 border border-gray-200"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const updated = [...operatingHours];
                      updated[idx] = { ...oh, closed: !oh.closed };
                      setOperatingHours(updated);
                    }}
                    className={`px-2 py-1 text-xs rounded-lg font-medium ${
                      oh.closed
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-[#EDE9FE] text-[#7C3AED]'
                    }`}
                  >
                    {oh.closed ? '휴진' : '진료'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="px-4 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                원장 정보를 입력해주세요
              </h2>
              <p className="text-sm text-gray-500">
                원장님의 정보를 입력합니다.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  원장명
                </label>
                <input
                  type="text"
                  value={doctorInfo.name}
                  onChange={(e) =>
                    setDoctorInfo((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="원장명을 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  전문분야
                </label>
                <input
                  type="text"
                  value={doctorInfo.specialty}
                  onChange={(e) =>
                    setDoctorInfo((prev) => ({
                      ...prev,
                      specialty: e.target.value,
                    }))
                  }
                  placeholder="전문분야를 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  면허번호
                </label>
                <input
                  type="text"
                  value={doctorInfo.licenseNumber}
                  onChange={(e) =>
                    setDoctorInfo((prev) => ({
                      ...prev,
                      licenseNumber: e.target.value,
                    }))
                  }
                  placeholder="면허번호를 입력해주세요"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Completion screen
  if (step > TOTAL_STEPS) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <TopBar title="" showBack={false} />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 bg-[#EDE9FE] rounded-full flex items-center justify-center mb-6">
            <Plane size={36} className="text-[#7C3AED]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            회원가입을 축하해요!
          </h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            병원 등록이 완료되었습니다.
            <br />
            심사 후 승인이 완료되면 알려드릴게요.
          </p>
          <button
            onClick={() => router.push('/hospital')}
            className="mt-8 w-full max-w-[280px] py-3.5 bg-[#7C3AED] text-white rounded-xl text-base font-bold"
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <TopBar
        title={getStepTitle()}
        showBack
        rightContent={
          <span className="text-xs text-gray-400">
            {step}/{TOTAL_STEPS}
          </span>
        }
      />

      {/* Step indicator */}
      <div className="px-4 pt-1 pb-2">
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-[#7C3AED]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">{renderStep()}</div>

      {/* Bottom button */}
      <div className="sticky bottom-0 bg-white px-4 py-4 border-t border-gray-100">
        <button
          onClick={() => {
            if (step === TOTAL_STEPS) {
              setStep(TOTAL_STEPS + 1);
            } else {
              handleNext();
            }
          }}
          disabled={!canProceed()}
          className={`w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
            canProceed()
              ? 'bg-[#7C3AED] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {step === TOTAL_STEPS ? '완료' : '다음'}
        </button>
      </div>
    </div>
  );
}
