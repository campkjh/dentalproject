'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Download,
  Building2,
  Clock,
  CheckCircle2,
  Ban,
  Plus,
  MoreHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

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
}

const statusLabel: Record<ApiStatus, string> = {
  pending: '승인대기',
  approved: '승인완료',
  rejected: '거절',
  suspended: '정지',
};

const statusBadge: Record<ApiStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-200 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
};

const categoryLabel: Record<string, string> = {
  dental: '치과',
  plastic: '성형외과',
  dermatology: '피부과',
  eye: '안과',
  'korean-medicine': '한의원',
};

const filterOptions = ['전체', '승인대기', '승인완료', '거절', '정지'] as const;
type FilterOpt = (typeof filterOptions)[number];

const filterToStatus: Record<Exclude<FilterOpt, '전체'>, ApiStatus> = {
  '승인대기': 'pending',
  '승인완료': 'approved',
  '거절': 'rejected',
  '정지': 'suspended',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowFromApi(h: any): HospitalRow {
  return {
    id: h.id,
    name: h.name,
    ceo: h.owner?.name ?? '-',
    phone: h.phone ?? h.owner?.phone ?? '-',
    category: categoryLabel[h.category] ?? h.category ?? '기타',
    doctorCount: (h.doctors ?? []).length,
    registeredDate: h.created_at ? new Date(h.created_at).toISOString().slice(0, 10) : '',
    status: h.status,
  };
}

export default function AdminHospitalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOpt>('전체');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: '승인' | '거절' | '정지' | '정지해제';
    hospital: HospitalRow;
  } | null>(null);

  const reload = async () => {
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

  useEffect(() => {
    reload();
  }, []);

  const stats = useMemo(() => {
    const total = hospitals.length;
    const pending = hospitals.filter((h) => h.status === 'pending').length;
    const approved = hospitals.filter((h) => h.status === 'approved').length;
    const suspended = hospitals.filter((h) => h.status === 'suspended' || h.status === 'rejected').length;
    return [
      { label: '전체', value: total.toString(), icon: Building2, color: 'bg-blue-500' },
      { label: '승인대기', value: pending.toString(), icon: Clock, color: 'bg-yellow-500' },
      { label: '승인완료', value: approved.toString(), icon: CheckCircle2, color: 'bg-green-500' },
      { label: '정지/거절', value: suspended.toString(), icon: Ban, color: 'bg-red-500' },
    ];
  }, [hospitals]);

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      !searchQuery ||
      h.name.includes(searchQuery) ||
      h.ceo.includes(searchQuery) ||
      h.phone.includes(searchQuery);
    const matchesFilter = filter === '전체' || filterToStatus[filter as Exclude<FilterOpt, '전체'>] === h.status;
    return matchesSearch && matchesFilter;
  });

  const handleAction = (type: '승인' | '거절' | '정지' | '정지해제', hospital: HospitalRow) => {
    setOpenDropdownId(null);
    setConfirmModal({ type, hospital });
  };

  const confirmAction = async () => {
    if (!confirmModal) return;
    const newStatus: ApiStatus =
      confirmModal.type === '승인' || confirmModal.type === '정지해제'
        ? 'approved'
        : confirmModal.type === '거절'
          ? 'rejected'
          : 'suspended';
    try {
      const res = await fetch(`/api/admin/hospitals/${confirmModal.hospital.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setHospitals((prev) =>
          prev.map((h) => (h.id === confirmModal.hospital.id ? { ...h, status: newStatus } : h))
        );
      }
    } catch {
      // ignore — UI keeps optimistic state until reload
    } finally {
      setConfirmModal(null);
    }
  };

  const handleExport = () => {
    const headers = '번호,병원명,대표원장,연락처,카테고리,소속의사수,등록일,상태';
    const rows = filteredHospitals.map(
      (h) =>
        `${h.id},${h.name},${h.ceo},${h.phone},${h.category},${h.doctorCount},${h.registeredDate},${statusLabel[h.status]}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `병원목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
        <p className="text-xs text-red-500">관리자 권한(profiles.is_admin = true)이 있는 계정으로 로그인해야 합니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">병원 관리</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            내보내기
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] rounded-lg text-sm text-white hover:bg-[#6D28D9] transition-colors shadow-sm">
            <Plus size={16} />
            신규 병원 등록
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="병원명, 대표원장, 연락처로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOpt)}
              className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">병원명</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대표원장</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">소속의사수</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHospitals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                    조건에 맞는 병원이 없습니다
                  </td>
                </tr>
              ) : (
                filteredHospitals.map((hospital) => (
                  <tr key={hospital.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{hospital.name}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{hospital.ceo}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{hospital.phone}</td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {hospital.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 text-center">{hospital.doctorCount}명</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{hospital.registeredDate}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[hospital.status]}`}>
                        {statusLabel[hospital.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {hospital.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction('승인', hospital)}
                            className="px-3 py-1.5 bg-[#7C3AED] text-white text-xs font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleAction('거절', hospital)}
                            className="px-3 py-1.5 bg-white border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
                          >
                            거절
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === hospital.id ? null : hospital.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreHorizontal size={18} className="text-gray-500" />
                          </button>
                          {openDropdownId === hospital.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <a
                                href={`/hospital/detail/${hospital.id}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenDropdownId(null)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Eye size={14} />
                                상세보기
                              </a>
                              {hospital.status === 'approved' && (
                                <button
                                  onClick={() => handleAction('정지', hospital)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Ban size={14} />
                                  정지
                                </button>
                              )}
                              {(hospital.status === 'suspended' || hospital.status === 'rejected') && (
                                <button
                                  onClick={() => handleAction('정지해제', hospital)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                  승인 처리
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            전체 <span className="font-medium text-gray-900">{hospitals.length}</span>개 중 표시{' '}
            <span className="font-medium text-gray-900">{filteredHospitals.length}</span>
          </p>
          <button
            onClick={reload}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft size={14} />
            <ChevronRight size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmModal.type === '승인' || confirmModal.type === '정지해제'
                  ? 'bg-green-100'
                  : confirmModal.type === '거절'
                    ? 'bg-red-100'
                    : 'bg-orange-100'
              }`}
            >
              {confirmModal.type === '승인' || confirmModal.type === '정지해제' ? (
                <CheckCircle2 size={24} className="text-green-600" />
              ) : confirmModal.type === '거절' ? (
                <X size={24} className="text-red-600" />
              ) : (
                <Ban size={24} className="text-orange-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">병원 {confirmModal.type} 확인</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-medium text-gray-900">{confirmModal.hospital.name}</span>을(를){' '}
              {confirmModal.type === '승인'
                ? '승인 처리'
                : confirmModal.type === '정지해제'
                  ? '다시 승인'
                  : confirmModal.type === '거절'
                    ? '거절 처리'
                    : '정지 처리'}
              하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  confirmModal.type === '승인' || confirmModal.type === '정지해제'
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                    : confirmModal.type === '거절'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {confirmModal.type}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
