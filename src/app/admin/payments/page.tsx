'use client';

import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { Download, CreditCard, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
} from 'recharts';
import { useStore } from '@/store';
import {
  PageHeader, SectionCard, StatRow, FilterChips, SearchInput, PillButton, StatusBadge, EmptyState,
  AdminListCard, Toolbar, Count, TableFoot, LoadingRows, AdminModal, SecondaryCTA,
} from '@/components/admin/ui';

type PaymentStatus = '완료' | '환불' | '부분환불';
type PaymentMethod = '카카오페이' | '토스' | '카드' | '계좌이체' | '네이버페이';

interface Payment {
  id: string;
  reservationId: string;
  customer: string;
  product: string;
  hospital: string;
  amount: number;
  fee: number;
  method: PaymentMethod;
  datetime: string;
  status: PaymentStatus;
}

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;
function useMounted() {
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
}

function formatCurrency(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${(value / 10000).toLocaleString()}만`;
  return value.toLocaleString();
}

type Tone = 'gray' | 'blue' | 'red' | 'green' | 'orange';
const statusTone: Record<PaymentStatus, Tone> = {
  완료: 'green',
  환불: 'red',
  부분환불: 'orange',
};

const methodTone: Record<PaymentMethod, Tone> = {
  카카오페이: 'orange',
  토스: 'blue',
  카드: 'gray',
  계좌이체: 'green',
  네이버페이: 'green',
};

// 차트 색 — 파랑 계열 우선
const PIE_COLORS = ['#3182F6', '#90C2FF', '#03B26C', '#F46A00', '#F04452'];
const TOOLTIP_STYLE = { border: 0, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', fontSize: 12 };
const TICK = { fontSize: 12, fill: '#8B95A1' };

/* eslint-disable @typescript-eslint/no-explicit-any */

const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

function sparkFromDaily(data: { revenue: number }[], factor = 1) {
  const last7 = data.slice(-7);
  if (last7.length === 0) return Array(7).fill({ v: 0 });
  return last7.map((d) => ({ v: Math.max(0, d.revenue * factor) }));
}

function MiniSparkline({ data, color, height = 36 }: { data: { v: number }[]; color: string; height?: number }) {
  const mounted = useMounted();
  if (!mounted) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const FILTER_TABS: { value: 'all' | PaymentStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '완료', label: '완료' },
  { value: '환불', label: '환불' },
];

export default function AdminPaymentsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const mounted = useMounted();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number }[]>([]);
  const [methodData, setMethodData] = useState<{ name: string; value: number; amount: number }[]>([]);
  const [hospitalsData, setHospitalsData] = useState<{ name: string; revenue: number }[]>([]);
  const [heatmap, setHeatmap] = useState<number[][]>(() => Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [apiSummary, setApiSummary] = useState<{ totalRevenue: number; netRevenue: number; refundedRevenue: number; totalFee: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [refundBusy, setRefundBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/payments', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setPayments(data.payments ?? []);
          setDailyData(data.dailyRevenue ?? []);
          setMethodData(data.paymentMethodBreakdown ?? []);
          setHospitalsData(data.topHospitals ?? []);
          if (Array.isArray(data.heatmap) && data.heatmap.length === 7) setHeatmap(data.heatmap);
          setApiSummary(data.summary ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmap.flat()), [heatmap]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      const matchSearch =
        !q ||
        p.customer.toLowerCase().includes(q) ||
        p.product.toLowerCase().includes(q) ||
        p.hospital.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  const totalRevenue = apiSummary?.totalRevenue ?? 0;
  const refundAmount = apiSummary?.refundedRevenue ?? 0;
  const feeIncome = apiSummary?.totalFee ?? 0;
  const netRevenue = apiSummary?.netRevenue ?? 0;
  const refundRate = totalRevenue + refundAmount > 0
    ? Math.round((refundAmount / (totalRevenue + refundAmount)) * 1000) / 10
    : 0;

  const handleRefund = (p: Payment) => {
    if (p.status === '환불') return;
    showConfirm(
      '환불 처리',
      `${p.customer}님의 결제 ${p.id}를 환불 처리할까요? 해당 예약이 취소 상태로 변경됩니다.`,
      async () => {
        setRefundBusy(p.id);
        try {
          const res = await fetch(`/api/reservations/${p.reservationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled', cancelReason: '관리자 환불 처리' }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            showAlert(data?.error ?? '환불 처리 실패');
            return;
          }
          setPayments((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: '환불' as PaymentStatus } : x)));
          if (detailPayment?.id === p.id) setDetailPayment({ ...p, status: '환불' });
        } finally {
          setRefundBusy(null);
        }
      },
      { confirmText: '환불', cancelText: '취소' }
    );
  };

  const handleExport = () => {
    const headers = ['결제번호', '예약 ID', '고객명', '상품', '병원', '금액', '수수료', '결제수단', '결제일시', '상태'];
    const rows = filtered.map((p) => [
      p.id, p.reservationId, p.customer, p.product, p.hospital,
      String(p.amount), String(p.fee), p.method, p.datetime, p.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const GRID = 'grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.9fr_1fr_0.7fr_auto] gap-4 items-center';
  const shown = Math.min(filtered.length, 100);

  return (
    <div className="adm-stack">
      <PageHeader
        right={
          <SecondaryCTA onClick={handleExport}>
            <Download size={16} /> CSV 다운로드
          </SecondaryCTA>
        }
      />

      {/* 요약 숫자 + 7일 꺾은선 */}
      <StatRow cols={4}>
        {[
          { label: '총 매출', value: totalRevenue, color: '#3182F6', factor: 1 },
          { label: '순매출', value: netRevenue, color: '#03B26C', factor: 0.9 },
          { label: '환불액', value: refundAmount, color: '#F04452', factor: 0.05, sub: `환불률 ${refundRate}%` },
          { label: '수수료 수익', value: feeIncome, color: '#F46A00', factor: 0.1 },
        ].map((s) => (
          <div key={s.label} className="adm-stat">
            <p className="adm-stat-label">{s.label}</p>
            <p className="adm-stat-value">{formatCurrency(s.value)}<small>원</small></p>
            {s.sub && <p className="adm-stat-sub">{s.sub}</p>}
            <div className="mt-2 h-9">
              <MiniSparkline data={sparkFromDaily(dailyData, s.factor)} color={s.color} height={36} />
            </div>
          </div>
        ))}
      </StatRow>

      {/* 매출 추이 */}
      <SectionCard title="매출 추이" sub="최근 30일 · 단위 만원">
        <div className="h-72 px-4 pb-5">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="rev-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3182F6" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3182F6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
                <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}만`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: any) => [`${Number(v).toLocaleString()}만원`, '매출']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3182F6" strokeWidth={2.5} fill="url(#rev-gradient)" activeDot={{ r: 5, fill: '#3182F6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      {/* 결제수단 도넛 + 병원 막대 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="결제수단 비율">
          <div className="flex items-center px-6 pb-5">
            <div className="w-1/2 h-56">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={methodData} cx="50%" cy="50%" innerRadius={50} outerRadius={86} dataKey="value" stroke="none" paddingAngle={2}>
                      {methodData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: any, name: any) => [`${v}%`, String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-1/2 space-y-3 pl-3">
              {methodData.length === 0 ? (
                <p className="adm-cell dim">결제 데이터가 없어요.</p>
              ) : methodData.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="adm-cell">{m.name}</span>
                  </div>
                  <span className="adm-num">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="병원별 매출 TOP 10" sub="단위 만원">
          <div className="h-[300px] px-4 pb-5">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalsData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" horizontal={false} />
                  <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}만`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#4E5968' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: '#F2F4F6' }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()}만원`, '매출']}
                  />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={14}>
                    {hospitalsData.map((_, i) => (
                      <Cell key={i} fill={i < 3 ? '#3182F6' : i < 6 ? '#90C2FF' : '#C9E2FF'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 시간대 히트맵 */}
      <SectionCard title="시간대별 거래량" sub="요일 × 시간, 진할수록 많아요">
        <div className="overflow-x-auto px-6 pb-6">
          <div className="min-w-[860px]">
            <div className="flex mb-1">
              <div className="w-10 flex-shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[12px] font-medium text-[#8B95A1]">{h}</div>
              ))}
            </div>
            {dayLabels.map((day, di) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-10 flex-shrink-0 text-[13px] font-semibold text-[#4E5968] text-right pr-2">{day}</div>
                {(heatmap[di] ?? Array(24).fill(0)).map((val, hr) => {
                  const intensity = val / heatmapMax;
                  return (
                    <div
                      key={hr}
                      className="flex-1 h-8 rounded-md flex items-center justify-center transition-colors"
                      style={{ background: val === 0 ? '#F2F4F6' : `rgba(49,130,246,${0.12 + intensity * 0.78})` }}
                      title={`${day} ${hr}시: ${val}건`}
                    >
                      <span className="text-[12px] font-semibold" style={{ color: intensity > 0.55 ? '#FFFFFF' : '#4E5968' }}>
                        {val > 0 ? val : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* 거르기 + 결제 목록 */}
      <AdminListCard
        filter={
          <>
            <Toolbar>
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="결제번호, 고객, 상품, 병원" width={300} />
              <span className="grow" />
              <Count n={filtered.length} />
            </Toolbar>
            <Toolbar>
              <FilterChips value={statusFilter} onChange={setStatusFilter} options={FILTER_TABS} ariaLabel="결제 상태" />
            </Toolbar>
          </>
        }
      >
        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CreditCard size={22} />} title="결제 내역이 없어요" hint="검색어나 거르기를 바꿔 보세요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <div>결제번호</div>
                <div>고객 / 상품</div>
                <div>병원</div>
                <div>금액</div>
                <div>결제수단</div>
                <div>결제일시</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>
              {filtered.slice(0, 100).map((p) => (
                <div key={p.id} className={`${GRID} adm-grow`}>
                  <div className="adm-mono truncate">{p.id}</div>
                  <div className="min-w-0">
                    <p className="adm-cell-main truncate">{p.customer}</p>
                    <p className="adm-cell-sub truncate">{p.product}</p>
                  </div>
                  <div className="adm-cell">{p.hospital}</div>
                  <div className="adm-num">{p.amount.toLocaleString()}원</div>
                  <div><StatusBadge tone={methodTone[p.method] ?? 'gray'}>{p.method}</StatusBadge></div>
                  <div className="adm-cell dim">{p.datetime}</div>
                  <div><StatusBadge tone={statusTone[p.status] ?? 'gray'}>{p.status}</StatusBadge></div>
                  <div className="adm-actions">
                    <PillButton onClick={() => setDetailPayment(p)}>상세</PillButton>
                    {p.status === '완료' && (
                      <PillButton tone="red" disabled={refundBusy === p.id} onClick={() => handleRefund(p)}>
                        환불
                      </PillButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && filtered.length > 0 && <TableFoot total={filtered.length} shown={shown} />}
      </AdminListCard>

      {/* 결제 상세 */}
      {detailPayment && (
        <AdminModal
          onClose={() => setDetailPayment(null)}
          title="결제 상세"
          icon={<span className="adm-modal-ic"><CreditCard size={22} /></span>}
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => setDetailPayment(null)}>닫기</button>
              {detailPayment.status === '완료' && (
                <button
                  type="button"
                  className="adm-btn danger-solid"
                  onClick={() => handleRefund(detailPayment)}
                  disabled={refundBusy === detailPayment.id}
                >
                  <AlertTriangle size={16} /> {refundBusy === detailPayment.id ? '처리 중…' : '환불 처리'}
                </button>
              )}
            </>
          }
        >
          {[
            ['결제번호', detailPayment.id],
            ['예약 ID', detailPayment.reservationId],
            ['고객명', detailPayment.customer],
            ['상품', detailPayment.product],
            ['병원', detailPayment.hospital],
            ['결제수단', detailPayment.method],
            ['결제일시', detailPayment.datetime],
            ['금액', `${detailPayment.amount.toLocaleString()}원`],
            ['수수료', `${detailPayment.fee.toLocaleString()}원`],
            ['상태', detailPayment.status],
          ].map(([k, v]) => (
            <div key={k} className="adm-kv"><span>{k}</span><span>{v}</span></div>
          ))}
        </AdminModal>
      )}
    </div>
  );
}
