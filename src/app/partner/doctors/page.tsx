'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal, Star, ArrowUpDown, X, Upload } from 'lucide-react';

type Doctor = {
  id: string;
  name: string;
  licenseNumber: string;
  category: '의사' | '한의사' | '치과의사';
  profileImage?: string;
  isLead: boolean;
  specialtyCert: string;
  treatments: string[];
  consultEnabled: boolean;
  reviewCount: number;
  rating: number;
  ratingCount: number;
};

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'd1',
    name: '김정우',
    licenseNumber: '의123456',
    category: '의사',
    isLead: true,
    specialtyCert: '성형외과 전문의',
    treatments: ['눈성형', '코성형', '안면윤곽'],
    consultEnabled: true,
    reviewCount: 412,
    rating: 4.8,
    ratingCount: 380,
  },
  {
    id: 'd2',
    name: '이서연',
    licenseNumber: '의789012',
    category: '의사',
    isLead: false,
    specialtyCert: '피부과 전문의',
    treatments: ['보톡스', '필러', '리프팅'],
    consultEnabled: true,
    reviewCount: 298,
    rating: 4.9,
    ratingCount: 250,
  },
  {
    id: 'd3',
    name: '박지훈',
    licenseNumber: '의345678',
    category: '의사',
    isLead: false,
    specialtyCert: '전문의 아님',
    treatments: ['가슴성형', '지방흡입'],
    consultEnabled: false,
    reviewCount: 145,
    rating: 4.6,
    ratingCount: 120,
  },
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [showRegister, setShowRegister] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const toggleConsult = (id: string) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, consultEnabled: !d.consultEnabled } : d))
    );
  };

  const retire = (id: string) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    setMenuOpenId(null);
  };

  const move = (id: string, dir: -1 | 1) => {
    setDoctors((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900">의사 정보</h1>
          <p className="text-[12px] text-gray-500 mt-1">
            총 <span className="text-gray-900 font-semibold">{doctors.length}</span>명의 의사가 등록되어 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReorderMode((v) => !v)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 btn-press flex items-center gap-1"
            style={{ backgroundColor: reorderMode ? '#F5FAEF' : '#fff' }}
          >
            <ArrowUpDown size={13} />
            {reorderMode ? '완료' : '순서 조정하기'}
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="px-3 py-2 rounded-lg bg-[#8DC63F] text-white text-[12px] font-semibold btn-press flex items-center gap-1"
          >
            <Plus size={13} /> 의사 등록하기
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <Th>의사명 / 프로필 이미지</Th>
              <Th>대표원장</Th>
              <Th>의사면허번호</Th>
              <Th>전문의 자격</Th>
              <Th>진료항목</Th>
              <Th>의사상담</Th>
              <Th>후기수</Th>
              <Th>평점(건수)</Th>
              <Th>{reorderMode ? '순서' : ''}</Th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d, idx) => (
              <tr key={d.id} className="border-b border-gray-100 last:border-0">
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-gray-700 text-[12px] font-bold flex-shrink-0">
                      {d.name[0]}
                    </div>
                    <span className="font-semibold text-gray-900">{d.name}</span>
                  </div>
                </Td>
                <Td>
                  {d.isLead ? (
                    <span className="inline-flex px-2 py-0.5 rounded bg-[#F5FAEF] text-[#5B8B25] text-[11px] font-bold">
                      대표원장
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td className="text-gray-700">{d.licenseNumber}</Td>
                <Td className="text-gray-700">{d.specialtyCert}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {d.treatments.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Td>
                <Td>
                  <Toggle on={d.consultEnabled} onToggle={() => toggleConsult(d.id)} />
                </Td>
                <Td className="text-gray-900 font-semibold">{d.reviewCount}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <Star size={11} fill="#FBBF24" stroke="#FBBF24" />
                    <span className="text-gray-900 font-semibold">{d.rating.toFixed(1)}</span>
                    <span className="text-gray-400">({d.ratingCount})</span>
                  </div>
                </Td>
                <Td>
                  {reorderMode ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => move(d.id, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(d.id, 1)}
                        disabled={idx === doctors.length - 1}
                        className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === d.id ? null : d.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreHorizontal size={14} className="text-gray-400" />
                      </button>
                      {menuOpenId === d.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div
                            className="absolute right-0 top-full mt-1 z-40 bg-white rounded-lg overflow-hidden scale-in"
                            style={{
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                              minWidth: 120,
                            }}
                          >
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                setEditingId(d.id);
                              }}
                              className="block w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50"
                            >
                              수정하기
                            </button>
                            <button
                              onClick={() => retire(d.id)}
                              className="block w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-gray-50 border-t border-gray-100"
                            >
                              퇴직 처리하기
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSave={(d) => {
        setDoctors((prev) => [...prev, d]);
        setShowRegister(false);
      }} />}
      {editingId && (
        <EditModal
          doctor={doctors.find((d) => d.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            setDoctors((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...patch } : d)));
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-5 rounded-full"
      style={{
        backgroundColor: on ? '#8DC63F' : '#E5E7EB',
        transition: 'background-color 220ms ease',
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
        style={{
          left: on ? 18 : 2,
          transition: 'left 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </button>
  );
}

function RegisterModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Doctor) => void;
}) {
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [category, setCategory] = useState<Doctor['category']>('의사');

  const canSave = name.trim() && license.trim();

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: `d-${Date.now()}`,
      name,
      licenseNumber: license,
      category,
      isLead: false,
      specialtyCert: '전문의 아님',
      treatments: [],
      consultEnabled: false,
      reviewCount: 0,
      rating: 0,
      ratingCount: 0,
    });
  };

  return (
    <ModalShell title="의사 등록하기" onClose={onClose}>
      <div className="space-y-4">
        <Field label="의사명" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="의사명을 정확하게 입력해주세요"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F]"
          />
        </Field>
        <Field label="의사 분류" required>
          <div className="flex gap-2">
            {(['의사', '한의사', '치과의사'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold"
                style={{
                  backgroundColor: category === c ? '#F5FAEF' : '#fff',
                  color: category === c ? '#5B8B25' : '#51535C',
                  border: `1px solid ${category === c ? '#8DC63F' : '#E5E7EB'}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-red-500 mt-1">
            * 의사 분류는 등록 이후 수정이 불가합니다.
          </p>
        </Field>
        <Field label="의사면허번호" required>
          <input
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="의123456"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F]"
          />
          <p className="text-[11px] text-red-500 mt-1">
            * 의사면허번호는 등록 이후 수정이 불가합니다.
          </p>
        </Field>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold"
          style={{
            backgroundColor: canSave ? '#8DC63F' : '#E5E7EB',
            color: canSave ? '#fff' : '#A4ABBA',
          }}
        >
          등록
        </button>
      </div>
    </ModalShell>
  );
}

const TREATMENT_OPTIONS = [
  '눈성형', '코성형', '안면윤곽', '가슴성형', '지방흡입', '리프팅',
  '보톡스', '필러', '모발이식', '치아교정', '임플란트', '피부재생',
  '여드름', '레이저',
];

const SPECIALTY_OPTIONS = [
  '전문의 아님',
  '성형외과 전문의',
  '피부과 전문의',
  '이비인후과 전문의',
  '안과 전문의',
  '정형외과 전문의',
  '내과 전문의',
];

function EditModal({
  doctor,
  onClose,
  onSave,
}: {
  doctor: Doctor;
  onClose: () => void;
  onSave: (patch: Partial<Doctor>) => void;
}) {
  const [name, setName] = useState(doctor.name);
  const [isLead, setIsLead] = useState(doctor.isLead);
  const [specialtyCert, setSpecialtyCert] = useState(doctor.specialtyCert);
  const [treatments, setTreatments] = useState<Set<string>>(new Set(doctor.treatments));
  const [history, setHistory] = useState('정회원\n대한성형외과학회\n국제미용성형학회 회원');
  const [gender, setGender] = useState<'남' | '여'>('남');

  return (
    <ModalShell title="의사 정보 수정" onClose={onClose}>
      <div className="space-y-4">
        <Field label="의사면허번호">
          <input
            value={doctor.licenseNumber}
            readOnly
            className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-500"
          />
          <p className="text-[11px] text-gray-400 mt-1">수정 불가</p>
        </Field>
        <Field label="의사 분류">
          <input
            value={doctor.category}
            readOnly
            className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-500"
          />
          <p className="text-[11px] text-gray-400 mt-1">수정 불가</p>
        </Field>
        <Field label="의사 면허증">
          <FileSlot />
        </Field>
        <Field label="의사명">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F]"
          />
        </Field>
        <Field label="연혁">
          <textarea
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F] resize-none"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            정회원·회원 표시는 가능하나 평생회원·종신회원·최우수회원 등은 금지됩니다.
          </p>
        </Field>
        <Field label="프로필 이미지">
          <FileSlot accept="image/*" />
        </Field>
        <Field label="성별">
          <div className="flex gap-2">
            {(['남', '여'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold"
                style={{
                  backgroundColor: gender === g ? '#F5FAEF' : '#fff',
                  color: gender === g ? '#5B8B25' : '#51535C',
                  border: `1px solid ${gender === g ? '#8DC63F' : '#E5E7EB'}`,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
        <Field label="대표원장 여부">
          <Toggle on={isLead} onToggle={() => setIsLead(!isLead)} />
        </Field>
        <Field label="전문의 자격">
          <select
            value={specialtyCert}
            onChange={(e) => setSpecialtyCert(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F]"
          >
            {SPECIALTY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        {specialtyCert !== '전문의 아님' && (
          <>
            <Field label="전문의 자격번호">
              <input
                placeholder="자격번호 입력 (등록 후 수정 불가)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#8DC63F]"
              />
            </Field>
            <Field label="전문의 자격증">
              <FileSlot accept="image/*,application/pdf" />
            </Field>
          </>
        )}
        <Field label="진료항목">
          <div className="flex flex-wrap gap-1.5">
            {TREATMENT_OPTIONS.map((t) => {
              const sel = treatments.has(t);
              return (
                <button
                  key={t}
                  onClick={() => {
                    const next = new Set(treatments);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    setTreatments(next);
                  }}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    backgroundColor: sel ? '#F5FAEF' : '#fff',
                    color: sel ? '#5B8B25' : '#51535C',
                    border: `1px solid ${sel ? '#8DC63F' : '#E5E7EB'}`,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700"
        >
          취소
        </button>
        <button
          onClick={() =>
            onSave({
              name,
              isLead,
              specialtyCert,
              treatments: Array.from(treatments),
            })
          }
          className="flex-1 py-2.5 rounded-lg bg-[#8DC63F] text-white text-[13px] font-semibold"
        >
          저장
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 modal-overlay-enter flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col modal-content-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
          <button onClick={onClose}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function FileSlot({ accept = 'image/*,application/pdf' }: { accept?: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <label className="block rounded-lg border border-dashed border-gray-300 hover:border-[#8DC63F] bg-gray-50 cursor-pointer transition-colors px-3 py-3">
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFileName(f.name);
        }}
      />
      <div className="flex items-center gap-2 text-[12px]">
        <Upload size={14} className="text-gray-400" />
        <span className={fileName ? 'text-gray-900 font-medium' : 'text-gray-500'}>
          {fileName ?? '파일 선택 (이미지 또는 PDF)'}
        </span>
      </div>
    </label>
  );
}
