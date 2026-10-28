'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Ticket, Coins, Plus } from 'lucide-react';
import {
  PageHeader, RadioGroup, SearchInput, StatCard, StatRow, PillButton, StatusBadge, EmptyState, PrimaryCTA,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal,
} from '@/components/admin/ui';
import { AdminDatePop } from '@/components/admin/AdminDatePop';

type CouponStatus = 'available' | 'used' | 'expired';
type Coupon = {
  id: string;
  user_id: string;
  user_name: string;
  name: string;
  description: string | null;
  discount_amount: number;
  expiry_date: string | null;
  status: CouponStatus;
  used_at: string | null;
  created_at: string;
};

type CouponStats = { total: number; available: number; used: number; expired: number };
type PointHistory = {
  id: string;
  user_id: string;
  user_name: string;
  type: 'earn' | 'use';
  description: string | null;
  amount: number;
  created_at: string;
};

const PAGE_SIZE = 20;

function formatDate(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

const statusTone: Record<CouponStatus, 'green' | 'gray' | 'red'> = {
  available: 'green', used: 'gray', expired: 'red',
};
const statusLabel: Record<CouponStatus, string> = {
  available: '사용가능', used: '사용완료', expired: '만료',
};

export default function AdminCouponsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);

  const [activeTab, setActiveTab] = useState<'coupons' | 'points'>('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponStats, setCouponStats] = useState<CouponStats>({ total: 0, available: 0, used: 0, expired: 0 });
  const [points, setPoints] = useState<PointHistory[]>([]);
  const [pointStats, setPointStats] = useState({ total_earned: 0, total_used: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', discount_amount: 5000, expiry_date: '', target: 'all' as 'all' | 'user', user_id: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);


  const load = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/admin/coupons', { cache: 'no-store' }),
        fetch('/api/admin/points', { cache: 'no-store' }),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCoupons(data.coupons ?? []);
        setCouponStats(data.stats ?? { total: 0, available: 0, used: 0, expired: 0 });
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setPoints(data.history ?? []);
        setPointStats(data.stats ?? { total_earned: 0, total_used: 0, outstanding: 0 });
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const filteredCoupons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.user_name.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  }, [coupons, search]);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return points;
    return points.filter((p) =>
      p.user_name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  }, [points, search]);

  const list = activeTab === 'coupons' ? filteredCoupons : filteredPoints;
  const { visibleCount, sentinelRef } = useInfiniteScroll(list.length, PAGE_SIZE);

  const handleIssue = async () => {
    if (!form.name.trim() || form.discount_amount <= 0) {
      setFormError('쿠폰명과 0보다 큰 금액이 필요합니다.');
      return;
    }
    if (form.target === 'user' && !form.user_id.trim()) {
      setFormError('대상 회원 ID가 필요합니다.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          discount_amount: form.discount_amount,
          expiry_date: form.expiry_date || null,
          target: form.target,
          user_id: form.user_id.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data?.error ?? '발급에 실패했습니다.');
        return;
      }
      const data = await res.json();
      setShowForm(false);
      setForm({ name: '', description: '', discount_amount: 5000, expiry_date: '', target: 'all', user_id: '' });
      showAlert('발급 완료', `${data.count}건의 쿠폰이 발급되었어요.`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (c: Coupon) => {
    showConfirm(
      '쿠폰 삭제',
      `"${c.user_name}" 회원의 "${c.name}" 쿠폰을 삭제할까요?`,
      async () => {
        const res = await fetch('/api/admin/coupons', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: c.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showAlert(data?.error ?? '삭제 실패');
          return;
        }
        await load();
      },
      { confirmText: '삭제', cancelText: '취소' }
    );
  };

  const CGRID = 'grid grid-cols-[1.4fr_1fr_120px_140px_100px_140px_auto] gap-4 items-center';
  const PGRID = 'grid grid-cols-[1.4fr_100px_1.6fr_140px_140px] gap-4 items-center';

  return (
    <div className="adm-stack">
      <PageHeader
        right={activeTab === 'coupons' ? <PrimaryCTA onClick={() => setShowForm(true)}><Plus size={16} /> 쿠폰 발급</PrimaryCTA> : undefined}
      />

      {/* 화면 전환 탭(쿠폰 ↔ 포인트) — 상태 거르기가 아니라 칩 줄 */}
      <div className="adm-chips" role="tablist" aria-label="쿠폰 · 포인트">
        {([
          { value: 'coupons', label: '쿠폰 관리' },
          { value: 'points', label: '포인트 내역' },
        ] as const).map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={activeTab === t.value}
            className={`adm-chip ${activeTab === t.value ? 'on' : ''}`}
            onClick={() => { if (activeTab !== t.value) { setActiveTab(t.value); setSearch(''); } }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'coupons' ? (
        <StatRow cols={4}>
          <StatCard label="총 발급" value={couponStats.total} suffix="개" />
          <StatCard label="사용가능" value={couponStats.available} suffix="개" accent="#3182F6" />
          <StatCard label="사용완료" value={couponStats.used} suffix="개" accent="#1AB554" />
          <StatCard label="기간만료" value={couponStats.expired} suffix="개" accent="#E54848" />
        </StatRow>
      ) : (
        <StatRow cols={3}>
          <StatCard label="총 적립" value={`${pointStats.total_earned.toLocaleString()}P`} accent="#3182F6" />
          <StatCard label="사용된 포인트" value={`${pointStats.total_used.toLocaleString()}P`} accent="#1AB554" />
          <StatCard label="미사용 잔액" value={`${pointStats.outstanding.toLocaleString()}P`} accent="#F59E0B" />
        </StatRow>
      )}

      <AdminListCard
        filter={
          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={activeTab === 'coupons' ? '쿠폰명, 회원명 검색' : '회원명, 사유 검색'}
              width={300}
            />
            <span className="grow" />
            <Count n={list.length} />
          </Toolbar>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : list.length === 0 ? (
          <EmptyState
            icon={activeTab === 'coupons' ? <Ticket size={22} /> : <Coins size={22} />}
            title={activeTab === 'coupons' ? '쿠폰이 없어요' : '포인트 내역이 없어요'}
            hint={activeTab === 'coupons' ? '오른쪽 위 "쿠폰 발급"으로 만들어 보세요.' : undefined}
          />
        ) : activeTab === 'coupons' ? (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${CGRID} adm-ghead`}>
                <div>쿠폰명</div>
                <div>대상 회원</div>
                <div>할인액</div>
                <div>유효기간</div>
                <div>상태</div>
                <div>발급일</div>
                <div className="text-right">관리</div>
              </div>
              {(list as Coupon[]).slice(0, visibleCount).map((c) => (
                <div key={c.id} className={`${CGRID} adm-grow`}>
                  <div className="min-w-0">
                    <p className="adm-cell-main truncate">{c.name}</p>
                    {c.description && <p className="adm-cell-sub truncate">{c.description}</p>}
                  </div>
                  <div className="adm-cell truncate">{c.user_name}</div>
                  <div className="adm-num text-[#3182F6]">{c.discount_amount.toLocaleString()}원</div>
                  <div className="adm-cell">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('ko-KR') : '무제한'}</div>
                  <div><StatusBadge tone={statusTone[c.status]}>{statusLabel[c.status]}</StatusBadge></div>
                  <div className="adm-cell dim">{formatDate(c.created_at)}</div>
                  <div className="adm-actions">
                    <PillButton tone="red" onClick={() => handleDelete(c)}>
                      삭제
                    </PillButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${PGRID} adm-ghead`}>
                <div>회원</div>
                <div>유형</div>
                <div>사유</div>
                <div>포인트</div>
                <div>일시</div>
              </div>
              {(list as PointHistory[]).slice(0, visibleCount).map((h) => (
                <div key={h.id} className={`${PGRID} adm-grow`}>
                  <div className="adm-cell-main">{h.user_name}</div>
                  <div><StatusBadge tone={h.type === 'earn' ? 'blue' : 'orange'}>{h.type === 'earn' ? '적립' : '사용'}</StatusBadge></div>
                  <div className="adm-cell truncate">{h.description ?? '-'}</div>
                  <div className={`adm-num ${h.type === 'earn' ? 'text-[#3182F6]' : 'text-[#F46A00]'}`}>
                    {h.type === 'earn' ? '+' : '-'}{h.amount.toLocaleString()}P
                  </div>
                  <div className="adm-cell dim">{formatDate(h.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && <TableFoot total={list.length} shown={visibleCount} sentinelRef={sentinelRef} />}
      </AdminListCard>

      {showForm && (
        <AdminModal
          onClose={() => setShowForm(false)}
          busy={busy}
          title="쿠폰 발급"
          icon={<span className="adm-modal-ic"><Ticket size={22} /></span>}
          actions={
            <>
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} className="adm-btn">취소</button>
              <button type="button" onClick={handleIssue} disabled={busy} className="adm-btn primary">
                {busy ? '발급 중…' : '발급하기'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="adm-label">쿠폰명 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 봄맞이 할인쿠폰" className="adm-input" />
            </div>
            <div>
              <label className="adm-label">설명</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="adm-input" />
            </div>
            <div>
              <label className="adm-label">할인 금액 *</label>
              <div className="relative">
                <input
                  type="number" min={0}
                  value={form.discount_amount}
                  onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) || 0 })}
                  className="adm-input pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#8B95A1]">원</span>
              </div>
            </div>
            <div>
              <label className="adm-label">만료일 (비워두면 무제한)</label>
              <AdminDatePop full value={form.expiry_date} onChange={(v) => setForm({ ...form, expiry_date: v })} placeholder="무제한" ariaLabel="쿠폰 만료일" />
            </div>
            <div>
              <label className="adm-label">발급 대상</label>
              <RadioGroup
                value={form.target}
                onChange={(v) => setForm({ ...form, target: v })}
                options={[
                  { value: 'all', label: '전체 회원' },
                  { value: 'user', label: '특정 회원' },
                ]}
                ariaLabel="발급 대상"
              />
            </div>
            {form.target === 'user' && (
              <div>
                <label className="adm-label">회원 UUID</label>
                <input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="회원 관리에서 확인" className="adm-input font-mono" />
              </div>
            )}
          </div>
          {formError && <p className="adm-note red mt-4">{formError}</p>}
        </AdminModal>
      )}
    </div>
  );
}
