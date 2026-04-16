'use client';

import { useState } from 'react';
import { X, Upload, MapPin, Info, Plus } from 'lucide-react';

const SUBWAY_LINES = [
  '신사역 3호선',
  '압구정역 3호선',
  '강남역 2호선',
  '선릉역 2호선',
  '역삼역 2호선',
  '삼성역 2호선',
  '논현역 7호선',
  '학동역 7호선',
];

const TREATMENT_ITEMS = [
  '눈성형', '코성형', '안면윤곽', '가슴성형', '지방흡입', '리프팅',
  '보톡스', '필러', '모발이식', '치아교정', '임플란트', '라미네이트',
  '스케일링', '라식/라섹', '피부재생', '여드름', '기미·주근깨', '레이저',
];

const LANGUAGES = ['한국어', '영어', '중국어', '일본어', '베트남어', '러시아어', '몽골어', '태국어'];

const HOSPITAL_FEATURES = [
  '야간진료', '주말진료', '주차가능', '발렛파킹', '여의사 상주',
  '외국인 상담', '수면마취', '당일시술', '예약제', '무료주차',
  '개별 회복실', '정수기 구비',
];

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

type OperatingHour = {
  day: (typeof DAYS)[number];
  start: string;
  end: string;
  closed: boolean;
};

export default function HospitalInfoPage() {
  const [description, setDescription] = useState(
    '고객 한 분 한 분께 맞춤 시술을 제공하는 병원입니다.'
  );
  const [address] = useState('서울 강남구 테헤란로 152');
  const [detailAddress, setDetailAddress] = useState('10층 1001호');
  const [enAddress] = useState('152 Teheran-ro, Gangnam-gu, Seoul');
  const [selectedStations, setSelectedStations] = useState<Set<string>>(
    new Set(['강남역 2호선', '역삼역 2호선'])
  );
  const [etcInfo, setEtcInfo] = useState('점심시간: 13:00 ~ 14:00');
  const [selectedTreatments, setSelectedTreatments] = useState<Set<string>>(
    new Set(['눈성형', '코성형', '리프팅'])
  );
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(
    new Set(['한국어', '영어'])
  );
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(['주차가능', '수면마취'])
  );
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>(
    DAYS.map((day) => ({
      day,
      start: '10:00',
      end: '19:00',
      closed: day === '일',
    }))
  );

  const toggleSet = (
    set: Set<string>,
    setter: (s: Set<string>) => void,
    value: string,
    max?: number
  ) => {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      if (max && next.size >= max) return;
      next.add(value);
    }
    setter(next);
  };

  const updateHour = (idx: number, patch: Partial<OperatingHour>) => {
    setOperatingHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold text-gray-900">병원 정보</h1>
        <button className="px-4 py-2 rounded-lg bg-[#2B313D] text-white text-[13px] font-semibold btn-press">
          저장하기
        </button>
      </div>

      <Card title="병원명">
        <input
          value="오케이치과의원"
          readOnly
          className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-700 cursor-not-allowed"
        />
        <p className="text-[11px] text-gray-400 mt-2 flex items-start gap-1">
          <Info size={11} className="mt-0.5 flex-shrink-0" />
          병원명은 의료기관개설신고증 내 명칭으로 등록됩니다. 변경 시 파트너 고객센터로 문의해 주세요.
        </p>
      </Card>

      <Card title="병원설명">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F] transition-colors resize-none"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{description.length}/300</p>
      </Card>

      <Card title="주소">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={address}
              readOnly
              className="flex-1 px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-700 cursor-not-allowed"
            />
            <button className="px-3 py-2.5 rounded-lg bg-[#8DC63F] text-white text-[12px] font-semibold btn-press whitespace-nowrap">
              주소검색
            </button>
          </div>
          <input
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            placeholder="상세주소 (건물명·층·호수)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F] transition-colors"
          />
          <input
            value={enAddress}
            readOnly
            className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-500 cursor-not-allowed"
            placeholder="영문주소 (자동 번역)"
          />
        </div>
      </Card>

      <Card
        title="지하철역"
        right={<span className="text-[11px] text-gray-400">{selectedStations.size}/4</span>}
      >
        <div className="flex flex-wrap gap-1.5">
          {SUBWAY_LINES.map((s) => {
            const sel = selectedStations.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleSet(selectedStations, setSelectedStations, s, 4)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1"
                style={{
                  backgroundColor: sel ? '#F5FAEF' : '#fff',
                  color: sel ? '#5B8B25' : '#51535C',
                  border: `1px solid ${sel ? '#8DC63F' : '#E5E7EB'}`,
                  transition: 'all 200ms ease',
                }}
              >
                <MapPin size={11} /> {s}
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="운영시간">
        <div className="space-y-2">
          {operatingHours.map((h, idx) => (
            <div
              key={h.day}
              className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
            >
              <span
                className="w-6 text-[13px] font-bold text-center"
                style={{
                  color:
                    h.day === '일' ? '#EF4444' : h.day === '토' ? '#3B82F6' : '#2B313D',
                }}
              >
                {h.day}
              </span>
              {h.closed ? (
                <span className="flex-1 text-[12px] text-gray-400 text-center">휴진</span>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="time"
                    value={h.start}
                    onChange={(e) => updateHour(idx, { start: e.target.value })}
                    className="flex-1 px-2 py-1.5 bg-white rounded border border-gray-200 text-[12px] text-center outline-none"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="time"
                    value={h.end}
                    onChange={(e) => updateHour(idx, { end: e.target.value })}
                    className="flex-1 px-2 py-1.5 bg-white rounded border border-gray-200 text-[12px] text-center outline-none"
                  />
                </div>
              )}
              <button
                onClick={() => updateHour(idx, { closed: !h.closed })}
                className="px-2 py-1 rounded text-[11px] font-semibold"
                style={{
                  backgroundColor: h.closed ? '#F3F4F6' : '#F5FAEF',
                  color: h.closed ? '#51535C' : '#5B8B25',
                }}
              >
                {h.closed ? '휴진' : '진료'}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="기타정보">
        <textarea
          value={etcInfo}
          onChange={(e) => setEtcInfo(e.target.value)}
          rows={2}
          placeholder="점심시간, 특별 운영 안내 등"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F] transition-colors resize-none"
        />
      </Card>

      <Card
        title="진료과목"
        right={<span className="text-[11px] text-gray-400">{selectedTreatments.size}개 선택</span>}
      >
        <div className="flex flex-wrap gap-1.5">
          {TREATMENT_ITEMS.map((t) => (
            <Chip
              key={t}
              label={t}
              active={selectedTreatments.has(t)}
              onClick={() => toggleSet(selectedTreatments, setSelectedTreatments, t)}
            />
          ))}
        </div>
      </Card>

      <Card title="통역 가능 언어">
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <Chip
              key={l}
              label={l}
              active={selectedLanguages.has(l)}
              onClick={() => toggleSet(selectedLanguages, setSelectedLanguages, l)}
            />
          ))}
        </div>
      </Card>

      <Card title="병원 특징">
        <div className="flex flex-wrap gap-1.5">
          {HOSPITAL_FEATURES.map((f) => (
            <Chip
              key={f}
              label={f}
              active={selectedFeatures.has(f)}
              onClick={() => toggleSet(selectedFeatures, setSelectedFeatures, f)}
            />
          ))}
        </div>
      </Card>

      <Card title="배너 이미지">
        <ImageUploadSlot aspect="16 / 9" hint="권장 1280x720, 통합검색 병원 페이지 첫 화면" />
      </Card>

      <Card title="프로필 이미지">
        <ImageUploadSlot aspect="1 / 1" hint="병원명 옆 원형 이미지 (권장 400x400)" />
      </Card>

      <Card title="병원 소개이미지" right={<span className="text-[11px] text-gray-400">0/10</span>}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <ImageUploadSlot key={i} aspect="1 / 1" small />
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          최대 10장까지 등록할 수 있으며, 병원 페이지 2페이지부터 노출됩니다.
        </p>
      </Card>

      <Card title="후기가 많은 시술이에요!">
        <p className="text-[12px] text-gray-500 mb-3">
          상담 신청한 이벤트 후기 중 후기가 많은 순서대로 자동 노출됩니다.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {['쌍꺼풀 자연유착', '코 수술 3D', '리프팅 올드클래식'].map((t, i) => (
            <div
              key={t}
              className="aspect-square rounded-lg bg-gray-100 flex flex-col items-center justify-center text-center px-2"
            >
              <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug">
                {t}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">후기 {320 - i * 45}건</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="실제 방문한 분들의 이야기예요">
        <p className="text-[12px] text-gray-500 mb-3">
          후기 작성 시 수집된 응답을 요약하여 병원 페이지에 노출합니다.
        </p>
        <div className="space-y-2">
          {[
            { label: '만족도', value: 4.8, count: 320 },
            { label: '시설 청결도', value: 4.9, count: 280 },
            { label: '상담 친절도', value: 4.7, count: 302 },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[13px] text-gray-700">{s.label}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" style={{ width: 140 }}>
                  <div className="h-full bg-[#8DC63F]" style={{ width: `${(s.value / 5) * 100}%` }} />
                </div>
                <span className="text-[12px] font-bold text-gray-900 w-10 text-right">{s.value}</span>
                <span className="text-[10px] text-gray-400 w-12 text-right">{s.count}명</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1"
      style={{
        backgroundColor: active ? '#F5FAEF' : '#fff',
        color: active ? '#5B8B25' : '#51535C',
        border: `1px solid ${active ? '#8DC63F' : '#E5E7EB'}`,
        transition: 'all 200ms ease',
      }}
    >
      {active && <span className="text-[10px]">✓</span>}
      {label}
    </button>
  );
}

function ImageUploadSlot({ aspect, hint, small }: { aspect: string; hint?: string; small?: boolean }) {
  const [file, setFile] = useState<string | null>(null);
  return (
    <label
      className="block relative rounded-lg border border-dashed border-gray-300 hover:border-[#8DC63F] transition-colors cursor-pointer bg-gray-50 overflow-hidden"
      style={{ aspectRatio: aspect }}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(URL.createObjectURL(f));
        }}
      />
      {file ? (
        <>
          <img src={file} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setFile(null);
            }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <X size={12} />
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          {small ? <Plus size={18} /> : <Upload size={22} />}
          {!small && (
            <>
              <p className="text-[12px] font-semibold mt-2 text-gray-600">이미지 업로드</p>
              {hint && <p className="text-[10px] text-gray-400 mt-0.5 px-3 text-center">{hint}</p>}
            </>
          )}
        </div>
      )}
    </label>
  );
}
