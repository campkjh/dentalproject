'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, CalendarDays } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useSession } from '@/lib/supabase/SessionProvider';
import { Dropdown } from '@/components/admin/Dropdown';
import { SectionCard, StatCard, StatRow, StatusBadge, EmptyState } from '@/components/admin/ui';

const COLORS = {
  primary: '#3182F6',
  primaryLight: '#90C2FF',
  green: '#03B26C',
  yellow: '#F46A00',
  red: '#F04452',
  gray: '#B0B8C1', // 다섯째 칸 = 회색
};

// recharts 툴팁 — 토스 결 떠 있는 카드
const TOOLTIP_STYLE = { border: 0, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', fontSize: 12 };
const TICK = { fontSize: 12, fill: '#8B95A1' };

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusTone: Record<string, 'orange' | 'blue' | 'green' | 'red'> = {
  pending: 'orange', confirmed: 'blue', completed: 'green', cancelled: 'red',
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

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
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
    color: [COLORS.primary, COLORS.green, COLORS.yellow, COLORS.red, COLORS.gray][i % 5],
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
    if (v === undefined || Number.isNaN(v)) return <span>전기간 대비 -</span>;
    const isUp = v >= 0;
    const Icon = isUp ? TrendingUp : TrendingDown;
    return (
      <>
        전기간 대비{' '}
        <span className={`inline-flex items-center gap-0.5 font-semibold ${isUp ? 'text-[#03B26C]' : 'text-[#F04452]'}`}>
          <Icon size={12} /> {isUp ? '+' : ''}{v.toFixed(1)}%
        </span>
      </>
    );
  };

  const GRID = 'grid grid-cols-[1.2fr_1fr_1.6fr_1.2fr_1fr_0.8fr_1fr] gap-4 items-center';

  return (
    <div className="adm-stack">
      {/* 인사 줄 — 대시보드는 레이아웃이 제목을 그리지 않는다 */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#3182F6]">{mounted ? todayLabel() : '\u00a0'}</p>
          <h1 className="adm-title hello">대시보드</h1>
          <p className="adm-desc">{loading ? '불러오는 중…' : `${periodLabel} 기준 전체 현황이에요`}</p>
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

      {/* 누적 숫자 */}
      <StatRow cols={4}>
        <StatCard label="총 회원수" value={s.totalUsers ?? 0} suffix="명" />
        <StatCard label="등록 병원" value={s.totalHospitals ?? 0} suffix="곳" sub={`승인 ${s.approvedHospitals ?? 0}곳`} />
        <StatCard label="이번 달 예약" value={s.monthReservations ?? 0} suffix="건" accent="#3182F6" />
        <StatCard label="이번 달 매출" value={formatKRW(s.monthRevenue ?? 0)} suffix="원" accent="#1AB554" />
      </StatRow>

      {/* 기간 숫자 — 증감은 아래 줄에 */}
      <StatRow cols={3}>
        {[
          { label: `${periodLabel} 신규 예약`, value: ps.newReservations ?? 0, change: ps.newReservationsChange },
          { label: `${periodLabel} 신규 가입`, value: ps.newSignups ?? 0, change: ps.newSignupsChange },
          { label: `${periodLabel} 신규 리뷰`, value: ps.newReviews ?? 0, change: ps.newReviewsChange },
        ].map((p) => (
          <div key={p.label} className="adm-stat">
            <p className="adm-stat-label">{p.label}</p>
            <p className="adm-stat-value">{Number(p.value).toLocaleString()}<small>건</small></p>
            <p className="adm-stat-sub">{renderChange(p.change)}</p>
          </div>
        ))}
      </StatRow>

      {/* 매출 + 예약 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="매출 추이" sub="단위 만원">
          <div className="h-72 px-4 pb-5">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
                  <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}만`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
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
          <div className="h-72 px-4 pb-5">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reservationData} margin={{ top: 5, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
                  <XAxis dataKey="week" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}건`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: '#F2F4F6' }}
                    formatter={(v: any, name: any) => [`${v}건`, String(name)]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#4E5968' }} />
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

      {/* 카테고리 비중 + 가입 추이 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="카테고리별 매출 비중">
          <div className="h-72 px-4 pb-5">
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
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: any, name: any) => [`${v}%`, String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="신규 가입자 추이">
          <div className="h-72 px-4 pb-5">
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
                  <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}명`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: any) => [`${v}명`, '신규가입']}
                  />
                  <Area type="monotone" dataKey="신규가입" stroke={COLORS.primary} strokeWidth={2.5} fill="url(#signup-gradient)" activeDot={{ r: 5, fill: COLORS.primary, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 최근 예약 */}
      <SectionCard
        title="최근 예약"
        action={
          <a href="/admin/reservations" className="adm-card-link">
            전체 보기 <ChevronRight size={16} />
          </a>
        }
      >
        {recentReservations.length === 0 ? (
          <EmptyState icon={<CalendarDays size={22} />} title="최근 예약이 없어요" hint="새로운 예약이 들어오면 여기에 표시돼요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className={`${GRID} adm-ghead`}>
                <div>예약 ID</div>
                <div>고객</div>
                <div>상품</div>
                <div>병원</div>
                <div>금액</div>
                <div>상태</div>
                <div>예약일</div>
              </div>
              {recentReservations.map((r: any) => (
                <div key={r.id} className={`${GRID} adm-grow`}>
                  <div className="adm-mono truncate">{r.id.slice(0, 8)}</div>
                  <div className="adm-cell-main truncate">{r.customer}</div>
                  <div className="adm-cell truncate">{r.product}</div>
                  <div className="adm-cell truncate">{r.hospital}</div>
                  <div className="adm-num">{r.amount}</div>
                  <div><StatusBadge tone={statusTone[r.status] ?? 'gray'}>{statusLabels[r.status] ?? r.status}</StatusBadge></div>
                  <div className="adm-cell dim">{r.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
