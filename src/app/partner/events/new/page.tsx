'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, X, Plus, Info, ChevronLeft, CheckCircle2 } from 'lucide-react';

const ACCENT = '#7C3AED';
const ACCENT_BG = '#F4EFFF';
const ACCENT_TEXT = '#7C3AED';

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

export default function EventNewPage() {
  const router = useRouter();
  const [country, setCountry] = useState('KR');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [galleries, setGalleries] = useState<string[]>([]);
  const [options, setOptions] = useState<Option[]>([
    { id: 'o1', name: '기본형', price: 0, desc: '' },
  ]);
  const [startDate, setStartDate] = useState('2026-04-20');
  const [endDate, setEndDate] = useState('2026-05-20');
  const [surgeons, setSurgeons] = useState<Set<string>>(new Set([SURGEONS[0]]));
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState<'전국' | '서울/수도권' | '해외'>('전국');
  const [agreed, setAgreed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const addOption = () => {
    setOptions((p) => [...p, { id: `o-${Date.now()}`, name: '', price: 0, desc: '' }]);
  };
  const updateOption = (id: string, patch: Partial<Option>) => {
    setOptions((p) => p.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };
  const removeOption = (id: string) => {
    setOptions((p) => (p.length > 1 ? p.filter((o) => o.id !== id) : p));
  };

  const addGallery = (url: string) => {
    setGalleries((p) => (p.length < 10 ? [...p, url] : p));
  };

  const basePrice = options[0]?.price ?? 0;
  const canSubmit = title.trim() && category && thumbnail && basePrice > 0 && agreed;

  const submit = () => {
    if (!canSubmit) return;
    setShowSuccess(true);
  };

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
          <h1 className="text-[18px] font-bold text-gray-900">이벤트 등록</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            등록 후 검수가 완료되면 앱에 노출됩니다.
          </p>
        </div>
      </div>

      {/* 국가 */}
      <Card title="대상 국가">
        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setCountry(c.code)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: country === c.code ? '#F4EFFF' : '#fff',
                color: country === c.code ? '#7C3AED' : '#51535C',
                border: `1px solid ${country === c.code ? '#7C3AED' : '#E5E7EB'}`,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {/* 이벤트명 */}
      <Card title="이벤트명" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 눈매교정 + 쌍꺼풀 자연유착"
          maxLength={40}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED]"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{title.length}/40</p>
      </Card>

      {/* 카테고리 */}
      <Card title="시술 카테고리" required>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: category === c ? '#F4EFFF' : '#fff',
                color: category === c ? '#7C3AED' : '#51535C',
                border: `1px solid ${category === c ? '#7C3AED' : '#E5E7EB'}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {/* 썸네일 */}
      <Card title="대표 이미지" required>
        <div className="max-w-xs">
          <ImageSlot
            value={thumbnail}
            onChange={setThumbnail}
            aspect="1 / 1"
            hint="앱 이벤트 카드에 노출되는 썸네일 (권장 800x800)"
          />
        </div>
      </Card>

      {/* 상세 이미지 */}
      <Card title="상세 이미지" right={<span className="text-[11px] text-gray-400">{galleries.length}/10</span>}>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {galleries.map((g, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
              <img src={g} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setGalleries((p) => p.filter((_, idx) => idx !== i))}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {galleries.length < 10 && (
            <label
              className="relative aspect-square rounded-lg border border-dashed border-gray-300 hover:border-[#7C3AED] bg-gray-50 cursor-pointer flex items-center justify-center text-gray-400"
            >
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addGallery(URL.createObjectURL(f));
                }}
              />
              <Plus size={18} />
            </label>
          )}
        </div>
      </Card>

      {/* 가격/옵션 */}
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
        <p className="text-[11px] text-gray-400 mb-3">
          첫 번째 옵션의 가격이 대표 가격으로 노출됩니다.
        </p>
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
                  placeholder="옵션명 (예: 기본형, 프리미엄)"
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
                  placeholder="옵션 설명 (선택)"
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

      {/* 기간 */}
      <Card title="노출 기간" required>
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

      {/* 집도의 */}
      <Card title="집도의">
        <div className="flex flex-wrap gap-1.5">
          {SURGEONS.map((s) => {
            const sel = surgeons.has(s);
            return (
              <button
                key={s}
                onClick={() => {
                  const next = new Set(surgeons);
                  if (next.has(s)) next.delete(s);
                  else next.add(s);
                  setSurgeons(next);
                }}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{
                  backgroundColor: sel ? '#F4EFFF' : '#fff',
                  color: sel ? '#7C3AED' : '#51535C',
                  border: `1px solid ${sel ? '#7C3AED' : '#E5E7EB'}`,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 상세 설명 */}
      <Card title="상세 설명" required>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="시술 과정, 회복 기간, 주의사항 등 이벤트 상세 내용을 작성해주세요."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] resize-none"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{description.length}/2000</p>
      </Card>

      {/* 노출 지역 */}
      <Card title="노출 지역">
        <div className="flex gap-1.5">
          {(['전국', '서울/수도권', '해외'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: region === r ? '#F4EFFF' : '#fff',
                color: region === r ? '#7C3AED' : '#51535C',
                border: `1px solid ${region === r ? '#7C3AED' : '#E5E7EB'}`,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      {/* 심의 약관 */}
      <div className="bg-[#FFF8E1] rounded-lg px-3 py-3 flex items-start gap-2">
        <Info size={14} className="text-[#B45309] mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-[#B45309] leading-relaxed">
          의료광고 사전심의(의료법 §57)에 따라 심의 필증 번호를 상세 설명에 포함해주세요.
          허위·과장 광고는 반려될 수 있습니다.
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="w-4 h-4"
        />
        (필수) 의료광고 심의 및 가이드라인을 확인했으며, 허위·과장 광고가 아님에 동의합니다.
      </label>

      {/* Submit bar */}
      <div className="sticky bottom-0 -mx-3 lg:-mx-5 px-3 lg:px-5 py-3 bg-white border-t border-gray-200 flex gap-2">
        <button
          onClick={() => router.push('/partner/events/list')}
          className="px-5 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700"
        >
          취소
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="flex-1 py-2.5 rounded-lg text-[13px] font-bold btn-press"
          style={{
            backgroundColor: canSubmit ? '#7C3AED' : '#E5E7EB',
            color: canSubmit ? '#fff' : '#A4ABBA',
          }}
        >
          등록 및 승인 요청
        </button>
      </div>

      {showSuccess && <SuccessModal onClose={() => router.push('/partner/events/approval')} />}
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
    <section className="bg-white rounded-xl border border-gray-200 p-4">
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

function ImageSlot({
  value,
  onChange,
  aspect,
  hint,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  aspect: string;
  hint?: string;
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-3 text-center">
          <Upload size={22} />
          <p className="text-[12px] font-semibold mt-2 text-gray-600">이미지 업로드</p>
          {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
        </div>
      )}
    </label>
  );
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-3 modal-overlay-enter">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center modal-content-enter">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#F4EFFF] flex items-center justify-center mb-3">
          <CheckCircle2 size={30} className="text-[#7C3AED]" />
        </div>
        <h3 className="text-[16px] font-bold text-gray-900 mb-1">승인 요청이 접수되었습니다</h3>
        <p className="text-[12px] text-gray-500 mb-5 leading-relaxed">
          검수 완료까지 영업일 기준 1~2일 소요됩니다.
          <br />
          결과는 알림과 승인 요청 내역에서 확인할 수 있습니다.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-[#7C3AED] text-white text-[13px] font-bold"
        >
          확인
        </button>
      </div>
    </div>
  );
}
