'use client';

import { useState, useEffect, useMemo } from 'react';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Download, Ban, Trash2, Users } from 'lucide-react';
import { useStore } from '@/store';
import {
  PageHeader, FilterChips, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';

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

const roleTone: Record<UserRole, 'gray' | 'blue' | 'orange'> = {
  '일반': 'gray',
  '의사': 'blue',
  '병원관리자': 'orange',
};
// 가입 경로 뱃지 — 카카오 노랑·애플 검정은 브랜드 색이라 그대로 둔다
const signupStyle: Record<SignupType, React.CSSProperties | undefined> = {
  '카카오': { background: '#FFF6BF', color: '#8B5A00' },
  '애플': { background: '#191F28', color: '#FFFFFF' },
  '이메일': undefined,
};
const statusTone: Record<UserStatus, 'green' | 'orange' | 'gray'> = {
  '활성': 'green',
  '정지': 'orange',
  '탈퇴': 'gray',
};

const ROLE_TABS: { value: 'all' | UserRole; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '일반', label: '일반회원' },
  { value: '의사', label: '의사' },
  { value: '병원관리자', label: '병원관리자' },
];

function Avatar({ name, uid }: { name: string; uid: string }) {
  // uid 로 고정 색(토스 결 색)
  const hash = uid.split('').reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 0);
  const palette = [
    ['#E8F3FF', '#3182F6'],
    ['#FFF1E5', '#F46A00'],
    ['#E5F8EF', '#03B26C'],
    ['#FFEEEF', '#F04452'],
    ['#F2F4F6', '#4E5968'],
  ];
  const [bg, fg] = palette[hash % palette.length];
  return (
    <div className="adm-ava" style={{ backgroundColor: bg, color: fg }}>
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

  const GRID = 'grid grid-cols-[1.8fr_1.6fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center';

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <button type="button" className="adm-btn" onClick={handleExportCSV}>
            <Download size={16} /> CSV 내보내기
          </button>
        }
      />

      {loadError && <p className="adm-note red">{loadError}</p>}

      <StatRow cols={4}>
        <StatCard label="전체 회원" value={counts.total} suffix="명" />
        <StatCard label="일반" value={counts.일반} suffix="명" />
        <StatCard label="의사" value={counts.의사} suffix="명" accent="#3182F6" />
        <StatCard label="병원관리자" value={counts.병원관리자} suffix="명" accent="#F59E0B" />
      </StatRow>

      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="이름, 이메일, 연락처 검색" width={300} />
              <span className="grow" />
              <Count n={filteredUsers.length} unit="명" />
            </Toolbar>
            <Toolbar>
              <FilterChips value={filter} onChange={setFilter} options={ROLE_TABS} ariaLabel="회원 유형" />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : pageData.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="표시할 회원이 없어요" hint="검색어나 거르기를 바꿔 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <div>사용자</div>
                <div>이메일 / 연락처</div>
                <div>가입유형</div>
                <div>회원유형</div>
                <div>가입일</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>
              {pageData.map((u) => (
                <div key={u.uid} className={`${GRID} adm-grow`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name} uid={u.uid} />
                    <div className="min-w-0">
                      <span className="adm-cell-main">{u.name}</span>
                      <span className="adm-cell-sub adm-mono">{u.uid.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="adm-cell block">{u.email}</span>
                    <span className="adm-cell-sub">{u.phone}</span>
                  </div>
                  <div>
                    <span className="adm-badge" style={signupStyle[u.signupType]}>{u.signupType}</span>
                  </div>
                  <div><StatusBadge tone={roleTone[u.role]}>{u.role}</StatusBadge></div>
                  <div className="adm-cell dim">{u.joinDate}</div>
                  <div><StatusBadge tone={statusTone[u.status]}>{u.status}</StatusBadge></div>
                  <div className="adm-actions">
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
            </div>
          </div>
        )}
        {!loading && <TableFoot total={filteredUsers.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>

      {/* 정지·탈퇴 확인 */}
      {confirmModal && (
        <AdminModal
          onClose={() => { setConfirmModal(null); setActionError(null); }}
          busy={actionBusy}
          icon={
            <span className={`adm-modal-ic ${confirmModal.type === '정지' ? 'orange' : 'red'}`}>
              {confirmModal.type === '정지' ? <Ban size={22} /> : <Trash2 size={22} />}
            </span>
          }
          title={confirmModal.type === '정지' ? '회원을 정지할까요?' : '회원을 탈퇴 처리할까요?'}
          actions={
            <>
              <button
                type="button"
                className="adm-btn"
                onClick={() => { setConfirmModal(null); setActionError(null); }}
                disabled={actionBusy}
              >
                취소
              </button>
              <button type="button" className="adm-btn danger-solid" onClick={confirmAction} disabled={actionBusy}>
                {actionBusy ? '처리 중…' : confirmModal.type === '정지' ? '정지하기' : '탈퇴 처리'}
              </button>
            </>
          }
        >
          <div className="adm-kvbox">
            <div className="adm-kv"><span>이름</span><span>{confirmModal.user.name}</span></div>
            <div className="adm-kv"><span>이메일</span><span className="truncate">{confirmModal.user.email}</span></div>
            <div className="adm-kv"><span>처리</span><span>{confirmModal.type === '정지' ? '1년간 정지' : '영구 탈퇴'}</span></div>
          </div>
          {confirmModal.type === '삭제' && <p className="adm-note red mt-3">이 작업은 되돌릴 수 없어요.</p>}
          {actionError && <p className="adm-note red mt-3">{actionError}</p>}
        </AdminModal>
      )}
    </div>
  );
}
