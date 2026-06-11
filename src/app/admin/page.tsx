'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useSession } from '@/lib/supabase/SessionProvider';
import { Dropdown } from '@/components/admin/Dropdown';

const COLORS = {
  primary: '#3182F6',
  primaryLight: '#90C2FF',
  green: '#1AB554',
  yellow: '#F59E0B',
  red: '#E54848',
  purple: '#7B61FF',
};

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusColor: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF4E5', text: '#F59E0B' },
  confirmed: { bg: '#E5F1FF', text: '#3182F6' },
  completed: { bg: '#E8F8EE', text: '#1AB554' },
  cancelled: { bg: '#FEECEC', text: '#E54848' },
};
const statusLabels: Record<string, string> = {
  pending: '확인중', confirmed: '확정', completed: '완료', cancelled: '취소',
};

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;
function useMounted() {
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
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

function formatKRW(value: number) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString()}만`;
  return value.toLocaleString();
}

const PERIOD_OPTIONS = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
];

export default function AdminDashboard() {
  const [period, setPeriod] = useState('month');
  const { authUser } = useSession();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/dashboard?period=${period}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setApiData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser, period]);

  const s = apiData?.stats ?? {};
  const ps = apiData?.periodStats ?? {};
  const periodLabel = period === 'today' ? '오늘' : period === 'week' ? '최근 7일' : '이번 달';

  const categoryData = (apiData?.categoryData ?? []).map((c: any, i: number) => ({
    ...c,
    color: [COLORS.primary, COLORS.green, COLORS.yellow, COLORS.red, COLORS.purple][i % 5],
  }));

  const recentReservations = (apiData?.recentReservations ?? []).map((r: any) => ({
    ...r,
    amount: `${(r.amount ?? 0).toLocaleString()}원`,
  }));

  const revenueData = (apiData?.monthlyRevenue ?? []).map((m: any) => ({
    month: m.month,
    매출: Math.round(m.revenue / 10000),
    순매출: Math.round(m.revenue * 0.9 / 10000),
  }));
  const reservationData = (apiData?.monthlyRevenue ?? []).map((m: any) => ({
    week: m.month,
    확인중: m.pending ?? 0,
    확정: m.confirmed ?? 0,
    완료: m.completed ?? 0,
    취소: m.cancelled ?? 0,
  }));
  const userGrowthData = (apiData?.monthlyRevenue ?? []).map((m: any) => ({
    date: m.month,
    신규가입: m.count,
  }));

  const renderChange = (v: number | undefined) => {
    if (v === undefined || Number.isNaN(v)) return null;
    const isUp = v >= 0;
    const Icon = isUp ? TrendingUp : TrendingDown;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${isUp ? 'text-[#1AB554]' : 'text-[#E54848]'}`}>
        <Icon size={11} /> {isUp ? '+' : ''}{v.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">대시보드</h1>
          <p className="text-[13px] text-[#8B95A1] mt-1.5">
            {loading ? '불러오는 중…' : `${periodLabel} 기준 전체 현황을 확인할 수 있어요.`}
          </p>
        </div>
        <Dropdown
          title="조회 기간"
          value={period}
          onChange={setPeriod}
          options={PERIOD_OPTIONS}
          origin="top-right"
          width={180}
        />
      </div>

      {/* Top KPI row — Toss business-style: bold number, subtle accent */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '총 회원수', value: s.totalUsers ?? 0, suffix: '명', accent: '#191F28' },
          { label: '등록 병원', value: s.totalHospitals ?? 0, suffix: '곳', accent: '#191F28', sub: `승인 ${s.approvedHospitals ?? 0}` },
          { label: '이번 달 예약', value: s.monthReservations ?? 0, suffix: '건', accent: '#3182F6' },
          { label: '이번 달 매출', value: formatKRW(s.monthRevenue ?? 0), suffix: '원', accent: '#1AB554' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
            <p className="text-[12px] font-medium text-[#8B95A1]">{kpi.label}</p>
            <p className="text-[26px] font-bold tracking-tight mt-1.5" style={{ color: kpi.accent }}>
              {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
              <span className="text-[13px] font-medium text-[#8B95A1] ml-1">{kpi.suffix}</span>
            </p>
            {kpi.sub && <p className="text-[12px] text-[#8B95A1] mt-0.5">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Period KPIs — change-over-prev highlight */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: `${periodLabel} 신규 예약`, value: ps.newReservations ?? 0, change: ps.newReservationsChange },
          { label: `${periodLabel} 신규 가입`, value: ps.newSignups ?? 0, change: ps.newSignupsChange },
          { label: `${periodLabel} 신규 리뷰`, value: ps.newReviews ?? 0, change: ps.newReviewsChange },
        ].map((p) => (
          <div key={p.label} className="bg-white rounded-2xl border border-[#E5E8EB] p-5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#8B95A1]">{p.label}</p>
              <p className="text-[24px] font-bold tracking-tight mt-1 text-[#191F28]">
                {p.value.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              {renderChange(p.change)}
              <p className="text-[11px] text-[#8B95A1] mt-0.5">전기간 대비</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: revenue + reservations */}
      <div className="grid grid-cols-2 gap-6">
        <SectionCard title="매출 추이">
          <div className="p-5 h-72">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}만`} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, name: any) => [`${Number(v).toLocaleString()}만원`, String(name)]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#4E5968' }} />
                  <Line type="monotone" dataKey="매출" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.primary }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="순매출" stroke={COLORS.primaryLight} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.primaryLight }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="예약 현황">
          <div className="p-5 h-72">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reservationData} margin={{ top: 5, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}건`} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, name: any) => [`${v}건`, String(name)]}
                  />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: '#4E5968' }} />
                  <Bar dataKey="확인중" stackId="a" fill={COLORS.yellow} />
                  <Bar dataKey="확정" stackId="a" fill={COLORS.primary} />
                  <Bar dataKey="완료" stackId="a" fill={COLORS.green} />
                  <Bar dataKey="취소" stackId="a" fill={COLORS.red} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 2: pie + user growth */}
      <div className="grid grid-cols-2 gap-6">
        <SectionCard title="카테고리별 매출 비중">
          <div className="p-5 h-72">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData} cx="50%" cy="50%" innerRadius={56} outerRadius={94}
                    paddingAngle={3} dataKey="value" stroke="none"
                    label={({ name, value }) => `${name} ${value}%`}
                    labelLine={{ stroke: '#C9CDD2', strokeWidth: 1 }}
                  >
                    {categoryData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, name: any) => [`${v}%`, String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="신규 가입자 추이">
          <div className="p-5 h-72">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData} margin={{ top: 5, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="signup-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B95A1' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}명`} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => [`${v}명`, '신규가입']}
                  />
                  <Area type="monotone" dataKey="신규가입" stroke={COLORS.primary} strokeWidth={2.5} fill="url(#signup-gradient)" activeDot={{ r: 5, fill: COLORS.primary, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Recent reservations */}
      <SectionCard
        title="최근 예약"
        action={
          <a href="/admin/reservations" className="text-[13px] font-semibold text-[#3182F6] hover:underline inline-flex items-center gap-1">
            전체 보기 <ArrowUpRight size={14} />
          </a>
        }
      >
        {recentReservations.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[14px] font-semibold text-[#4E5968]">최근 예약이 없어요</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">새로운 예약이 들어오면 여기에 표시돼요.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.2fr_1fr_1.6fr_1.2fr_1fr_0.8fr_1fr] gap-4 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6] text-[11px] font-semibold text-[#8B95A1] uppercase tracking-wider">
              <div>예약 ID</div>
              <div>고객</div>
              <div>상품</div>
              <div>병원</div>
              <div>금액</div>
              <div>상태</div>
              <div>예약일</div>
            </div>
            {recentReservations.map((r: any, i: number) => (
              <div
                key={r.id}
                className="grid grid-cols-[1.2fr_1fr_1.6fr_1.2fr_1fr_0.8fr_1fr] gap-4 items-center px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                style={{ borderBottom: i === recentReservations.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="text-[12px] font-mono text-[#3182F6] truncate">{r.id.slice(0, 8)}</div>
                <div className="text-[14px] font-semibold text-[#191F28] truncate">{r.customer}</div>
                <div className="text-[13px] text-[#4E5968] truncate">{r.product}</div>
                <div className="text-[13px] text-[#4E5968] truncate">{r.hospital}</div>
                <div className="text-[14px] font-bold text-[#191F28]">{r.amount}</div>
                <div>
                  <span
                    className="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold"
                    style={{ background: statusColor[r.status].bg, color: statusColor[r.status].text }}
                  >
                    {statusLabels[r.status]}
                  </span>
                </div>
                <div className="text-[12px] text-[#8B95A1]">{r.date}</div>
              </div>
            ))}
          </>
        )}
      </SectionCard>
    </div>
  );
}
