'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Download,
  Users,
  UserCheck,
  Stethoscope,
  Building2,
  MoreHorizontal,
  Eye,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type UserStatus = '활성' | '정지' | '탈퇴';
type UserRole = '일반' | '의사' | '병원관리자';
type SignupType = '카카오' | '애플' | '이메일';

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  signupType: SignupType;
  role: UserRole;
  joinDate: string;
  status: UserStatus;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusBadge: Record<UserStatus, string> = {
  '활성': 'bg-green-100 text-green-700',
  '정지': 'bg-red-100 text-red-700',
  '탈퇴': 'bg-gray-100 text-gray-500',
};

const roleBadge: Record<UserRole, string> = {
  '일반': 'bg-blue-100 text-blue-700',
  '의사': 'bg-purple-100 text-purple-700',
  '병원관리자': 'bg-orange-100 text-orange-700',
};

const signupBadge: Record<SignupType, string> = {
  '카카오': 'bg-yellow-100 text-yellow-800',
  '애플': 'bg-gray-900 text-white',
  '이메일': 'bg-gray-100 text-gray-600',
};

const filterOptions = ['전체', '일반회원', '의사', '병원관리자'] as const;

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>('전체');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/users', { cache: 'no-store' });
        if (!res.ok) return;
        const { users: apiUsers } = await res.json();
        if (cancelled) return;
        setUsers(
          (apiUsers ?? []).map((u: any, i: number) => ({
            id: i + 1,
            name: u.name || '(미입력)',
            email: u.email || '-',
            phone: u.phone || '-',
            signupType: (u.login_type === 'kakao' ? '카카오' : u.login_type === 'apple' ? '애플' : '이메일') as SignupType,
            role: (u.is_admin ? '병원관리자' : u.is_doctor ? '의사' : '일반') as UserRole,
            joinDate: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
            status: '활성' as UserStatus,
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: '전체 회원', value: users.length.toLocaleString(), icon: Users, color: 'bg-blue-500' },
    { label: '일반 회원', value: users.filter(u => u.role === '일반').length.toLocaleString(), icon: UserCheck, color: 'bg-green-500' },
    { label: '의사 회원', value: users.filter(u => u.role === '의사').length.toLocaleString(), icon: Stethoscope, color: 'bg-purple-500' },
    { label: '병원관리자', value: users.filter(u => u.role === '병원관리자').length.toLocaleString(), icon: Building2, color: 'bg-orange-500' },
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: '정지' | '삭제'; user: UserRow } | null>(null);
  // Replaced by state + API fetch above

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.includes(searchQuery) ||
      user.email.includes(searchQuery) ||
      user.phone.includes(searchQuery);
    const matchesFilter =
      filter === '전체' ||
      (filter === '일반회원' && user.role === '일반') ||
      (filter === '의사' && user.role === '의사') ||
      (filter === '병원관리자' && user.role === '병원관리자');
    return matchesSearch && matchesFilter;
  });

  const handleAction = (type: '정지' | '삭제', user: UserRow) => {
    setOpenDropdownId(null);
    setConfirmModal({ type, user });
  };

  const confirmAction = () => {
    if (!confirmModal) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== confirmModal.user.id) return u;
        if (confirmModal.type === '정지') return { ...u, status: '정지' as UserStatus };
        if (confirmModal.type === '삭제') return { ...u, status: '탈퇴' as UserStatus };
        return u;
      })
    );
    setConfirmModal(null);
  };

  const handleExportCSV = () => {
    const headers = '번호,이름,이메일,연락처,가입유형,회원유형,가입일,상태';
    const rows = filteredUsers.map(
      (u) => `${u.id},${u.name},${u.email},${u.phone},${u.signupType},${u.role},${u.joinDate},${u.status}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `회원목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = 125;
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
        <h2 className="text-2xl font-bold text-gray-900">회원 관리</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download size={16} />
          CSV 내보내기
        </button>
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
              placeholder="이름, 이메일, 연락처로 검색..."
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
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일/연락처</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입유형</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원유형</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-500">{user.id}</td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user.phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${signupBadge[user.signupType]}`}>
                      {user.signupType}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{user.joinDate}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal size={18} className="text-gray-500" />
                      </button>
                      {openDropdownId === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => setOpenDropdownId(null)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Eye size={14} />
                            상세보기
                          </button>
                          {user.status !== '정지' && user.status !== '탈퇴' && (
                            <button
                              onClick={() => handleAction('정지', user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              <Ban size={14} />
                              회원 정지
                            </button>
                          )}
                          {user.status !== '탈퇴' && (
                            <button
                              onClick={() => handleAction('삭제', user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                              회원 탈퇴
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            전체 <span className="font-medium text-gray-900">12,458</span>명 중{' '}
            <span className="font-medium text-gray-900">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, 12458)}</span>
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
              confirmModal.type === '정지' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              {confirmModal.type === '정지' ? (
                <Ban size={24} className="text-orange-600" />
              ) : (
                <Trash2 size={24} className="text-red-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              회원 {confirmModal.type} 확인
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-medium text-gray-900">{confirmModal.user.name}</span> 회원을{' '}
              {confirmModal.type === '정지' ? '정지 처리' : '탈퇴 처리'}하시겠습니까?
              {confirmModal.type === '삭제' && (
                <span className="block mt-1 text-red-500">이 작업은 되돌릴 수 없습니다.</span>
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
                  confirmModal.type === '정지'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {confirmModal.type === '정지' ? '정지하기' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
