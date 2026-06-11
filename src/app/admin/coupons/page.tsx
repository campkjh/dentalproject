'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { Ticket, Coins, Plus, Trash2, X } from 'lucide-react';
import { PageHeader, FilterChips, SearchInput, StatCard, PillButton, StatusBadge, EmptyState, PrimaryCTA } from '@/components/admin/ui';

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

  const inputCls = 'w-full h-12 px-4 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white transition-all';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="쿠폰 · 포인트"
        subtitle="회원에게 발급된 쿠폰과 포인트 적립/사용 내역을 관리합니다."
        right={activeTab === 'coupons' ? <PrimaryCTA onClick={() => setShowForm(true)}>쿠폰 발급</PrimaryCTA> : undefined}
      />

      <FilterChips
        value={activeTab}
        onChange={(v) => { setActiveTab(v); setSearch(''); }}
        options={[
          { value: 'coupons', label: '쿠폰 관리' },
          { value: 'points', label: '포인트 내역' },
        ]}
      />

      {activeTab === 'coupons' ? (
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="총 발급" value={couponStats.total} suffix="개" />
          <StatCard label="사용가능" value={couponStats.available} suffix="개" accent="#3182F6" />
          <StatCard label="사용완료" value={couponStats.used} suffix="개" accent="#1AB554" />
          <StatCard label="기간만료" value={couponStats.expired} suffix="개" accent="#E54848" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="총 적립" value={`${pointStats.total_earned.toLocaleString()}P`} accent="#3182F6" />
          <StatCard label="사용된 포인트" value={`${pointStats.total_used.toLocaleString()}P`} accent="#1AB554" />
          <StatCard label="미사용 잔액" value={`${pointStats.outstanding.toLocaleString()}P`} accent="#F59E0B" />
        </div>
      )}

      <div className="flex justify-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={activeTab === 'coupons' ? '쿠폰명, 회원명 검색' : '회원명, 사유 검색'}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {loading ? (
          <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={activeTab === 'coupons' ? <Ticket size={20} className="text-[#8B95A1]" /> : <Coins size={20} className="text-[#8B95A1]" />}
            title={activeTab === 'coupons' ? '쿠폰이 없어요' : '포인트 내역이 없어요'}
            hint={activeTab === 'coupons' ? '우측 상단 "쿠폰 발급"으로 생성해 보세요.' : undefined}
          />
        ) : activeTab === 'coupons' ? (
          <>
            <div className="grid grid-cols-[1.4fr_1fr_120px_140px_100px_140px_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>쿠폰명</div>
              <div>대상 회원</div>
              <div>할인액</div>
              <div>유효기간</div>
              <div>상태</div>
              <div>발급일</div>
              <div className="text-right">관리</div>
            </div>
            {(list as Coupon[]).slice(0, visibleCount).map((c, i, arr) => (
              <div
                key={c.id}
                className="grid grid-cols-[1.4fr_1fr_120px_140px_100px_140px_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#191F28] truncate">{c.name}</p>
                  {c.description && <p className="text-[12px] text-[#8B95A1] mt-0.5 truncate">{c.description}</p>}
                </div>
                <div className="text-[13px] text-[#4E5968] truncate">{c.user_name}</div>
                <div className="text-[14px] font-bold tracking-tight text-[#3182F6]">{c.discount_amount.toLocaleString()}원</div>
                <div className="text-[12px] text-[#4E5968]">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('ko-KR') : '무제한'}</div>
                <div><StatusBadge tone={statusTone[c.status]}>{statusLabel[c.status]}</StatusBadge></div>
                <div className="text-[12px] text-[#8B95A1]">{formatDate(c.created_at)}</div>
                <div className="flex justify-end">
                  <PillButton tone="red" onClick={() => handleDelete(c)}>
                    삭제
                  </PillButton>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="grid grid-cols-[1.4fr_100px_1.6fr_140px_140px] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>회원</div>
              <div>유형</div>
              <div>사유</div>
              <div>포인트</div>
              <div>일시</div>
            </div>
            {(list as PointHistory[]).slice(0, visibleCount).map((h, i, arr) => (
              <div
                key={h.id}
                className="grid grid-cols-[1.4fr_100px_1.6fr_140px_140px] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="text-[14px] font-semibold text-[#191F28]">{h.user_name}</div>
                <div><StatusBadge tone={h.type === 'earn' ? 'blue' : 'orange'}>{h.type === 'earn' ? '적립' : '사용'}</StatusBadge></div>
                <div className="text-[13px] text-[#4E5968] truncate">{h.description ?? '-'}</div>
                <div className={`text-[14px] font-bold ${h.type === 'earn' ? 'text-[#3182F6]' : 'text-[#F59E0B]'}`}>
                  {h.type === 'earn' ? '+' : '-'}{h.amount.toLocaleString()}P
                </div>
                <div className="text-[12px] text-[#8B95A1]">{formatDate(h.created_at)}</div>
              </div>
            ))}
          </>
        )}
        <div className="px-5 py-4 border-t border-[#F2F4F6]">
          <p className="text-[12px] text-[#8B95A1] text-center">
            전체 <span className="font-semibold text-[#191F28]">{list.length.toLocaleString()}</span>개 중{' '}
            <span className="font-semibold text-[#191F28]">{Math.min(visibleCount, list.length)}</span>개 표시
          </p>
          {visibleCount < list.length && (
            <div ref={sentinelRef} className="h-10 flex items-center justify-center text-[11px] text-[#8B95A1]">
              스크롤하면 더 불러옵니다…
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[#191F28]">쿠폰 발급</h3>
              <button onClick={() => setShowForm(false)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">쿠폰명 *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 봄맞이 할인쿠폰" className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">설명</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">할인 금액 *</label>
                <div className="relative">
                  <input
                    type="number" min={0}
                    value={form.discount_amount}
                    onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) || 0 })}
                    className={`${inputCls} pr-12`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#8B95A1]">원</span>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">만료일 (비워두면 무제한)</label>
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">발급 대상</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, target: 'all' })}
                    className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold border transition-colors"
                    style={form.target === 'all'
                      ? { background: '#E5F1FF', color: '#3182F6', borderColor: '#3182F6' }
                      : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }}
                  >
                    전체 회원
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, target: 'user' })}
                    className="flex-1 h-10 rounded-[10px] text-[13px] font-semibold border transition-colors"
                    style={form.target === 'user'
                      ? { background: '#E5F1FF', color: '#3182F6', borderColor: '#3182F6' }
                      : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }}
                  >
                    특정 회원
                  </button>
                </div>
              </div>
              {form.target === 'user' && (
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">회원 UUID</label>
                  <input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="회원 관리에서 확인" className={`${inputCls} font-mono`} />
                </div>
              )}
            </div>
            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{formError}</div>
            )}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} disabled={busy} className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50">취소</button>
              <button onClick={handleIssue} disabled={busy} className="flex-1 h-11 bg-[#3182F6] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50">
                {busy ? '발급 중…' : '발급하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
