'use client';

import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { Search, Download, X, AlertCircle, RotateCcw, Eye, CreditCard } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
} from 'recharts';
import { useStore } from '@/store';

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

const statusColor: Record<PaymentStatus, { bg: string; text: string }> = {
  완료: { bg: '#E8F8EE', text: '#1AB554' },
  환불: { bg: '#FEECEC', text: '#E54848' },
  부분환불: { bg: '#FFF4E5', text: '#F59E0B' },
};

const methodColor: Record<PaymentMethod, { bg: string; text: string }> = {
  카카오페이: { bg: '#FFF6BF', text: '#8B5A00' },
  토스: { bg: '#E5F1FF', text: '#3182F6' },
  카드: { bg: '#F2F4F6', text: '#4E5968' },
  계좌이체: { bg: '#E8F8EE', text: '#1AB554' },
  네이버페이: { bg: '#E8F4E6', text: '#479C2D' },
};

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

function PillButton({
  children, onClick, tone = 'gray', disabled,
}: { children: React.ReactNode; onClick?: () => void; tone?: 'gray' | 'blue' | 'red'; disabled?: boolean }) {
  const styles: Record<string, string> = {
    gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
    blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
    red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
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

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-[17px] font-bold text-[#191F28] tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">{children}</div>
    </section>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">매출 · 결제</h1>
          <p className="text-[13px] text-[#8B95A1] mt-1.5">결제 내역과 매출 추이를 확인하고 환불 처리합니다.</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 bg-white border border-[#E5E8EB] rounded-[10px] text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
        >
          CSV 다운로드
        </button>
      </div>

      {/* Summary cards with sparklines */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '총 매출', value: totalRevenue, color: '#3182F6', factor: 1 },
          { label: '순매출', value: netRevenue, color: '#1AB554', factor: 0.9 },
          { label: '환불액', value: refundAmount, color: '#E54848', factor: 0.05, sub: `환불률 ${refundRate}%` },
          { label: '수수료 수익', value: feeIncome, color: '#F59E0B', factor: 0.1 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
            <p className="text-[12px] font-medium text-[#8B95A1]">{s.label}</p>
            <p className="text-[22px] font-bold tracking-tight mt-1.5 text-[#191F28]">
              {formatCurrency(s.value)}<span className="text-[13px] font-medium text-[#8B95A1] ml-1">원</span>
            </p>
            {s.sub && <p className="text-[12px] text-[#8B95A1] mt-0.5">{s.sub}</p>}
            <div className="mt-2 h-9">
              <MiniSparkline data={sparkFromDaily(dailyData, s.factor)} color={s.color} height={36} />
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <SectionCard title="매출 추이 (30일)">
        <div className="p-5 h-72">
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
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}만`} />
                <Tooltip
                  contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', fontSize: 12 }}
                  formatter={(v: any) => [`${Number(v).toLocaleString()}만원`, '매출']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3182F6" strokeWidth={2.5} fill="url(#rev-gradient)" activeDot={{ r: 5, fill: '#3182F6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      {/* Method donut + hospitals bar */}
      <div className="grid grid-cols-2 gap-6">
        <SectionCard title="결제수단 비율">
          <div className="p-5 flex items-center">
            <div className="w-1/2 h-56">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={methodData} cx="50%" cy="50%" innerRadius={50} outerRadius={86} dataKey="value" stroke="none" paddingAngle={2}>
                      {methodData.map((_, i) => (
                        <Cell key={i} fill={['#3182F6', '#F59E0B', '#1AB554', '#E54848', '#7B61FF'][i % 5]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any, name: any) => [`${v}%`, String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-1/2 space-y-2.5 pl-3">
              {methodData.length === 0 ? (
                <p className="text-[13px] text-[#8B95A1]">결제 데이터가 없어요.</p>
              ) : methodData.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ['#3182F6', '#F59E0B', '#1AB554', '#E54848', '#7B61FF'][i % 5] }} />
                    <span className="text-[13px] text-[#4E5968]">{m.name}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-[#191F28]">{m.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="병원별 매출 TOP 10">
          <div className="p-5 h-[300px]">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalsData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}만`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#4E5968' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()}만원`, '매출']}
                  />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={14}>
                    {hospitalsData.map((_, i) => (
                      <Cell key={i} fill={i < 3 ? '#3182F6' : i < 6 ? '#90C2FF' : '#C9DFFF'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Heatmap */}
      <SectionCard title="시간대별 거래량 히트맵">
        <div className="p-5 overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex mb-1">
              <div className="w-10 flex-shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[10px] font-medium text-[#8B95A1]">{h}시</div>
              ))}
            </div>
            {dayLabels.map((day, di) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-10 flex-shrink-0 text-[12px] font-semibold text-[#4E5968] text-right pr-2">{day}</div>
                {(heatmap[di] ?? Array(24).fill(0)).map((val, hr) => {
                  const intensity = val / heatmapMax;
                  return (
                    <div
                      key={hr}
                      className="flex-1 h-8 rounded-md flex items-center justify-center transition-colors"
                      style={{ background: val === 0 ? '#F9FAFB' : `rgba(49,130,246,${0.12 + intensity * 0.78})` }}
                      title={`${day} ${hr}시: ${val}건`}
                    >
                      <span className="text-[10px] font-semibold" style={{ color: intensity > 0.55 ? '#FFFFFF' : '#4E5968' }}>
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

      {/* Filters + Search + Table */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-1.5">
            {FILTER_TABS.map((t) => {
              const active = statusFilter === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setStatusFilter(t.value)}
                  className="h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors border"
                  style={
                    active
                      ? { background: '#191F28', color: '#FFFFFF', borderColor: '#191F28' }
                      : { background: '#FFFFFF', color: '#4E5968', borderColor: '#E5E8EB' }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="relative w-[280px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
            <input
              type="text"
              placeholder="결제번호, 고객, 상품, 병원 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-[#E5E8EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          {loading ? (
            <div className="px-5 py-16 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-12 h-12 mx-auto bg-[#F2F4F6] rounded-full flex items-center justify-center mb-3">
                <CreditCard size={20} className="text-[#8B95A1]" />
              </div>
              <p className="text-[14px] font-semibold text-[#4E5968]">결제 내역이 없어요</p>
              <p className="text-[12px] text-[#8B95A1] mt-1">검색어나 필터를 변경해 보세요.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.9fr_1fr_0.7fr_auto] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
                <div>결제번호</div>
                <div>고객 / 상품</div>
                <div>병원</div>
                <div>금액</div>
                <div>결제수단</div>
                <div>결제일시</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>
              {filtered.slice(0, 100).map((p, i) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_1.2fr_1.4fr_1fr_0.9fr_1fr_0.7fr_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                  style={{ borderBottom: i === Math.min(filtered.length, 100) - 1 ? 'none' : '1px solid #F2F4F6' }}
                >
                  <div className="text-[12px] font-mono text-[#3182F6] truncate">{p.id}</div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#191F28] truncate">{p.customer}</p>
                    <p className="text-[12px] text-[#8B95A1] truncate">{p.product}</p>
                  </div>
                  <div className="text-[13px] text-[#4E5968] truncate">{p.hospital}</div>
                  <div className="text-[14px] font-bold tracking-tight text-[#191F28]">{p.amount.toLocaleString()}원</div>
                  <div>
                    <span
                      className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                      style={{ background: methodColor[p.method].bg, color: methodColor[p.method].text }}
                    >
                      {p.method}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#8B95A1]">{p.datetime}</div>
                  <div>
                    <span
                      className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                      style={{ background: statusColor[p.status].bg, color: statusColor[p.status].text }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <PillButton tone="blue" onClick={() => setDetailPayment(p)}>
                      상세
                    </PillButton>
                    {p.status === '완료' && (
                      <PillButton tone="red" disabled={refundBusy === p.id} onClick={() => handleRefund(p)}>
                        환불
                      </PillButton>
                    )}
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 border-t border-[#F2F4F6] text-center text-[12px] text-[#8B95A1]">
                전체 <span className="font-semibold text-[#191F28]">{filtered.length.toLocaleString()}</span>건
                {filtered.length > 100 && ` 중 100건 표시`}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailPayment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setDetailPayment(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-[#191F28]">결제 상세</h3>
              <button onClick={() => setDetailPayment(null)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
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
            ].map(([k, v], i, arr) => (
              <div
                key={k}
                className="grid grid-cols-[100px_1fr] gap-3 items-center py-2.5"
                style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <span className="text-[12px] font-medium text-[#8B95A1]">{k}</span>
                <span className="text-[13px] text-[#191F28] text-right truncate">{v}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setDetailPayment(null)}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
              >
                닫기
              </button>
              {detailPayment.status === '완료' && (
                <button
                  onClick={() => handleRefund(detailPayment)}
                  disabled={refundBusy === detailPayment.id}
                  className="flex-1 h-11 bg-[#E54848] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#C03B3B] disabled:opacity-50"
                >
                  {refundBusy === detailPayment.id ? '처리 중…' : '환불 처리'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
