'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Download, Plus, X, AlertCircle, Building2 } from 'lucide-react';
import { useStore } from '@/store';
import { ImageUploader } from '@/components/admin/ImageUploader';

type ApiStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

interface HospitalRow {
  id: string;
  name: string;
  ceo: string;
  phone: string;
  category: string;
  doctorCount: number;
  registeredDate: string;
  status: ApiStatus;
  address: string;
  submittedDocuments: Record<string, string>;
}

const statusLabel: Record<ApiStatus, string> = {
  pending: '승인대기',
  approved: '승인완료',
  rejected: '거절',
  suspended: '정지',
};
const statusColor: Record<ApiStatus, { bg: string; text: string }> = {
  pending: { bg: '#FFF4E5', text: '#F59E0B' },
  approved: { bg: '#E8F8EE', text: '#1AB554' },
  rejected: { bg: '#F2F4F6', text: '#8B95A1' },
  suspended: { bg: '#FEECEC', text: '#E54848' },
};

const categoryLabel: Record<string, string> = {
  dental: '치과', plastic: '성형외과', dermatology: '피부과', eye: '안과', 'korean-medicine': '한의원',
};

const FILTER_TABS: { value: 'all' | ApiStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '승인대기' },
  { value: 'approved', label: '승인완료' },
  { value: 'suspended', label: '정지' },
  { value: 'rejected', label: '거절' },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowFromApi(h: any): HospitalRow {
  const docs =
    h.submitted_documents && typeof h.submitted_documents === 'object' && !Array.isArray(h.submitted_documents)
      ? (h.submitted_documents as Record<string, string>)
      : {};
  return {
    id: h.id,
    name: h.name,
    ceo: h.owner?.name ?? '-',
    phone: h.phone ?? h.owner?.phone ?? '-',
    category: categoryLabel[h.category] ?? h.category ?? '기타',
    doctorCount: (h.doctors ?? []).length,
    registeredDate: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
    status: h.status,
    address: h.address ?? '',
    submittedDocuments: docs,
  };
}

function PillButton({
  children, onClick, tone = 'gray',
}: { children: React.ReactNode; onClick?: () => void; tone?: 'gray' | 'blue' | 'red' | 'green' | 'orange' }) {
  const styles: Record<string, string> = {
    gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
    blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
    red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
    green: 'bg-[#E8F8EE] text-[#1AB554] hover:bg-[#D6F1DF]',
    orange: 'bg-[#FFF4E5] text-[#F59E0B] hover:bg-[#FFE9CC]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center h-[28px] px-[10px] rounded-md text-[12px] font-semibold transition-colors ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

export default function AdminHospitalsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ApiStatus>('all');
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', category: 'dental', phone: '', logoUrl: '', status: 'approved' as ApiStatus });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailHospital, setDetailHospital] = useState<HospitalRow | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hospitals', { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || '데이터를 불러올 수 없습니다.');
        return;
      }
      const { hospitals: data } = await res.json();
      setHospitals((data ?? []).map(rowFromApi));
      setError(null);
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const stats = useMemo(() => ({
    total: hospitals.length,
    pending: hospitals.filter((h) => h.status === 'pending').length,
    approved: hospitals.filter((h) => h.status === 'approved').length,
    suspended: hospitals.filter((h) => h.status === 'suspended' || h.status === 'rejected').length,
  }), [hospitals]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return hospitals.filter((h) => {
      const matchSearch =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.ceo.toLowerCase().includes(q) ||
        h.phone.toLowerCase().includes(q);
      const matchStatus = filter === 'all' || h.status === filter;
      return matchSearch && matchStatus;
    });
  }, [hospitals, searchQuery, filter]);

  const handleStatusChange = (h: HospitalRow, newStatus: ApiStatus, actionLabel: string) => {
    showConfirm(
      `${h.name} ${actionLabel}`,
      `"${h.name}"의 상태를 "${statusLabel[newStatus]}"(으)로 변경합니다.`,
      async () => {
        const res = await fetch(`/api/admin/hospitals/${h.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showAlert(data?.error ?? '처리 실패');
          return;
        }
        setHospitals((prev) => prev.map((x) => (x.id === h.id ? { ...x, status: newStatus } : x)));
      },
      { confirmText: actionLabel, cancelText: '취소' }
    );
  };

  const handleCreate = async () => {
    setCreateBusy(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          category: createForm.category,
          phone: createForm.phone,
          logo_url: createForm.logoUrl,
          status: createForm.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data?.error ?? '등록에 실패했습니다.');
        return;
      }
      setShowCreate(false);
      setCreateForm({ name: '', category: 'dental', phone: '', logoUrl: '', status: 'approved' });
      await reload();
    } finally {
      setCreateBusy(false);
    }
  };

  const handleExport = () => {
    const headers = '번호,병원명,대표원장,연락처,카테고리,소속의사수,등록일,상태';
    const rows = filtered.map(
      (h, i) =>
        `${i + 1},${h.name},${h.ceo},${h.phone},${h.category},${h.doctorCount},${h.registeredDate},${statusLabel[h.status]}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `병원목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls =
    'w-full h-11 px-3.5 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white transition-all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">병원 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-1.5">등록된 병원을 조회하고 승인·정지 처리를 할 수 있어요.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#E5E8EB] rounded-[10px] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
          >
            내보내기
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-[#3182F6] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[#1B64DA]"
          >
            신규 등록
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '전체 병원', value: stats.total, accent: '#191F28' },
          { label: '승인 대기', value: stats.pending, accent: '#F59E0B' },
          { label: '승인 완료', value: stats.approved, accent: '#1AB554' },
          { label: '정지/거절', value: stats.suspended, accent: '#E54848' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
            <p className="text-[12px] font-medium text-[#8B95A1]">{s.label}</p>
            <p className="text-[24px] font-bold tracking-tight mt-1" style={{ color: s.accent }}>
              {s.value.toLocaleString()}
              <span className="text-[13px] font-medium text-[#8B95A1] ml-1">곳</span>
            </p>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className="h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors border"
                style={
                  active
                    ? { background: '#191F28', color: '#FFFFFF', borderColor: '#191F28' }
                    : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-[280px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
          <input
            type="text"
            placeholder="병원명, 대표원장, 연락처 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-[#E5E8EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 mx-auto bg-[#F2F4F6] rounded-full flex items-center justify-center mb-3">
              <Building2 size={20} className="text-[#8B95A1]" />
            </div>
            <p className="text-[14px] font-semibold text-[#4E5968]">표시할 병원이 없어요</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">우측 상단의 "신규 등록"으로 추가해 보세요.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_1fr_1.2fr_0.8fr_0.7fr_1fr_0.8fr_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>병원명</div>
              <div>대표원장</div>
              <div>연락처</div>
              <div>카테고리</div>
              <div>의사</div>
              <div>등록일</div>
              <div>상태</div>
              <div className="text-right">관리</div>
            </div>
            {filtered.map((h, i) => (
              <div
                key={h.id}
                className="grid grid-cols-[1.5fr_1fr_1.2fr_0.8fr_0.7fr_1fr_0.8fr_auto] gap-4 items-center px-5 py-3.5 transition-colors hover:bg-[#F9FAFB]"
                style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#191F28] truncate">{h.name}</p>
                  <p className="text-[11px] text-[#8B95A1] font-mono mt-0.5">{h.id.slice(0, 8)}</p>
                </div>
                <div className="text-[13px] text-[#4E5968] truncate">{h.ceo}</div>
                <div className="text-[13px] text-[#4E5968]">{h.phone}</div>
                <div>
                  <span className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold bg-[#F2F4F6] text-[#4E5968]">
                    {h.category}
                  </span>
                </div>
                <div className="text-[13px] text-[#4E5968]">{h.doctorCount}명</div>
                <div className="text-[13px] text-[#4E5968]">{h.registeredDate}</div>
                <div>
                  <span
                    className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                    style={{ background: statusColor[h.status].bg, color: statusColor[h.status].text }}
                  >
                    {statusLabel[h.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <PillButton tone="gray" onClick={() => setDetailHospital(h)}>서류 보기</PillButton>
                  {h.status === 'pending' && (
                    <>
                      <PillButton tone="green" onClick={() => handleStatusChange(h, 'approved', '승인')}>승인</PillButton>
                      <PillButton tone="red" onClick={() => handleStatusChange(h, 'rejected', '거절')}>거절</PillButton>
                    </>
                  )}
                  {h.status === 'approved' && (
                    <PillButton tone="orange" onClick={() => handleStatusChange(h, 'suspended', '정지')}>정지</PillButton>
                  )}
                  {(h.status === 'suspended' || h.status === 'rejected') && (
                    <PillButton tone="blue" onClick={() => handleStatusChange(h, 'approved', '복원')}>복원</PillButton>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="px-5 py-4 border-t border-[#F2F4F6]">
          <p className="text-[12px] text-[#8B95A1] text-center">
            전체 <span className="font-semibold text-[#191F28]">{filtered.length.toLocaleString()}</span>곳 표시 중
          </p>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[#191F28]">신규 병원 등록</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">병원명 <span className="text-[#E54848]">*</span></label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                  placeholder="예) 서울미소치과"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">카테고리 <span className="text-[#E54848]">*</span></label>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(categoryLabel).map(([k, v]) => {
                    const active = createForm.category === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setCreateForm((f) => ({ ...f, category: k }))}
                        className="h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-colors border"
                        style={
                          active
                            ? { background: '#E5F1FF', color: '#3182F6', borderColor: '#3182F6' }
                            : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
                        }
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">연락처</label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                  placeholder="02-0000-0000"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">병원 로고</label>
                <div className="max-w-[200px]">
                  <ImageUploader
                    value={createForm.logoUrl}
                    onChange={(url) => setCreateForm((f) => ({ ...f, logoUrl: url }))}
                    folder="hospital-logos"
                    aspect="1/1"
                    placeholder="로고 업로드"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">초기 상태</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['approved', 'pending', 'suspended', 'rejected'] as ApiStatus[]).map((st) => {
                    const active = createForm.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCreateForm((f) => ({ ...f, status: st }))}
                        className="h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-colors border"
                        style={
                          active
                            ? { background: '#E5F1FF', color: '#3182F6', borderColor: '#3182F6' }
                            : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
                        }
                      >
                        {statusLabel[st]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {createError}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                disabled={createBusy}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={createBusy || !createForm.name.trim()}
                className="flex-1 h-11 bg-[#3182F6] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50"
              >
                {createBusy ? '등록 중…' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {detailHospital && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
          onClick={() => setDetailHospital(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-[#F2F4F6]">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#8B95A1]">제출 서류 검토</p>
                <h3 className="text-[18px] font-bold text-[#191F28] mt-0.5 truncate">{detailHospital.name}</h3>
              </div>
              <button onClick={() => setDetailHospital(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3 mb-5 pb-5 border-b border-[#F2F4F6] text-[13px]">
                <div>
                  <p className="text-[11px] font-semibold text-[#8B95A1]">대표원장</p>
                  <p className="text-[#191F28] mt-0.5">{detailHospital.ceo}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#8B95A1]">연락처</p>
                  <p className="text-[#191F28] mt-0.5">{detailHospital.phone}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#8B95A1]">카테고리</p>
                  <p className="text-[#191F28] mt-0.5">{detailHospital.category}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#8B95A1]">등록일</p>
                  <p className="text-[#191F28] mt-0.5">{detailHospital.registeredDate}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold text-[#8B95A1]">주소</p>
                  <p className="text-[#191F28] mt-0.5">{detailHospital.address || '-'}</p>
                </div>
              </div>

              <p className="text-[14px] font-bold text-[#191F28] mb-3">제출 서류</p>
              {Object.keys(detailHospital.submittedDocuments).length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E5E8EB] py-10 text-center">
                  <p className="text-[13px] text-[#8B95A1]">첨부된 서류가 없습니다.</p>
                  <p className="text-[11px] text-[#C9CDD2] mt-1">기존 신청건은 서류가 저장되어 있지 않을 수 있습니다.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(detailHospital.submittedDocuments).map(([title, url]) => {
                    const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext);
                    return (
                      <div key={title} className="rounded-xl border border-[#E5E8EB] p-3.5">
                        <div className="flex items-center justify-between mb-2 gap-3">
                          <p className="text-[13px] font-semibold text-[#191F28] truncate">{title}</p>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-[12px] font-semibold text-[#3182F6] hover:underline"
                          >
                            원본 열기
                          </a>
                        </div>
                        {isImage ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={url}
                              alt={title}
                              className="w-full max-h-[360px] object-contain rounded-lg bg-[#F9FAFB] border border-[#F2F4F6]"
                            />
                          </a>
                        ) : (
                          <div className="rounded-lg bg-[#F9FAFB] border border-[#F2F4F6] px-3.5 py-3 flex items-center justify-between">
                            <span className="text-[12px] text-[#4E5968] truncate">{url.split('/').pop()}</span>
                            <span className="text-[11px] font-semibold text-[#8B95A1] uppercase">{ext || 'file'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-7 py-4 border-t border-[#F2F4F6] flex items-center gap-2">
              <button
                onClick={() => setDetailHospital(null)}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
              >
                닫기
              </button>
              {detailHospital.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      const target = detailHospital;
                      setDetailHospital(null);
                      handleStatusChange(target, 'rejected', '거절');
                    }}
                    className="flex-1 h-11 bg-[#FEECEC] text-[#E54848] rounded-[10px] text-[14px] font-semibold hover:bg-[#FCDCDC]"
                  >
                    거절
                  </button>
                  <button
                    onClick={() => {
                      const target = detailHospital;
                      setDetailHospital(null);
                      handleStatusChange(target, 'approved', '승인');
                    }}
                    className="flex-1 h-11 bg-[#1AB554] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#159A47]"
                  >
                    승인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
