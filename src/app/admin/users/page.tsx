'use client';

import { useState, useEffect, useMemo } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Search, Download, Ban, Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';

type UserStatus = '활성' | '정지' | '탈퇴';
type UserRole = '일반' | '의사' | '병원관리자';
type SignupType = '카카오' | '애플' | '이메일';

interface UserRow {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  signupType: SignupType;
  role: UserRole;
  joinDate: string;
  status: UserStatus;
}

const PAGE_SIZE = 20;
/* eslint-disable @typescript-eslint/no-explicit-any */

// Reusable pill button styled like the Toss screenshots (e.g. 수정/삭제)
function PillButton({
  children, onClick, tone = 'gray', disabled,
}: { children: React.ReactNode; onClick?: () => void; tone?: 'gray' | 'blue' | 'red' | 'orange'; disabled?: boolean }) {
  const styles: Record<string, string> = {
    gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
    blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
    red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
    orange: 'bg-[#FFF4E5] text-[#F59E0B] hover:bg-[#FFE9CC]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center h-[28px] px-[10px] rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

const roleColor: Record<UserRole, { bg: string; text: string }> = {
  '일반': { bg: '#F2F4F6', text: '#4E5968' },
  '의사': { bg: '#E5F1FF', text: '#3182F6' },
  '병원관리자': { bg: '#FFF4E5', text: '#F59E0B' },
};
const signupColor: Record<SignupType, { bg: string; text: string }> = {
  '카카오': { bg: '#FFF6BF', text: '#8B5A00' },
  '애플': { bg: '#191F28', text: '#FFFFFF' },
  '이메일': { bg: '#F2F4F6', text: '#4E5968' },
};
const statusColor: Record<UserStatus, { bg: string; text: string }> = {
  '활성': { bg: '#E8F8EE', text: '#1AB554' },
  '정지': { bg: '#FFF4E5', text: '#F59E0B' },
  '탈퇴': { bg: '#F2F4F6', text: '#8B95A1' },
};

const ROLE_TABS: { value: 'all' | UserRole; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '일반', label: '일반회원' },
  { value: '의사', label: '의사' },
  { value: '병원관리자', label: '병원관리자' },
];

function Avatar({ name, uid }: { name: string; uid: string }) {
  // Stable color from uid hash
  const hash = uid.split('').reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0);
  const palette = [
    ['#E5F1FF', '#3182F6'],
    ['#FFF4E5', '#F59E0B'],
    ['#E8F8EE', '#1AB554'],
    ['#FEECEC', '#E54848'],
    ['#F2EAFF', '#7B61FF'],
  ];
  const [bg, fg] = palette[hash % palette.length];
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
      style={{ backgroundColor: bg, color: fg }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function AdminUsersPage() {
  const showAlert = useStore((s) => s.showAlert);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | UserRole>('all');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: '정지' | '삭제'; user: UserRow } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data?.error ?? `회원 목록 불러오기 실패 (HTTP ${res.status})`);
        return;
      }
      const { users: apiUsers } = await res.json();
      setUsers(
        (apiUsers ?? []).map((u: any, i: number) => ({
          id: i + 1,
          uid: u.id,
          name: u.name || '(미입력)',
          email: u.email || '-',
          phone: u.phone || '-',
          signupType: (u.login_type === 'kakao' ? '카카오' : u.login_type === 'apple' ? '애플' : '이메일') as SignupType,
          role: (u.is_admin ? '병원관리자' : u.is_doctor ? '의사' : '일반') as UserRole,
          joinDate: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
          status: (u.is_banned ? '정지' : '활성') as UserStatus,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q);
      const matchRole = filter === 'all' || u.role === filter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, filter]);

  const counts = useMemo(() => ({
    total: users.length,
    일반: users.filter((u) => u.role === '일반').length,
    의사: users.filter((u) => u.role === '의사').length,
    병원관리자: users.filter((u) => u.role === '병원관리자').length,
  }), [users]);

  const { visibleCount, sentinelRef } = useInfiniteScroll(filteredUsers.length, PAGE_SIZE);
  const pageData = filteredUsers.slice(0, visibleCount);

  const confirmAction = async () => {
    if (!confirmModal) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const action = confirmModal.type === '정지' ? 'suspend' : 'delete';
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: confirmModal.user.uid, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.error ?? '처리에 실패했습니다.');
        return;
      }
      if (action === 'delete') {
        setUsers((prev) => prev.filter((u) => u.uid !== confirmModal.user.uid));
      } else {
        setUsers((prev) => prev.map((u) => (u.uid === confirmModal.user.uid ? { ...u, status: '정지' as UserStatus } : u)));
      }
      setConfirmModal(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleExportCSV = () => {
    const headers = '번호,이름,이메일,연락처,가입유형,회원유형,가입일,상태';
    const rows = filteredUsers.map(
      (u) => `${u.id},${u.name},${u.email},${u.phone},${u.signupType},${u.role},${u.joinDate},${u.status}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `회원목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('내보내기 완료', `${filteredUsers.length}건의 회원 정보를 CSV로 저장했어요.`);
  };

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">회원 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-1.5">가입한 회원을 조회하고 정지·탈퇴 처리를 할 수 있어요.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#E5E8EB] rounded-[10px] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] transition-colors"
        >
          CSV 내보내기
        </button>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {loadError}
        </div>
      )}

      {/* ---------- Stat row (clean, no icon boxes) ---------- */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '전체 회원', value: counts.total, accent: '#191F28' },
          { label: '일반', value: counts.일반, accent: '#4E5968' },
          { label: '의사', value: counts.의사, accent: '#3182F6' },
          { label: '병원관리자', value: counts.병원관리자, accent: '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E8EB] px-5 py-4">
            <p className="text-[12px] font-medium text-[#8B95A1]">{s.label}</p>
            <p className="text-[24px] font-bold tracking-tight mt-1" style={{ color: s.accent }}>
              {s.value.toLocaleString()}
              <span className="text-[13px] font-medium text-[#8B95A1] ml-1">명</span>
            </p>
          </div>
        ))}
      </div>

      {/* ---------- Filter chips + search ---------- */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {ROLE_TABS.map((tab) => {
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
            placeholder="이름, 이메일, 연락처 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-[#E5E8EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
          />
        </div>
      </div>

      {/* ---------- Table card ---------- */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : pageData.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[14px] font-semibold text-[#4E5968]">표시할 회원이 없어요</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">검색어나 필터를 변경해 보세요.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.8fr_1.6fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>사용자</div>
              <div>이메일 / 연락처</div>
              <div>가입유형</div>
              <div>회원유형</div>
              <div>가입일</div>
              <div>상태</div>
              <div className="text-right">관리</div>
            </div>
            {pageData.map((u, i) => (
              <div
                key={u.uid}
                className="grid grid-cols-[1.8fr_1.6fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 transition-colors hover:bg-[#F9FAFB]"
                style={{ borderBottom: i === pageData.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} uid={u.uid} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#191F28] truncate">{u.name}</p>
                    <p className="text-[11px] text-[#8B95A1] font-mono truncate">{u.uid.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-[#191F28] truncate">{u.email}</p>
                  <p className="text-[12px] text-[#8B95A1] mt-0.5">{u.phone}</p>
                </div>
                <div>
                  <span
                    className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                    style={{ background: signupColor[u.signupType].bg, color: signupColor[u.signupType].text }}
                  >
                    {u.signupType}
                  </span>
                </div>
                <div>
                  <span
                    className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                    style={{ background: roleColor[u.role].bg, color: roleColor[u.role].text }}
                  >
                    {u.role}
                  </span>
                </div>
                <div className="text-[13px] text-[#4E5968]">{u.joinDate}</div>
                <div>
                  <span
                    className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                    style={{ background: statusColor[u.status].bg, color: statusColor[u.status].text }}
                  >
                    {u.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  {u.status === '활성' && (
                    <PillButton tone="orange" onClick={() => setConfirmModal({ type: '정지', user: u })}>
                      정지
                    </PillButton>
                  )}
                  {u.status !== '탈퇴' && (
                    <PillButton tone="red" onClick={() => setConfirmModal({ type: '삭제', user: u })}>
                      삭제
                    </PillButton>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="px-5 py-4 border-t border-[#F2F4F6]">
          <p className="text-[12px] text-[#8B95A1] text-center">
            전체 <span className="font-semibold text-[#191F28]">{filteredUsers.length.toLocaleString()}</span>명 중{' '}
            <span className="font-semibold text-[#191F28]">{Math.min(visibleCount, filteredUsers.length)}</span>명 표시
          </p>
          {visibleCount < filteredUsers.length && (
            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-[11px] text-[#8B95A1]">
              스크롤하면 더 불러옵니다…
            </div>
          )}
        </div>
      </div>

      {/* ---------- Confirm Modal ---------- */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                confirmModal.type === '정지' ? 'bg-[#FFF4E5]' : 'bg-[#FEECEC]'
              }`}
            >
              {confirmModal.type === '정지' ? (
                <Ban size={22} className="text-[#F59E0B]" />
              ) : (
                <Trash2 size={22} className="text-[#E54848]" />
              )}
            </div>
            <h3 className="text-[18px] font-bold text-[#191F28] mb-2">
              {confirmModal.type === '정지' ? '회원을 정지할까요?' : '회원을 탈퇴 처리할까요?'}
            </h3>
            <p className="text-[13px] text-[#4E5968] leading-relaxed mb-5">
              <span className="font-semibold text-[#191F28]">{confirmModal.user.name}</span>{' '}
              ({confirmModal.user.email})을(를){' '}
              {confirmModal.type === '정지' ? '1년간 정지' : '영구 탈퇴'} 처리합니다.
              {confirmModal.type === '삭제' && (
                <span className="block mt-1.5 text-[#E54848] font-medium">이 작업은 되돌릴 수 없어요.</span>
              )}
            </p>
            {actionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {actionError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmModal(null); setActionError(null); }}
                disabled={actionBusy}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={confirmAction}
                disabled={actionBusy}
                className={`flex-1 h-11 rounded-[10px] text-[14px] font-semibold text-white disabled:opacity-60 transition-colors ${
                  confirmModal.type === '정지' ? 'bg-[#F59E0B] hover:bg-[#D08A09]' : 'bg-[#E54848] hover:bg-[#C03B3B]'
                }`}
              >
                {actionBusy ? '처리 중...' : confirmModal.type === '정지' ? '정지하기' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
