'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Eye,
  Star,
  ShoppingBag,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSession } from '@/lib/supabase/SessionProvider';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
};

// --- Data is fetched from /api/admin/dashboard ---
/* eslint-disable @typescript-eslint/no-explicit-any */

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  pending: '확인중',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminDashboard() {
  const [period, setPeriod] = useState('month');
  const { authUser } = useSession();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setApiData(data);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  const s = apiData?.stats ?? {};
  const stats = [
    { label: '총 회원수', value: (s.totalUsers ?? 0).toLocaleString(), change: '', trend: 'up' as const, icon: Users, color: 'bg-blue-500' },
    { label: '등록 병원', value: (s.totalHospitals ?? 0).toLocaleString(), change: `승인 ${s.approvedHospitals ?? 0}`, trend: 'up' as const, icon: Building2, color: 'bg-green-500' },
    { label: '이번 달 예약', value: (s.monthReservations ?? 0).toLocaleString(), change: '', trend: 'up' as const, icon: CalendarDays, color: 'bg-purple-500' },
    { label: '이번 달 매출', value: `₩${((s.monthRevenue ?? 0) / 10000).toFixed(1)}만`, change: '', trend: 'up' as const, icon: CreditCard, color: 'bg-orange-500' },
  ];

  const categoryData = (apiData?.categoryData ?? []).map((c: any, i: number) => ({
    ...c,
    color: [COLORS.primary, COLORS.blue, COLORS.green, COLORS.yellow, COLORS.red][i % 5],
  }));

  const recentReservations = (apiData?.recentReservations ?? []).map((r: any) => ({
    ...r,
    amount: `${(r.amount ?? 0).toLocaleString()}원`,
  }));

  const revenueData = (apiData?.monthlyRevenue ?? []).map((m: any) => ({
    month: m.month,
    매출: m.revenue / 10000,
    순매출: Math.round(m.revenue * 0.7) / 10000,
  }));
  const reservationData = (apiData?.monthlyRevenue ?? []).map((m: any) => ({
    week: m.month,
    확인중: 0,
    확정: 0,
    완료: m.count,
    취소: 0,
  }));
  const userGrowthData = (apiData?.monthlyRevenue ?? []).map((m: any) => ({
    date: m.month,
    신규가입: m.count,
  }));

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header & Period Selector                                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { value: 'today', label: '오늘' },
            { value: 'week', label: '이번 주' },
            { value: 'month', label: '이번 달' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Cards                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{stat.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Row 1 : Revenue Line Chart + Reservation Bar Chart                */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Line Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {period === 'month' ? '월별' : period === 'week' ? '요일별' : '시간별'} 매출 추이
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₩${v}M`}
                />
                <Tooltip
                  formatter={(value, name) => [`₩${value}M`, name as string]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
                  }}
                />
                <Legend iconType="circle" iconSize={8} />
                <Line
                  type="monotone"
                  dataKey="매출"
                  stroke={COLORS.primary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORS.primary }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="순매출"
                  stroke={COLORS.primaryLight}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLORS.primaryLight }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reservation Stacked Bar Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {period === 'month' ? '주간' : period === 'week' ? '요일별' : '시간별'} 예약 현황
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reservationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}건`}
                />
                <Tooltip
                  formatter={(value, name) => [`${value}건`, name as string]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
                  }}
                />
                <Legend iconType="square" iconSize={10} />
                <Bar dataKey="확인중" stackId="a" fill={COLORS.yellow} radius={[0, 0, 0, 0]} />
                <Bar dataKey="확정" stackId="a" fill={COLORS.blue} />
                <Bar dataKey="완료" stackId="a" fill={COLORS.green} />
                <Bar dataKey="취소" stackId="a" fill={COLORS.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Row 2 : Pie Chart + Area Chart                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">카테고리별 매출 비중</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name as string]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: '#374151', fontSize: '13px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth Area Chart */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {period === 'month' ? '최근 30일' : period === 'week' ? '최근 7일' : '오늘'} 신규 가입자 추이
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  interval={period === 'month' ? 4 : 0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}명`}
                />
                <Tooltip
                  formatter={(value, name) => [`${value}명`, name as string]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="신규가입"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#gradientPurple)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Recent Reservations Table                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">최근 예약</h3>
          <a href="/admin/reservations" className="text-sm text-[#7C3AED] hover:underline flex items-center gap-1">
            전체보기 <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">예약번호</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">고객</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">상품</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">병원</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">금액</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentReservations.map((res: any) => (
                <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-[#7C3AED] font-medium">{res.id}</td>
                  <td className="px-5 py-3 text-sm text-gray-900">{res.customer}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">{res.product}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{res.hospital}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 font-medium">{res.amount}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[res.status]}`}>
                      {statusLabels[res.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{res.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Stats Row                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">오늘 방문자</span>
          </div>
          <p className="text-2xl font-bold">3,247</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5">
            <TrendingUp size={12} /> 전일 대비 +12.3%
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">오늘 신규 가입</span>
          </div>
          <p className="text-2xl font-bold">48</p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5">
            <TrendingUp size={12} /> 전일 대비 +5.2%
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">신규 리뷰</span>
          </div>
          <p className="text-2xl font-bold">23</p>
          <p className="text-xs text-red-500 mt-1 flex items-center gap-0.5">
            <TrendingDown size={12} /> 전일 대비 -3.1%
          </p>
        </div>
      </div>
    </div>
  );
}
