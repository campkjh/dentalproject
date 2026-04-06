'use client';

import { useState, useMemo } from 'react';
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

// ---------------------------------------------------------------------------
// Stats cards data
// ---------------------------------------------------------------------------
const stats = [
  { label: '총 회원수', value: '12,458', change: '+248', trend: 'up' as const, icon: Users, color: 'bg-blue-500' },
  { label: '등록 병원', value: '342', change: '+12', trend: 'up' as const, icon: Building2, color: 'bg-green-500' },
  { label: '이번 달 예약', value: '1,847', change: '+156', trend: 'up' as const, icon: CalendarDays, color: 'bg-purple-500' },
  { label: '이번 달 매출', value: '₩248.5M', change: '+18.2%', trend: 'up' as const, icon: CreditCard, color: 'bg-orange-500' },
];

// ---------------------------------------------------------------------------
// Revenue line chart data (12 months, 매출 & 순매출)
// ---------------------------------------------------------------------------
const revenueDataByPeriod: Record<string, { month: string; 매출: number; 순매출: number }[]> = {
  month: [
    { month: '1월', 매출: 180, 순매출: 126 },
    { month: '2월', 매출: 195, 순매출: 137 },
    { month: '3월', 매출: 220, 순매출: 154 },
    { month: '4월', 매출: 248, 순매출: 174 },
    { month: '5월', 매출: 260, 순매출: 182 },
    { month: '6월', 매출: 275, 순매출: 193 },
    { month: '7월', 매출: 290, 순매출: 203 },
    { month: '8월', 매출: 310, 순매출: 217 },
    { month: '9월', 매출: 295, 순매출: 207 },
    { month: '10월', 매출: 320, 순매출: 224 },
    { month: '11월', 매출: 340, 순매출: 238 },
    { month: '12월', 매출: 365, 순매출: 256 },
  ],
  week: [
    { month: '월', 매출: 42, 순매출: 29 },
    { month: '화', 매출: 55, 순매출: 39 },
    { month: '수', 매출: 48, 순매출: 34 },
    { month: '목', 매출: 61, 순매출: 43 },
    { month: '금', 매출: 72, 순매출: 50 },
    { month: '토', 매출: 38, 순매출: 27 },
    { month: '일', 매출: 15, 순매출: 11 },
  ],
  today: [
    { month: '09시', 매출: 8, 순매출: 6 },
    { month: '10시', 매출: 15, 순매출: 11 },
    { month: '11시', 매출: 22, 순매출: 15 },
    { month: '12시', 매출: 12, 순매출: 8 },
    { month: '13시', 매출: 18, 순매출: 13 },
    { month: '14시', 매출: 25, 순매출: 18 },
    { month: '15시', 매출: 30, 순매출: 21 },
    { month: '16시', 매출: 28, 순매출: 20 },
  ],
};

// ---------------------------------------------------------------------------
// Reservation bar chart data (8 weeks, stacked by status)
// ---------------------------------------------------------------------------
const reservationDataByPeriod: Record<string, { week: string; 확인중: number; 확정: number; 완료: number; 취소: number }[]> = {
  month: [
    { week: '1주차', 확인중: 45, 확정: 62, 완료: 120, 취소: 15 },
    { week: '2주차', 확인중: 52, 확정: 70, 완료: 135, 취소: 18 },
    { week: '3주차', 확인중: 48, 확정: 58, 완료: 110, 취소: 12 },
    { week: '4주차', 확인중: 60, 확정: 75, 완료: 145, 취소: 20 },
    { week: '5주차', 확인중: 55, 확정: 68, 완료: 130, 취소: 16 },
    { week: '6주차', 확인중: 63, 확정: 80, 완료: 155, 취소: 22 },
    { week: '7주차', 확인중: 58, 확정: 72, 완료: 140, 취소: 19 },
    { week: '8주차', 확인중: 65, 확정: 85, 완료: 160, 취소: 14 },
  ],
  week: [
    { week: '월', 확인중: 12, 확정: 18, 완료: 35, 취소: 4 },
    { week: '화', 확인중: 15, 확정: 22, 완료: 40, 취소: 5 },
    { week: '수', 확인중: 10, 확정: 16, 완료: 30, 취소: 3 },
    { week: '목', 확인중: 18, 확정: 25, 완료: 45, 취소: 6 },
    { week: '금', 확인중: 20, 확정: 28, 완료: 50, 취소: 7 },
    { week: '토', 확인중: 8, 확정: 12, 완료: 20, 취소: 2 },
    { week: '일', 확인중: 3, 확정: 5, 완료: 8, 취소: 1 },
  ],
  today: [
    { week: '09시', 확인중: 3, 확정: 5, 완료: 8, 취소: 1 },
    { week: '10시', 확인중: 5, 확정: 8, 완료: 12, 취소: 2 },
    { week: '11시', 확인중: 7, 확정: 10, 완료: 18, 취소: 1 },
    { week: '12시', 확인중: 4, 확정: 6, 완료: 10, 취소: 2 },
    { week: '13시', 확인중: 6, 확정: 9, 완료: 15, 취소: 3 },
    { week: '14시', 확인중: 8, 확정: 12, 완료: 20, 취소: 2 },
    { week: '15시', 확인중: 9, 확정: 14, 완료: 22, 취소: 1 },
    { week: '16시', 확인중: 7, 확정: 11, 완료: 19, 취소: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Category pie chart data
// ---------------------------------------------------------------------------
const categoryData = [
  { name: '치과', value: 45, color: COLORS.primary },
  { name: '성형외과', value: 25, color: COLORS.blue },
  { name: '피부과', value: 15, color: COLORS.green },
  { name: '안과', value: 8, color: COLORS.yellow },
  { name: '기타', value: 7, color: COLORS.red },
];

// ---------------------------------------------------------------------------
// User growth area chart data (30 days)
// ---------------------------------------------------------------------------
function generateUserGrowthData(days: number): { date: string; 신규가입: number }[] {
  const data: { date: string; 신규가입: number }[] = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(2026, 3, 6); // April 6, 2026
    d.setDate(d.getDate() - i + 1);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    // Generate realistic-looking signup numbers with some variance
    const base = 35 + Math.round(Math.sin(i * 0.3) * 12 + (days - i) * 0.4);
    data.push({ date: `${month}/${day}`, 신규가입: base });
  }
  return data;
}

const userGrowthByPeriod: Record<string, { date: string; 신규가입: number }[]> = {
  month: generateUserGrowthData(30),
  week: generateUserGrowthData(7),
  today: [
    { date: '09시', 신규가입: 5 },
    { date: '10시', 신규가입: 8 },
    { date: '11시', 신규가입: 12 },
    { date: '12시', 신규가입: 7 },
    { date: '13시', 신규가입: 10 },
    { date: '14시', 신규가입: 14 },
    { date: '15시', 신규가입: 11 },
    { date: '16시', 신규가입: 9 },
  ],
};

// ---------------------------------------------------------------------------
// Recent reservations
// ---------------------------------------------------------------------------
const recentReservations = [
  { id: 'R001', customer: '김서연', product: '원데이 치아미백 3회', hospital: '레브치과의원', amount: '55,000원', status: 'pending', date: '2026-04-06 14:30' },
  { id: 'R002', customer: '박지훈', product: '무삭제로네이트 라미네이트', hospital: '아이디치과', amount: '759,000원', status: 'confirmed', date: '2026-04-06 13:15' },
  { id: 'R003', customer: '이하은', product: '올타이트 리프팅 100샷', hospital: '온리프성형외과', amount: '195,900원', status: 'completed', date: '2026-04-06 11:00' },
  { id: 'R004', customer: '정민수', product: '디데이 치아미백 11', hospital: '참포도나무치과', amount: '759,000원', status: 'cancelled', date: '2026-04-06 10:20' },
  { id: 'R005', customer: '최유진', product: '무삭제 폴리네이트', hospital: '레브치과의원', amount: '385,000원', status: 'pending', date: '2026-04-05 16:45' },
];

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

  const revenueData = useMemo(() => revenueDataByPeriod[period] ?? revenueDataByPeriod.month, [period]);
  const reservationData = useMemo(() => reservationDataByPeriod[period] ?? reservationDataByPeriod.month, [period]);
  const userGrowthData = useMemo(() => userGrowthByPeriod[period] ?? userGrowthByPeriod.month, [period]);

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
                  {categoryData.map((entry, index) => (
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
              {recentReservations.map((res) => (
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
