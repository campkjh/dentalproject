'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, Plus, Building2 } from 'lucide-react';
import { useStore } from '@/store';
import { ImageUploader } from '@/components/admin/ImageUploader';
import {
  PageHeader, FilterChips, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState,
  AdminListCard, Toolbar, Count, LoadingRows, AdminModal,
} from '@/components/admin/ui';

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
const statusTone: Record<ApiStatus, 'orange' | 'green' | 'gray' | 'red'> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'gray',
  suspended: 'red',
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

  const GRID = 'grid grid-cols-[1.5fr_1fr_1.2fr_0.8fr_0.7fr_1fr_0.8fr_auto] gap-4 items-center';

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <>
            <button type="button" className="adm-btn" onClick={handleExport}>
              <Download size={16} /> 내보내기
            </button>
            <button type="button" className="adm-btn primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> 신규 등록
            </button>
          </>
        }
      />

      {error && <p className="adm-note red">{error}</p>}

      <StatRow cols={4}>
        <StatCard label="전체 병원" value={stats.total} suffix="곳" />
        <StatCard label="승인 대기" value={stats.pending} suffix="곳" accent="#F59E0B" />
        <StatCard label="승인 완료" value={stats.approved} suffix="곳" accent="#1AB554" />
        <StatCard label="정지/거절" value={stats.suspended} suffix="곳" accent="#E54848" />
      </StatRow>

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="병원명, 대표원장, 연락처 검색" width={300} />
              <span className="grow" />
              <Count n={filtered.length} unit="곳" />
            </Toolbar>
            <Toolbar>
              <FilterChips value={filter} onChange={setFilter} options={FILTER_TABS} ariaLabel="병원 상태" />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Building2 size={22} />} title="표시할 병원이 없어요" hint="오른쪽 위 '신규 등록'으로 추가해 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <div>병원명</div>
                <div>대표원장</div>
                <div>연락처</div>
                <div>카테고리</div>
                <div>의사</div>
                <div>등록일</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>
              {filtered.map((h) => (
                <div key={h.id} className={`${GRID} adm-grow`}>
                  <div className="min-w-0">
                    <span className="adm-cell-main">{h.name}</span>
                    <span className="adm-cell-sub adm-mono">{h.id.slice(0, 8)}</span>
                  </div>
                  <div className="adm-cell">{h.ceo}</div>
                  <div className="adm-cell">{h.phone}</div>
                  <div><StatusBadge tone="gray">{h.category}</StatusBadge></div>
                  <div className="adm-num">{h.doctorCount}명</div>
                  <div className="adm-cell dim">{h.registeredDate}</div>
                  <div><StatusBadge tone={statusTone[h.status]}>{statusLabel[h.status]}</StatusBadge></div>
                  <div className="adm-actions">
                    <PillButton onClick={() => setDetailHospital(h)}>서류 보기</PillButton>
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
            </div>
          </div>
        )}
        {!loading && (
          <div className="adm-table-foot">
            전체 <b>{filtered.length.toLocaleString()}</b>곳 표시 중
          </div>
        )}
      </AdminListCard>

      {/* 신규 등록 */}
      {showCreate && (
        <AdminModal
          onClose={() => setShowCreate(false)}
          busy={createBusy}
          title="신규 병원 등록"
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => setShowCreate(false)} disabled={createBusy}>
                취소
              </button>
              <button
                type="button"
                className="adm-btn primary"
                onClick={handleCreate}
                disabled={createBusy || !createForm.name.trim()}
              >
                {createBusy ? '등록 중…' : '등록하기'}
              </button>
            </>
          }
        >
          <div className="adm-field">
            <label className="adm-label">병원명 <span style={{ color: '#F04452' }}>*</span></label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="adm-input"
              placeholder="예) 서울미소치과"
              autoFocus
            />
          </div>
          <div className="adm-field">
            <label className="adm-label">카테고리 <span style={{ color: '#F04452' }}>*</span></label>
            <div className="adm-chips">
              {Object.entries(categoryLabel).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  className={`adm-chip ${createForm.category === k ? 'on' : ''}`}
                  style={createForm.category === k ? undefined : { background: '#F2F4F6' }}
                  onClick={() => setCreateForm((f) => ({ ...f, category: k }))}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label">연락처</label>
            <input
              type="text"
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              className="adm-input"
              placeholder="02-0000-0000"
            />
          </div>
          <div className="adm-field">
            <label className="adm-label">병원 로고</label>
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
          <div className="adm-field">
            <label className="adm-label">초기 상태</label>
            <FilterChips
              value={createForm.status}
              onChange={(st) => setCreateForm((f) => ({ ...f, status: st }))}
              options={(['approved', 'pending', 'suspended', 'rejected'] as ApiStatus[]).map((st) => ({ value: st, label: statusLabel[st] }))}
              ariaLabel="초기 상태"
            />
          </div>
          {createError && <p className="adm-note red mt-4">{createError}</p>}
        </AdminModal>
      )}

      {/* 제출 서류 검토 */}
      {detailHospital && (
        <AdminModal
          onClose={() => setDetailHospital(null)}
          width={640}
          title={detailHospital.name}
          sub="제출 서류 검토"
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => setDetailHospital(null)}>
                닫기
              </button>
              {detailHospital.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="adm-btn danger"
                    onClick={() => {
                      const target = detailHospital;
                      setDetailHospital(null);
                      handleStatusChange(target, 'rejected', '거절');
                    }}
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    className="adm-btn primary"
                    onClick={() => {
                      const target = detailHospital;
                      setDetailHospital(null);
                      handleStatusChange(target, 'approved', '승인');
                    }}
                  >
                    승인
                  </button>
                </>
              )}
            </>
          }
        >
          <div className="adm-kvbox">
            <div className="adm-kv"><span>대표원장</span><span>{detailHospital.ceo}</span></div>
            <div className="adm-kv"><span>연락처</span><span>{detailHospital.phone}</span></div>
            <div className="adm-kv"><span>카테고리</span><span>{detailHospital.category}</span></div>
            <div className="adm-kv"><span>등록일</span><span>{detailHospital.registeredDate}</span></div>
            <div className="adm-kv"><span>주소</span><span>{detailHospital.address || '-'}</span></div>
          </div>

          <p className="adm-label mt-5">제출 서류</p>
          {Object.keys(detailHospital.submittedDocuments).length === 0 ? (
            <EmptyState title="첨부된 서류가 없어요" hint="기존 신청건은 서류가 저장되어 있지 않을 수 있어요." />
          ) : (
            <div className="space-y-2.5">
              {Object.entries(detailHospital.submittedDocuments).map(([title, url]) => {
                const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
                const isImage = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext);
                return (
                  <div key={title} className="adm-kvbox" style={{ padding: 14 }}>
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <span className="adm-cell-main">{title}</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="adm-link flex-shrink-0">
                        원본 열기
                      </a>
                    </div>
                    {isImage ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={title} className="w-full max-h-[360px] object-contain rounded-xl bg-white" />
                      </a>
                    ) : (
                      <div className="rounded-xl bg-white px-3.5 py-3 flex items-center justify-between gap-3">
                        <span className="adm-cell">{url.split('/').pop()}</span>
                        <span className="adm-badge">{(ext || 'file').toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AdminModal>
      )}
    </div>
  );
}
