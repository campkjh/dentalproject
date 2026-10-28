// 병원 신청 공통 데이터·도우미 — 원래 hospital/register/page.tsx 에 있던 것 그대로 옮김.

export const treatmentsBySpecialty: Record<string, string[]> = {
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

export const defaultTreatments = treatmentsBySpecialty['dental'];

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
}

export function formatBiznum(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
}

type PostcodeData = { zonecode: string; address: string };
type PostcodeCtor = new (opts: { oncomplete: (data: PostcodeData) => void }) => { open: () => void };

export function openPostcode(
  setHospitalInfo: React.Dispatch<
    React.SetStateAction<{
      name: string;
      ownerName: string;
      phone: string;
      businessNumber: string;
      postalCode: string;
      address: string;
      addressDetail: string;
      logoUrl: string;
    }>
  >
) {
  const apply = (data: PostcodeData) => {
    setHospitalInfo((prev) => ({
      ...prev,
      postalCode: data.zonecode,
      address: data.address,
    }));
  };
  const winAny = window as unknown as { daum?: { Postcode: PostcodeCtor } };
  if (winAny.daum?.Postcode) {
    new winAny.daum.Postcode({ oncomplete: apply }).open();
    return;
  }
  const s = document.createElement('script');
  s.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  s.onload = () => {
    const w = window as unknown as { daum: { Postcode: PostcodeCtor } };
    new w.daum.Postcode({ oncomplete: apply }).open();
  };
  document.body.appendChild(s);
}
