'use client';

import { useState } from 'react';
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

type HospitalStatus = '승인대기' | '승인완료' | '정지';
type HospitalCategory = '치과' | '성형외과' | '피부과' | '안과' | '한의원';

interface HospitalRow {
  id: number;
  name: string;
  ceo: string;
  phone: string;
  category: HospitalCategory;
  doctorCount: number;
  registeredDate: string;
  status: HospitalStatus;
}

const mockHospitals: HospitalRow[] = [
  { id: 342, name: '참포도나무치과의원', ceo: '김태영', phone: '02-1234-5678', category: '치과', doctorCount: 5, registeredDate: '2026-04-05', status: '승인완료' },
  { id: 341, name: '온리프성형외과의원', ceo: '이준호', phone: '02-2345-6789', category: '성형외과', doctorCount: 8, registeredDate: '2026-04-05', status: '승인완료' },
  { id: 340, name: '밝은미래안과', ceo: '박승현', phone: '02-3456-7890', category: '안과', doctorCount: 3, registeredDate: '2026-04-04', status: '승인대기' },
  { id: 339, name: '레브치과의원', ceo: '최민서', phone: '02-4567-8901', category: '치과', doctorCount: 4, registeredDate: '2026-04-04', status: '승인완료' },
  { id: 338, name: '아이디치과', ceo: '정수빈', phone: '02-5678-9012', category: '치과', doctorCount: 6, registeredDate: '2026-04-03', status: '승인완료' },
  { id: 337, name: '글로우피부과의원', ceo: '한지민', phone: '02-6789-0123', category: '피부과', doctorCount: 4, registeredDate: '2026-04-03', status: '승인대기' },
  { id: 336, name: '미소한의원', ceo: '오세진', phone: '02-7890-1234', category: '한의원', doctorCount: 2, registeredDate: '2026-04-02', status: '승인완료' },
  { id: 335, name: '에이플러스성형외과', ceo: '윤지혁', phone: '02-8901-2345', category: '성형외과', doctorCount: 7, registeredDate: '2026-04-02', status: '정지' },
  { id: 334, name: '뉴라인치과', ceo: '임하은', phone: '02-9012-3456', category: '치과', doctorCount: 3, registeredDate: '2026-04-01', status: '승인완료' },
  { id: 333, name: '클리어피부과', ceo: '송태현', phone: '02-0123-4567', category: '피부과', doctorCount: 5, registeredDate: '2026-04-01', status: '승인대기' },
  { id: 332, name: '서울밝은치과', ceo: '강유나', phone: '02-1111-2222', category: '치과', doctorCount: 4, registeredDate: '2026-03-31', status: '승인완료' },
  { id: 331, name: '베스트안과의원', ceo: '배도윤', phone: '02-3333-4444', category: '안과', doctorCount: 3, registeredDate: '2026-03-30', status: '정지' },
];

const stats = [
  { label: '전체', value: '342', icon: Building2, color: 'bg-blue-500' },
  { label: '승인대기', value: '8', icon: Clock, color: 'bg-yellow-500' },
  { label: '승인완료', value: '326', icon: CheckCircle2, color: 'bg-green-500' },
  { label: '정지', value: '8', icon: Ban, color: 'bg-red-500' },
];

const statusBadge: Record<HospitalStatus, string> = {
  '승인대기': 'bg-yellow-100 text-yellow-700',
  '승인완료': 'bg-green-100 text-green-700',
  '정지': 'bg-red-100 text-red-700',
};

const categoryBadge: Record<HospitalCategory, string> = {
  '치과': 'bg-blue-100 text-blue-700',
  '성형외과': 'bg-pink-100 text-pink-700',
  '피부과': 'bg-purple-100 text-purple-700',
  '안과': 'bg-teal-100 text-teal-700',
  '한의원': 'bg-amber-100 text-amber-700',
};

const filterOptions = ['전체', '승인대기', '승인완료', '정지'] as const;

export default function AdminHospitalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>('전체');
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [hospitals, setHospitals] = useState<HospitalRow[]>(mockHospitals);
  const [confirmModal, setConfirmModal] = useState<{
    type: '승인' | '거절' | '정지';
    hospital: HospitalRow;
  } | null>(null);

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      h.name.includes(searchQuery) ||
      h.ceo.includes(searchQuery) ||
      h.phone.includes(searchQuery);
    const matchesFilter = filter === '전체' || h.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAction = (type: '승인' | '거절' | '정지', hospital: HospitalRow) => {
    setOpenDropdownId(null);
    setConfirmModal({ type, hospital });
  };

  const confirmAction = () => {
    if (!confirmModal) return;
    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id !== confirmModal.hospital.id) return h;
        if (confirmModal.type === '승인') return { ...h, status: '승인완료' as HospitalStatus };
        if (confirmModal.type === '거절' || confirmModal.type === '정지') return { ...h, status: '정지' as HospitalStatus };
        return h;
      })
    );
    setConfirmModal(null);
  };

  const handleExport = () => {
    const headers = '번호,병원명,대표원장,연락처,카테고리,소속의사수,등록일,상태';
    const rows = filteredHospitals.map(
      (h) => `${h.id},${h.name},${h.ceo},${h.phone},${h.category},${h.doctorCount},${h.registeredDate},${h.status}`
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

  const totalPages = 35;
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as (typeof filterOptions)[number])}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors cursor-pointer"
            >
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
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
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">병원명</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대표원장</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소속의사수</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHospitals.map((hospital) => (
                <tr key={hospital.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-500">{hospital.id}</td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">{hospital.name}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{hospital.ceo}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{hospital.phone}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${categoryBadge[hospital.category]}`}>
                      {hospital.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 text-center">{hospital.doctorCount}명</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{hospital.registeredDate}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[hospital.status]}`}>
                      {hospital.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {hospital.status === '승인대기' ? (
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
                            <button
                              onClick={() => setOpenDropdownId(null)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Eye size={14} />
                              상세보기
                            </button>
                            {hospital.status === '승인완료' && (
                              <button
                                onClick={() => handleAction('정지', hospital)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Ban size={14} />
                                정지
                              </button>
                            )}
                            {hospital.status === '정지' && (
                              <button
                                onClick={() => handleAction('승인', hospital)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                              >
                                <CheckCircle2 size={14} />
                                정지 해제
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            전체 <span className="font-medium text-gray-900">342</span>개 병원 중{' '}
            <span className="font-medium text-gray-900">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, 342)}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            {getPageNumbers().map((page, idx) =>
              typeof page === 'string' ? (
                <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#7C3AED] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              confirmModal.type === '승인'
                ? 'bg-green-100'
                : confirmModal.type === '거절'
                ? 'bg-red-100'
                : 'bg-orange-100'
            }`}>
              {confirmModal.type === '승인' ? (
                <CheckCircle2 size={24} className="text-green-600" />
              ) : confirmModal.type === '거절' ? (
                <X size={24} className="text-red-600" />
              ) : (
                <Ban size={24} className="text-orange-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              병원 {confirmModal.type} 확인
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-medium text-gray-900">{confirmModal.hospital.name}</span>을(를){' '}
              {confirmModal.type === '승인'
                ? '승인 처리'
                : confirmModal.type === '거절'
                ? '거절 처리'
                : '정지 처리'}
              하시겠습니까?
              {confirmModal.type === '거절' && (
                <span className="block mt-1 text-red-500">거절 시 병원 등록이 반려됩니다.</span>
              )}
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
                  confirmModal.type === '승인'
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                    : confirmModal.type === '거절'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {confirmModal.type === '승인' ? '승인하기' : confirmModal.type === '거절' ? '거절하기' : '정지하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
