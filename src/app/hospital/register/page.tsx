'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Eye,
  FileText,
  Plane,
  Search,
  Upload,
  X,
} from 'lucide-react';
import TopBar from '@/components/common/TopBar';
import { useStore } from '@/store';

const TOTAL_STEPS = 8;

import { categories } from '@/lib/mock-data';
const specialties = categories;

const treatmentsBySpecialty: Record<string, string[]> = {
  'dental': ['임플란트', '충치치료', '스케일링', '치아교정', '라미네이트', '미백', '잇몸치료', '사랑니발치', '턱관절치료', '보철치료', '치아성형', '소아치과'],
  'internal': ['건강검진', '당뇨', '고혈압', '갑상선', '소화기', '호흡기', '심장', '혈액질환', '내분비', '감염질환'],
  'pediatric': ['예방접종', '성장클리닉', '감기·독감', '아토피', '천식', '소아알레르기', '영유아검진', '발달장애', '수족구', '야간진료'],
  'obstetrics': ['산전관리', '분만', '부인과진료', '자궁건강', '난임상담', '생리통', '갱년기', '질염', '초음파', '자궁경부암검진'],
  'urology': ['전립선', '비뇨기감염', '요실금', '발기부전', '결석', '방광질환', '포경수술', '신장질환', '야뇨증'],
  'dermatology': ['여드름', '아토피', '건선', '탈모', '기미·주근깨', '레이저', '보톡스', '필러', '리프팅', '제모', '흉터치료'],
  'plastic': ['쌍꺼풀', '코성형', '안면윤곽', '가슴성형', '지방흡입', '리프팅', '보톡스', '필러', '이마성형', '턱성형', '입술성형'],
  'eye': ['라식', '라섹', '스마일라식', '백내장', '녹내장', '노안교정', '시력교정', '안구건조증', '사시', '눈검진'],
  'ent': ['비염', '축농증', '중이염', '코골이', '이명', '편도선', '인후염', '어지럼증', '청각검사', '코성형(기능)'],
  'orthopedic': ['무릎관절', '어깨회전근개', '허리디스크', '목디스크', '발목염좌', '인공관절', '골절', '관절염', '도수치료', '체외충격파'],
  'neurosurgery': ['뇌종양', '척추수술', '디스크수술', '뇌혈관질환', '두통클리닉', '말초신경', '뇌졸중 재활'],
  'psychiatry': ['우울증', '불안장애', '공황장애', '수면장애', '스트레스', 'ADHD', '강박증', '중독치료', '심리상담'],
  'korean-medicine': ['한약처방', '침·뜸', '부항', '추나요법', '다이어트', '피부미용', '불임', '산후조리', '어린이보약', '만성피로'],
  'physical-therapy': ['도수치료', '운동치료', '전기자극', '체외충격파', '견인치료', '재활치료', '스포츠재활', '자세교정'],
  'radiology': ['X-ray', 'CT', 'MRI', '초음파', '유방촬영', '골밀도', '건강검진CT', '영상판독'],
};

const defaultTreatments = treatmentsBySpecialty['dental'];

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}

function formatBiznum(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
}

interface AgreementTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

interface AgreementItem {
  id: string;
  label: string;
  required?: boolean;
  isAll?: boolean;
  body?: string;
  tables?: AgreementTable[];
}

const agreementItems: AgreementItem[] = [
  { id: 'all', label: '모두 동의합니다.', isAll: true },
  {
    id: 'terms',
    label: '(필수) 서비스 이용약관',
    required: true,
    body: `제1조 (목적)
본 약관은 키닥터(이하 "회사")가 제공하는 의료 정보 연결 플랫폼 서비스(이하 "서비스") 이용과 관련하여 회사와 회원 간의 권리, 의무, 책임사항 및 이용조건을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
① "회원"이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 말합니다.
② "병원 회원"이란 의료법에 따라 개설된 의료기관으로서 서비스를 이용하기 위해 회사에 입점 신청을 하고 승인된 회원을 말합니다.
③ "서비스"란 회사가 의료기관과 일반 이용자를 중개·연결하고, 의료 상품 정보 제공, 예약 대행, 리뷰 등을 제공하는 플랫폼 전반을 의미합니다.

제3조 (약관의 효력 및 변경)
① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
② 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 변경 사유 및 적용 일자를 명시하여 최소 7일 전(회원에게 불리하거나 중대한 사항은 30일 전)부터 공지합니다.

제4조 (회원 의무)
① 회원은 타인의 개인정보 및 계정을 도용하여서는 안 됩니다.
② 회원은 서비스를 통해 제공받은 의료 정보가 진단·처방을 대체할 수 없음을 이해하고, 최종 의료 판단은 의료기관의 진료를 통해 결정되어야 함을 동의합니다.
③ 회원이 작성하는 리뷰·게시물은 진실성·정확성을 갖추어야 하며, 허위·과장 정보 게시 시 삭제 및 이용 제한 조치가 이루어질 수 있습니다.

제5조 (서비스의 중단)
회사는 정기 점검, 천재지변, 통신장애 등 불가항력적인 사유가 발생한 경우 서비스 제공을 일시 중단할 수 있으며, 사전 공지합니다.

제6조 (면책)
회사는 의료 행위의 주체가 아니며, 의료기관이 제공하는 진료 결과, 부작용, 합병증 등에 대해 법적 책임을 지지 않습니다. 회원과 의료기관 간에 발생하는 분쟁은 당사자 간에 해결함을 원칙으로 합니다.

제7조 (관할 및 준거법)
본 약관과 관련한 분쟁은 대한민국 법을 준거법으로 하며, 서울중앙지방법원을 제1심 관할 법원으로 합니다.

부칙
본 약관은 2026년 1월 1일부터 시행합니다.`,
  },
  {
    id: 'privacy',
    label: '(필수) 개인정보 수집·이용 동의',
    required: true,
    body: `「개인정보 보호법」 제15조, 제22조에 따라 이용자의 개인정보를 다음과 같이 수집·이용하는 데 동의를 받습니다.

1. 수집 항목 (필수)
   - 회원 가입 시: 이름, 휴대전화번호, 생년월일, 성별, 로그인 식별정보(카카오/Apple ID)
   - 서비스 이용 시: 예약/결제 내역, 진료 상품 조회 이력, 기기정보(OS·IP 주소·광고식별자)
   - 의료기관 회원: 의료기관 명칭, 대표자명, 사업자등록번호, 의료기관 개설허가번호,
     담당자 연락처, 진료과목, 운영시간

2. 수집 목적
   - 회원 식별 및 본인 확인, 부정 이용 방지
   - 의료 상품 예약·결제·알림, 고객 문의 응대
   - 서비스 이용 통계 분석 및 맞춤형 콘텐츠 제공
   - 법령상 의무 이행 (전자상거래, 세무, 분쟁 조정 등)

3. 보유 및 이용 기간
   - 회원 탈퇴 시까지 (단, 관련 법령에 따른 보존 의무가 있는 경우 해당 기간까지 보관)
     · 전자상거래법: 계약·청약철회 등의 기록 5년, 소비자 불만·분쟁처리 기록 3년
     · 전자금융거래법: 전자금융 거래기록 5년
     · 통신비밀보호법: 로그 기록 3개월

4. 동의 거부권 및 거부 시 불이익
   이용자는 개인정보 수집·이용 동의를 거부할 권리가 있습니다. 다만 필수 항목에 대한
   동의를 거부하시는 경우 회원 가입 및 예약·결제 등 핵심 서비스 이용이 제한됩니다.`,
    tables: [
      {
        title: '수집 항목 및 보유 기간',
        headers: ['구분', '수집 항목', '보유 기간'],
        rows: [
          ['회원 가입', '이름, 휴대전화, 생년월일, 성별, 로그인 ID', '회원 탈퇴 시까지'],
          ['예약·결제', '예약일, 결제수단, 결제금액', '전자상거래법 5년'],
          ['기기 정보', 'OS·IP 주소·광고식별자', '서비스 이용 종료 3개월'],
          ['의료기관 회원', '대표자명, 사업자번호, 개설허가번호', '탈퇴 후 3년'],
        ],
      },
    ],
  },
  {
    id: 'sensitive',
    label: '(필수) 민감정보(건강·의료정보) 수집·이용 동의',
    required: true,
    body: `「개인정보 보호법」 제23조 및 시행령 제18조에 따라 다음과 같이 민감정보를 수집·이용합니다. 건강정보는 민감정보에 해당하므로 별도 동의가 요구됩니다.

1. 수집 항목
   - 진료 희망 과목, 증상·치료 이력, 수술/시술 이력, 알레르기·복용 약물
   - 시술 전·후 사진(리뷰 작성 시 이용자 선택에 의함)
   - 예약·상담 과정에서 이용자가 제공하는 건강 관련 정보

2. 수집·이용 목적
   - 의료기관과의 상담·예약 매칭 및 진료 준비
   - 시술 후기·리뷰 게시를 위한 콘텐츠 관리
   - 의료 사고·분쟁 시 사실관계 확인

3. 보유 및 이용 기간
   회원 탈퇴 시 또는 수집·이용 목적 달성 시 즉시 파기합니다.
   단, 의료법 제22조에 따라 진료기록부가 필요한 경우 해당 의료기관에서 10년간 보관됩니다.

4. 동의 거부권 및 거부 시 불이익
   민감정보 수집에 동의하지 않을 권리가 있습니다. 거부 시 상담·예약 서비스 이용이
   제한될 수 있습니다.`,
    tables: [
      {
        title: '민감정보 수집 항목',
        headers: ['구분', '세부 항목'],
        rows: [
          ['진료 정보', '진료 희망 과목, 증상, 치료 이력'],
          ['수술/시술', '수술명, 일자, 담당 의료기관'],
          ['건강 상태', '알레르기, 복용 약물, 기저질환'],
          ['시각 자료', '시술 전·후 사진 (리뷰 작성 시 본인 선택)'],
        ],
      },
    ],
  },
  {
    id: 'third-party',
    label: '(필수) 개인정보 제3자 제공 동의',
    required: true,
    body: `「개인정보 보호법」 제17조에 따라 이용자의 개인정보를 다음과 같이 제3자에게 제공합니다.

제공받는 자 및 제공 항목
1. 예약/상담 요청한 의료기관
   - 항목: 이름, 휴대전화번호, 생년월일(선택), 예약 일시, 진료 요청 사항
   - 목적: 진료 예약 접수, 상담 회신, 방문 안내
   - 보유 기간: 제공 후 해당 의료기관의 진료기록부 보관 기간 (의료법 제22조, 최대 10년)

2. 결제대행사 (PG사)
   - 항목: 결제 정보(카드 번호 일부·승인번호·결제 수단)
   - 목적: 결제 승인, 환불 처리, 부정거래 방지
   - 보유 기간: 전자금융거래법에 따라 5년

3. 본인확인기관 및 통신사
   - 항목: 휴대전화번호, CI/DI
   - 목적: 본인 확인 및 연령 인증
   - 보유 기간: 본인확인 완료 후 즉시 파기

이용자는 제3자 제공에 대한 동의를 거부할 권리가 있으며, 거부 시 예약·결제 관련 핵심
서비스 이용이 제한됩니다.`,
    tables: [
      {
        title: '제3자 제공 현황',
        headers: ['제공받는 자', '제공 항목', '이용 목적', '보유 기간'],
        rows: [
          ['예약 의료기관', '이름·연락처·예약내용', '진료 예약 접수', '진료기록 10년 (의료법 22조)'],
          ['결제대행사(PG사)', '결제정보 일부', '결제 승인·환불', '전자금융거래법 5년'],
          ['본인확인기관', '휴대폰·CI/DI', '본인·연령 확인', '인증 후 즉시 파기'],
        ],
      },
    ],
  },
  {
    id: 'location',
    label: '(필수) 위치기반서비스 이용약관',
    required: true,
    body: `「위치정보의 보호 및 이용 등에 관한 법률」 제18조 및 제19조에 따라 개인위치정보를 다음과 같이 수집·이용합니다.

1. 수집 항목
   - 모바일 기기의 GPS/네트워크 기반 위치정보
   - IP 주소를 통한 행정구역 단위 추정 위치

2. 이용 목적
   - 주변 의료기관 검색, 거리순 정렬, 길찾기
   - 지역 기반 맞춤 정보(인기 병원, 이벤트 등) 제공

3. 보유 기간
   위치정보는 서비스 제공 즉시 처리·폐기되며, 개인위치정보의 저장·이용 기록은
   6개월간 보관합니다 (위치정보법 제16조).

4. 이용자 권리
   이용자는 언제든지 기기 설정을 통해 위치 권한을 철회할 수 있습니다. 위치 권한을
   거부할 경우 주변 병원 검색 등 일부 기능이 제한될 수 있습니다.`,
  },
  {
    id: 'age14',
    label: '(필수) 만 14세 이상 확인',
    required: true,
    body: `「정보통신망법」 및 「개인정보 보호법」에 따라 만 14세 미만 아동의 개인정보는 법정대리인의 동의 없이는 수집·이용할 수 없습니다.

1. 서비스 이용을 위해서는 이용자가 만 14세 이상임을 확인합니다.
2. 만 14세 미만의 아동이 보호자 동의 없이 가입한 사실이 확인되는 경우, 회사는 해당
   회원의 개인정보를 즉시 파기하고 계정을 정지합니다.
3. 보호자(법정대리인)의 경우 자녀를 대신하여 진료 예약을 진행하실 수 있으며, 이 경우
   본인의 계정으로 예약을 진행해 주시기 바랍니다.`,
  },
  {
    id: 'medical',
    label: '(필수) 의료정보 제공 및 이용 동의',
    required: true,
    body: `본 동의는 「의료법」 제56조(의료광고의 금지 등) 및 보건복지부 「의료광고 사전심의 운영 지침」에 따라 이용자에게 의료 정보를 전달하기 위한 목적에 한정됩니다.

1. 제공되는 정보의 성격
   - 회사가 제공하는 의료 상품·시술 정보는 참고용이며, 의사의 진단·처방을 대체하지 않습니다.
   - 시술 효과·부작용은 개인에 따라 차이가 있을 수 있으며, 동일한 결과를 보장하지 않습니다.
   - 가격 정보는 의료기관이 제공한 기준가이며, 실제 진료 범위·재료에 따라 달라질 수 있습니다.

2. 비급여 진료비용 표시
   회사는 「의료법」 제45조 및 「비급여 진료비용 고지 지침」에 따라 의료기관이 등록한
   비급여 항목의 가격 정보를 표시합니다. 최종 금액은 내원 시 의료진과 상담 후 확정됩니다.

3. 의료 광고 심의
   회사에 게시되는 의료광고는 의료법 제57조에 따라 대한의사협회·대한치과의사협회 등
   해당 의료인 단체의 사전 심의를 받은 콘텐츠를 기준으로 하며, 심의번호를 표기합니다.

4. 금지 사항
   이용자는 다음 행위를 하여서는 안 됩니다.
   ① 허위·과장 리뷰 작성, 유료 리뷰 게시
   ② 환자 유인·알선 등 의료법 제27조 위반 행위
   ③ 의료기관의 치료효과 보장 주장 및 타 의료기관 폄훼

본 사항은 관련 법령 개정 시 함께 변경될 수 있습니다.`,
  },
  {
    id: 'marketing',
    label: '(선택) 마케팅 정보 수신 동의',
    required: false,
    body: `「정보통신망법」 제50조에 따라 영리 목적의 광고성 정보 전송에 대해 사전 동의를 받습니다.

1. 수신 채널
   앱 푸시 알림, SMS/LMS, 카카오 알림톡, 이메일

2. 전송 내용
   - 신규 병원 입점, 이벤트·할인 쿠폰 안내
   - 내 관심 시술의 프로모션·신규 상품 소개
   - 회원 혜택(포인트 적립, 등급 업그레이드) 공지

3. 보유 기간
   동의 철회 시까지 (수신 거부 시 즉시 중단)

4. 동의 철회
   이용자는 마이페이지 > 알림 설정에서 언제든지 동의를 철회할 수 있으며, 수신 거부는
   서비스 이용에 어떠한 불이익도 주지 않습니다.

본 동의는 선택 사항이며, 동의하지 않아도 핵심 서비스 이용에는 영향이 없습니다.`,
  },
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

  // Auto-fill hospital name into step 6 form when user arrives with a search value
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

  // Step transition direction for slide animation
  const [stepDir, setStepDir] = useState<'forward' | 'backward'>('forward');

  // Draft restore on mount
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
      if (Array.isArray(d.selectedTreatments))
        setSelectedTreatments(new Set(d.selectedTreatments));
      if (d.registerType) setRegisterType(d.registerType);
      if (typeof d.hospitalSearch === 'string') setHospitalSearch(d.hospitalSearch);
      if (Array.isArray(d.agreements)) setAgreements(new Set(d.agreements));
      if (d.hospitalInfo) setHospitalInfo(d.hospitalInfo);
      if (Array.isArray(d.operatingHours)) setOperatingHours(d.operatingHours);
      if (d.doctorInfo) setDoctorInfo(d.doctorInfo);
    } catch {}
  }, []);

  const hasDraft = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('hospitalRegisterDraft');
  };

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
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('hospitalRegisterDraft', JSON.stringify(payload));
      showToast('입력한 내용이 저장되었습니다.');
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleNext = () => {
    setStepDir('forward');
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStepDir('backward');
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

  const [showAgreeFlow, setShowAgreeFlow] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const toggleAgreement = (id: string) => {
    if (id === 'all') {
      const nonAllItems = agreementItems.filter((a) => !a.isAll);
      const allChecked = nonAllItems.every((a) => agreements.has(a.id));
      if (allChecked) {
        setAgreements(new Set());
        setSignatureDataUrl(null);
      } else {
        // Open sequential read-and-agree flow instead of instant toggle
        setShowAgreeFlow(true);
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
          <div className="px-2.5 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                어떤 과에 해당하시나요?
              </h2>
              <p className="text-sm text-gray-500">
                해당하는 과를 선택해주세요.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {specialties.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSpecialty(s.id);
                    setSelectedTreatments(new Set());
                  }}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-colors card-press ${
                    selectedSpecialty === s.id
                      ? 'border-[#7C3AED] bg-[#EDE9FE]/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#F4F5F7] flex items-center justify-center">
                    <img src={s.icon} alt={s.name} className="w-8 h-8" />
                  </div>
                  <span
                    className={`font-medium text-[12px] text-center leading-tight ${
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
          <div className="px-2.5 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                진료과목을 선택해주세요
              </h2>
              <p className="text-sm text-gray-500">
                복수 선택이 가능합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(selectedSpecialty
                ? treatmentsBySpecialty[selectedSpecialty] ?? defaultTreatments
                : defaultTreatments
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTreatment(t)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
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
          <div className="px-2.5 py-6 space-y-4">
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
          <div className="px-2.5 py-6 space-y-4">
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
                  onClick={() => setHospitalSearch('참포도나무치과의원')}
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
          <div className="px-2.5 py-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                약관에 동의해주세요
              </h2>
              <p className="text-sm text-gray-500">
                서비스 이용을 위해 약관 동의가 필요합니다.
              </p>
            </div>
            <div className="space-y-1">
              {agreementItems.map((item, idx) => {
                const nonAllItems = agreementItems.filter((a) => !a.isAll);
                const allChecked = nonAllItems.every((a) => agreements.has(a.id));
                const isChecked = item.isAll ? allChecked : agreements.has(item.id);
                return (
                  <div key={item.id}>
                    {idx === 1 && <div className="h-px bg-gray-100 my-2" />}
                    <div className="w-full flex items-center gap-3 py-3">
                      <button
                        onClick={() => toggleAgreement(item.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                            isChecked ? 'bg-[#7C3AED]' : 'border-2 border-gray-300'
                          }`}
                        >
                          {isChecked && <Check size={12} className="text-white check-pop" />}
                        </div>
                        <span
                          className={`text-sm ${
                            item.isAll ? 'font-bold text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                      {!item.isAll && item.body && (
                        <button
                          onClick={() => setViewingAgreement(item)}
                          className="flex-shrink-0 p-1 -m-1"
                          aria-label="약관 전문 보기"
                        >
                          <ChevronRight size={16} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="px-2.5 py-6 space-y-4">
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
                  className="w-full px-2.5 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  대표자명 <span className="text-[11px] text-gray-400 font-normal">(최대 5자)</span>
                </label>
                <input
                  type="text"
                  value={hospitalInfo.ownerName}
                  maxLength={5}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      ownerName: e.target.value.slice(0, 5),
                    }))
                  }
                  placeholder="대표자명을 입력해주세요"
                  className="w-full px-2.5 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                />
                <p className="text-[11px] text-gray-400 mt-1 text-right">
                  {hospitalInfo.ownerName.length}/5
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  전화번호
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={hospitalInfo.phone}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  placeholder="010 1234 5678"
                  className="w-full px-0 py-3 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 border-0 border-b border-gray-200 focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  사업자등록번호
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hospitalInfo.businessNumber}
                  onChange={(e) =>
                    setHospitalInfo((prev) => ({
                      ...prev,
                      businessNumber: formatBiznum(e.target.value),
                    }))
                  }
                  placeholder="574 17 02394"
                  className="w-full px-0 py-3 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 border-0 border-b border-gray-200 focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              {/* Document uploads — 의료법 관련 필수·선택 서류 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    서류 첨부
                  </label>
                  <span className="text-[11px] text-gray-400">
                    PDF · JPG · PNG (각 10MB 이하)
                  </span>
                </div>

                <p className="text-[11px] text-[#7C3AED] font-semibold mb-2">
                  필수 서류
                </p>
                <div className="space-y-2 mb-4">
                  {[
                    {
                      title: '사업자등록증',
                      desc: '국세청 발급, 의료기관 명의',
                    },
                    {
                      title: '의료기관 개설신고증',
                      desc: '의료법 제33조 · 관할 보건소 발급',
                    },
                    {
                      title: '의사 면허증',
                      desc: '보건복지부 발급, 대표자 명의',
                    },
                    {
                      title: '전문의 자격증',
                      desc: '대표 원장 전문의 자격 (해당 진료과)',
                    },
                    {
                      title: '대표자 신분증 사본',
                      desc: '주민등록증 또는 운전면허증',
                    },
                  ].map((doc) => (
                    <DocUploadRow key={doc.title} title={doc.title} desc={doc.desc} required />
                  ))}
                </div>

                <p className="text-[11px] text-gray-500 font-semibold mb-2">
                  선택 서류
                </p>
                <div className="space-y-2">
                  {[
                    {
                      title: '의료기관 대표자 인감증명서',
                      desc: '3개월 이내 발급, 직인 대신 제출 가능',
                    },
                    {
                      title: '의료광고 사전심의 필증',
                      desc: '의료법 제57조 · 의사회 심의 필증',
                    },
                    {
                      title: '법인 등기부등본',
                      desc: '의료법인·상법법인일 때',
                    },
                    {
                      title: '진료과목별 전문의 자격증',
                      desc: '복수 전문의 운영 시 첨부',
                    },
                  ].map((doc) => (
                    <DocUploadRow key={doc.title} title={doc.title} desc={doc.desc} />
                  ))}
                </div>

                <div className="mt-3 px-3 py-2.5 rounded-lg bg-[#F4EFFF]">
                  <p className="text-[11px] text-[#7C3AED] font-semibold leading-snug">
                    * 의료법 제33조, 제57조 및 관련 고시에 따라 의료기관 운영 자격을 확인하기
                    위해 상기 서류가 요구됩니다. 제출된 서류는 심사 목적 외에 사용되지 않으며
                    승인 이후 안전하게 파기됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="px-2.5 py-6 space-y-4">
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
          <div className="px-2.5 py-6 space-y-4">
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
                  className="w-full px-2.5 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
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
                  className="w-full px-2.5 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
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
                  className="w-full px-2.5 py-3 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
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
        <div className="flex-1 flex flex-col items-center justify-center px-2.5">
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
      <div className="px-2.5 pt-1 pb-2">
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

      {/* Step content with directional slide */}
      <div className="flex-1 overflow-y-auto">
        <div
          key={step}
          className={stepDir === 'forward' ? 'tab-slide-right' : 'tab-slide-left'}
        >
          {renderStep()}
        </div>
      </div>

      {/* Bottom button + draft save */}
      <div className="sticky bottom-0 bg-white px-2.5 py-3 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={saveDraft}
          className="flex-shrink-0 px-4 py-3.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 btn-press hover:bg-gray-50 transition-colors"
        >
          중간저장
        </button>
        <button
          onClick={() => {
            if (step === TOTAL_STEPS) {
              setStep(TOTAL_STEPS + 1);
            } else {
              handleNext();
            }
          }}
          disabled={!canProceed()}
          className={`flex-1 py-3.5 rounded-xl text-base font-bold btn-press transition-all duration-300 ${
            canProceed()
              ? 'bg-[#7C3AED] text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {step === TOTAL_STEPS ? '완료' : '다음'}
        </button>
      </div>

      {/* Agreement terms bottom sheet (single item view) */}
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

      {/* Sequential agree flow (triggered by 모두 동의합니다) */}
      {showAgreeFlow && (
        <SequentialAgreeFlow
          items={agreementItems.filter((a) => !a.isAll)}
          existingSignature={signatureDataUrl}
          onClose={() => setShowAgreeFlow(false)}
          onComplete={(signedIds, sigUrl) => {
            setAgreements(new Set(signedIds));
            setSignatureDataUrl(sigUrl);
            setShowAgreeFlow(false);
          }}
        />
      )}
    </div>
  );
}

// ===== Table renderer =====
function DocUploadRow({
  title,
  desc,
  required,
}: {
  title: string;
  desc: string;
  required?: boolean;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  };

  const uploaded = !!fileName;
  return (
    <label
      htmlFor={`doc-${title}`}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors text-left cursor-pointer"
      style={{
        borderColor: uploaded ? '#7C3AED' : '#D1D5DB',
        backgroundColor: uploaded ? '#F4EFFF' : 'transparent',
      }}
    >
      <input
        ref={inputRef}
        id={`doc-${title}`}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={handleFile}
      />
      <Upload size={18} className={uploaded ? 'text-[#7C3AED]' : 'text-gray-400'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-gray-800 font-medium leading-tight">{title}</p>
          {required && (
            <span className="text-[10px] font-bold text-red-500 leading-none">*</span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug truncate">
          {uploaded ? fileName : desc}
        </p>
      </div>
      {uploaded && (
        <button
          type="button"
          onClick={handleReset}
          className="flex-shrink-0 text-[11px] font-semibold text-[#7C3AED] px-1.5 py-0.5"
        >
          다시 올리기
        </button>
      )}
    </label>
  );
}

function AgreementTables({ tables }: { tables?: AgreementTable[] }) {
  if (!tables || tables.length === 0) return null;
  return (
    <div className="mt-4 space-y-4">
      {tables.map((t, i) => (
        <div key={i}>
          {t.title && (
            <p className="text-[13px] font-semibold text-gray-900 mb-2">{t.title}</p>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {t.headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="px-2.5 py-2 text-left font-semibold text-gray-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={ri < t.rows.length - 1 ? 'border-b border-gray-100' : ''}
                  >
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2.5 py-2 text-gray-700 align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgreementSheet({
  item,
  onClose,
  onAgree,
}: {
  item: AgreementItem;
  onClose: () => void;
  onAgree: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 modal-overlay-enter"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col modal-content-enter lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-lg lg:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900">{item.label.replace(/^\(필수\)\s*|^\(선택\)\s*/, '')}</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-line">
            {item.body}
          </p>
          <AgreementTables tables={item.tables} />
        </div>

        {/* Footer button */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={onAgree}
            className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl text-base font-bold btn-press"
          >
            {item.required ? '동의하고 계속하기' : '동의합니다'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Sequential agree flow with signature =====
function SequentialAgreeFlow({
  items,
  existingSignature,
  onClose,
  onComplete,
}: {
  items: AgreementItem[];
  existingSignature: string | null;
  onClose: () => void;
  onComplete: (signedIds: string[], signatureDataUrl: string | null) => void;
}) {
  const totalSteps = items.length + 1; // +1 for signature step
  const [stepIdx, setStepIdx] = useState(0);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [signedIds, setSignedIds] = useState<string[]>([]);
  const [sigUrl, setSigUrl] = useState<string | null>(existingSignature);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isSignatureStep = stepIdx >= items.length;
  const currentItem = isSignatureStep ? null : items[stepIdx];
  const currentNumber = stepIdx + 1;
  const progressPct = (currentNumber / totalSteps) * 100;

  const checkReachedBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const notScrollable = el.scrollHeight <= el.clientHeight + 12;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    if (notScrollable || atBottom) setReachedBottom(true);
  };

  // Re-check on step change — short content auto-enables button
  useEffect(() => {
    if (isSignatureStep) return;
    setReachedBottom(false);
    const t = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const notScrollable = el.scrollHeight <= el.clientHeight + 12;
      if (notScrollable) setReachedBottom(true);
    }, 60);
    return () => clearTimeout(t);
  }, [stepIdx, isSignatureStep]);

  const resetScroll = () => {
    setReachedBottom(false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
    });
  };

  const [justChecked, setJustChecked] = useState(false);

  const handleAgree = () => {
    if (!currentItem || justChecked) return;
    setJustChecked(true);
    setTimeout(() => {
      const next = [...signedIds, currentItem.id];
      setSignedIds(next);
      setStepIdx(stepIdx + 1);
      setJustChecked(false);
      resetScroll();
    }, 550);
  };

  const handleSignatureComplete = (dataUrl: string | null) => {
    setSigUrl(dataUrl);
  };

  const handleFinalSubmit = () => {
    if (!sigUrl) return;
    onComplete(signedIds, sigUrl);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 modal-overlay-enter">
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl h-[92vh] flex flex-col modal-content-enter lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-lg lg:h-[90vh] lg:rounded-2xl"
      >
        {/* Header with progress */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
                {currentNumber} / {totalSteps}
              </span>
              <h3 className="text-[15px] font-bold text-gray-900">
                {isSignatureStep ? '서명 및 직인' : '필수 약관 확인'}
              </h3>
            </div>
            <button onClick={onClose} className="p-1 -m-1">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#7C3AED] rounded-full"
              style={{
                width: `${progressPct}%`,
                transition: 'width 380ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
        </div>

        {/* Body */}
        {isSignatureStep ? (
          <SignatureStep onChange={handleSignatureComplete} initial={sigUrl} />
        ) : (
          <div
            ref={scrollRef}
            onScroll={checkReachedBottom}
            className="flex-1 overflow-y-auto px-5 py-4"
          >
            <h4 className="text-[15px] font-bold text-gray-900 mb-3">
              {currentItem?.label.replace(/^\(필수\)\s*|^\(선택\)\s*/, '')}
            </h4>
            <p className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-line">
              {currentItem?.body}
            </p>
            <AgreementTables tables={currentItem?.tables} />
            <div className="mt-6 mb-2 py-3 text-center text-[11px] text-gray-400 border-t border-dashed border-gray-200">
              — 약관 끝 —
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-white">
          {!isSignatureStep && !reachedBottom && (
            <p className="text-[11px] text-gray-400 text-center mb-2">
              아래까지 스크롤해서 약관을 모두 확인해주세요
            </p>
          )}
          {isSignatureStep ? (
            <button
              disabled={!sigUrl}
              onClick={handleFinalSubmit}
              className={`w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
                sigUrl
                  ? 'bg-[#7C3AED] text-white btn-press'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              제출하고 완료하기
            </button>
          ) : (
            <button
              disabled={!reachedBottom || justChecked}
              onClick={handleAgree}
              className={`agree-btn w-full py-3.5 rounded-xl text-base font-bold transition-colors ${
                reachedBottom
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              } ${justChecked ? 'is-checked' : ''}`}
            >
              <span className="agree-btn-inner">
                <span className="agree-btn-check" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <path
                      d="M5 12l4.8 4.8L19 7.5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="agree-btn-label">
                  <span className="agree-btn-label-pre">동의합니다</span>
                  <span className="agree-btn-label-post">동의 완료</span>
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Signature canvas step =====
function SignatureStep({
  onChange,
  initial,
}: {
  onChange: (dataUrl: string | null) => void;
  initial: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!!initial);
  const [sealPreview, setSealPreview] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
    }
    if (initial) {
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initial;
    }
  }, [initial]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getPoint(e);
    if (!p) return;
    drawing.current = true;
    lastPoint.current = p;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const p = getPoint(e);
    if (!ctx || !p || !lastPoint.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    if (!hasDrawn) setHasDrawn(true);
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasDrawn(false);
      setSealPreview(null);
      onChange(null);
    }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSealPreview(dataUrl);
      setHasDrawn(true);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <p className="text-[13px] text-gray-700 leading-relaxed mb-4">
        위의 모든 약관을 확인하셨습니다. 신청 완료를 위해 아래에 직접 서명하시거나
        병원 직인 이미지를 업로드해 주세요.
      </p>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-900">서명</p>
        <button
          onClick={handleClear}
          className="text-[12px] text-gray-500 hover:text-gray-700"
        >
          다시 쓰기
        </button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: '100%',
            height: 180,
            backgroundColor: '#FAFAFA',
            border: '1px dashed #D1D5DB',
            borderRadius: 12,
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[13px] text-gray-400">이곳에 서명해 주세요</p>
          </div>
        )}
        {sealPreview && (
          <img
            src={sealPreview}
            alt="직인"
            className="absolute top-2 right-2 w-16 h-16 object-contain rounded border border-gray-200 bg-white"
          />
        )}
      </div>

      <div className="mt-4">
        <p className="text-[13px] font-semibold text-gray-900 mb-2">직인 이미지 첨부 (선택)</p>
        <label
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-[13px] text-gray-600 cursor-pointer hover:border-[#7C3AED] transition-colors"
        >
          <Upload size={16} className="text-gray-400" />
          {sealPreview ? '직인 이미지 변경' : '직인/인감 이미지 업로드'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSealUpload}
          />
        </label>
        {sealPreview && (
          <p className="text-[11px] text-gray-500 mt-1.5">직인 이미지가 첨부되었습니다.</p>
        )}
      </div>

      <div className="mt-5 p-3 rounded-xl bg-gray-50 text-[11px] text-gray-500 leading-relaxed">
        본 서명은 전자서명법 제3조에 따라 당사자의 동의 의사로 간주됩니다.
        서명 또는 직인 이미지는 제출일로부터 3년간 보관되며, 탈퇴 시 즉시 파기됩니다.
      </div>
    </div>
  );
}

