'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Upload, X, Plus, Info, ChevronLeft } from 'lucide-react';

const COUNTRIES = [
  { code: 'KR', label: '🇰🇷 한국' },
  { code: 'JP', label: '🇯🇵 일본' },
  { code: 'CN', label: '🇨🇳 중국' },
  { code: 'EN', label: '🇺🇸 글로벌' },
];

const CATEGORIES = [
  '눈성형', '코성형', '안면윤곽', '가슴성형', '지방흡입', '리프팅',
  '보톡스', '필러', '모발이식', '치아교정', '임플란트', '라미네이트',
  '피부재생', '여드름', '기미·주근깨', '레이저',
];

const SURGEONS = ['김정우 대표원장', '이서연 원장', '박지훈 원장'];

type Option = { id: string; name: string; price: number; desc: string };

// Seeded mock for any event id
const seed = (id: string) => ({
  country: 'KR',
  title: id === 'evt-1041' ? '눈매교정 + 쌍꺼풀 자연유착' : '등록된 이벤트',
  category: '눈성형',
  options: [
    { id: 'o1', name: '기본형', price: 1800000, desc: '자연유착 + 부분절개' },
    { id: 'o2', name: '프리미엄', price: 2400000, desc: '풀절개 + 지방재배치' },
  ],
  startDate: '2026-04-10',
  endDate: '2026-05-10',
  surgeons: new Set([SURGEONS[0]]),
  description:
    '눈매교정과 쌍꺼풀 자연유착을 함께 진행합니다. 시술 시간 약 60분, 회복 기간 2주 예상.\n\n심의 필증 번호: 의광-2026-00412',
  region: '전국' as const,
});

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const initial = seed(id || '');

  const [country, setCountry] = useState(initial.country);
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [options, setOptions] = useState<Option[]>(initial.options);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [surgeons, setSurgeons] = useState<Set<string>>(initial.surgeons);
  const [description, setDescription] = useState(initial.description);
  const [region, setRegion] = useState<'전국' | '서울/수도권' | '해외'>(initial.region);

  const addOption = () =>
    setOptions((p) => [...p, { id: `o-${Date.now()}`, name: '', price: 0, desc: '' }]);
  const updateOption = (oid: string, patch: Partial<Option>) =>
    setOptions((p) => p.map((o) => (o.id === oid ? { ...o, ...patch } : o)));
  const removeOption = (oid: string) =>
    setOptions((p) => (p.length > 1 ? p.filter((o) => o.id !== oid) : p));

  return (
    <div className="space-y-4 max-w-3xl">
      <Link
        href="/partner/events/list"
        className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft size={14} /> 이벤트 목록
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">이벤트 수정</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            ID <span className="font-semibold text-gray-700">{id}</span> · 수정 내용은 검수 완료 후 반영됩니다.
          </p>
        </div>
      </div>

      <Card title="대상 국가">
        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.map((c) => (
            <ChipBtn key={c.code} active={country === c.code} onClick={() => setCountry(c.code)}>
              {c.label}
            </ChipBtn>
          ))}
        </div>
      </Card>

      <Card title="이벤트명" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={40}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] transition-colors"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{title.length}/40</p>
      </Card>

      <Card title="시술 카테고리" required>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <ChipBtn key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </ChipBtn>
          ))}
        </div>
      </Card>

      <Card title="대표 이미지">
        <div className="max-w-xs">
          <ImageSlot value={thumbnail} onChange={setThumbnail} aspect="1 / 1" />
        </div>
        <p className="text-[11px] text-gray-400 mt-2">현재 이미지는 유지되며, 새 이미지 업로드 시 교체됩니다.</p>
      </Card>

      <Card
        title="가격 옵션"
        required
        right={
          <button
            onClick={addOption}
            className="text-[11px] font-semibold text-[#7C3AED] flex items-center gap-0.5"
          >
            <Plus size={12} /> 옵션 추가
          </button>
        }
      >
        <div className="space-y-2">
          {options.map((o, idx) => (
            <div key={o.id} className="rounded-lg border border-gray-200 p-3 flex gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F4EFFF] text-[#7C3AED] flex items-center justify-center text-[11px] font-bold">
                {idx + 1}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  value={o.name}
                  onChange={(e) => updateOption(o.id, { name: e.target.value })}
                  placeholder="옵션명"
                  className="w-full px-2.5 py-2 border border-gray-200 rounded text-[12px] outline-none focus:border-[#7C3AED]"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={o.price || ''}
                    onChange={(e) => updateOption(o.id, { price: Number(e.target.value) || 0 })}
                    placeholder="가격"
                    className="flex-1 px-2.5 py-2 border border-gray-200 rounded text-[12px] outline-none focus:border-[#7C3AED]"
                  />
                  <span className="text-[11px] text-gray-500">원</span>
                </div>
                <input
                  value={o.desc}
                  onChange={(e) => updateOption(o.id, { desc: e.target.value })}
                  placeholder="옵션 설명"
                  className="w-full px-2.5 py-2 border border-gray-200 rounded text-[12px] outline-none focus:border-[#7C3AED]"
                />
              </div>
              {options.length > 1 && (
                <button
                  onClick={() => removeOption(o.id)}
                  className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="노출 기간">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED]"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED]"
          />
        </div>
      </Card>

      <Card title="집도의">
        <div className="flex flex-wrap gap-1.5">
          {SURGEONS.map((s) => {
            const sel = surgeons.has(s);
            return (
              <ChipBtn
                key={s}
                active={sel}
                onClick={() => {
                  const next = new Set(surgeons);
                  if (next.has(s)) next.delete(s);
                  else next.add(s);
                  setSurgeons(next);
                }}
              >
                {s}
              </ChipBtn>
            );
          })}
        </div>
      </Card>

      <Card title="상세 설명">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={2000}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] resize-none"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{description.length}/2000</p>
      </Card>

      <Card title="노출 지역">
        <div className="flex gap-1.5">
          {(['전국', '서울/수도권', '해외'] as const).map((r) => (
            <ChipBtn key={r} active={region === r} onClick={() => setRegion(r)}>
              {r}
            </ChipBtn>
          ))}
        </div>
      </Card>

      <div className="bg-[#FFF8E1] rounded-lg px-3 py-3 flex items-start gap-2">
        <Info size={14} className="text-[#B45309] mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-[#B45309] leading-relaxed">
          수정 내용은 저장 즉시 검수 대기 상태로 전환되며, 승인 완료까지 기존 내용이 유지됩니다.
        </div>
      </div>

      <div className="sticky bottom-0 -mx-3 lg:-mx-5 px-3 lg:px-5 py-3 bg-white border-t border-gray-200 flex gap-2">
        <button
          onClick={() => router.push('/partner/events/list')}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700"
        >
          취소
        </button>
        <button
          onClick={() => router.push('/partner/events/approval')}
          className="flex-1 py-2.5 rounded-lg text-[13px] font-bold btn-press bg-[#7C3AED] text-white"
          style={{ boxShadow: '0 6px 16px rgba(124, 58, 237, 0.3)' }}
        >
          수정 저장 및 검수 요청
        </button>
      </div>
    </div>
  );
}

function Card({
  title,
  required,
  right,
  children,
}: {
  title: string;
  required?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 partner-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-gray-900">
          {title}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function ChipBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="partner-pill px-3 py-1.5 rounded-full text-[12px] font-semibold"
      style={{
        backgroundColor: active ? '#F4EFFF' : '#fff',
        color: active ? '#7C3AED' : '#51535C',
        border: `1px solid ${active ? '#7C3AED' : '#E5E7EB'}`,
      }}
    >
      {children}
    </button>
  );
}

function ImageSlot({
  value,
  onChange,
  aspect,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  aspect: string;
}) {
  return (
    <label
      className="block relative rounded-lg border border-dashed border-gray-300 hover:border-[#7C3AED] bg-gray-50 cursor-pointer overflow-hidden"
      style={{ aspectRatio: aspect }}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(URL.createObjectURL(f));
        }}
      />
      {value ? (
        <>
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <X size={13} />
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <Upload size={22} />
          <p className="text-[12px] font-semibold mt-2 text-gray-600">이미지 업로드</p>
        </div>
      )}
    </label>
  );
}
