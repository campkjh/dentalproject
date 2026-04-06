'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Percent,
  Calendar,
  Eye,
  RotateCcw,
  Building2,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';

// --- Types ---
type Period = '일별' | '주별' | '월별';
type PaymentStatus = '완료' | '환불' | '부분환불';
type PaymentMethod = '카카오페이' | '토스' | '카드' | '계좌이체' | '네이버페이';

interface Payment {
  id: string;
  customer: string;
  product: string;
  hospital: string;
  amount: number;
  fee: number;
  method: PaymentMethod;
  datetime: string;
  status: PaymentStatus;
}

// --- Mock Data ---
const mockPayments: Payment[] = [
  { id: 'PAY-20260406-001', customer: '김서연', product: '원데이 치아미백 3회', hospital: '레브치과의원', amount: 55000, fee: 5500, method: '카카오페이', datetime: '2026-04-06 14:30', status: '완료' },
  { id: 'PAY-20260406-002', customer: '박지훈', product: '무삭제 라미네이트 10개', hospital: '아이디치과', amount: 7590000, fee: 759000, method: '카드', datetime: '2026-04-06 13:15', status: '완료' },
  { id: 'PAY-20260406-003', customer: '이하은', product: '올타이트 리프팅 100샷', hospital: '온리프성형외과', amount: 195900, fee: 19590, method: '토스', datetime: '2026-04-06 11:00', status: '완료' },
  { id: 'PAY-20260406-004', customer: '정민수', product: '디데이 치아미백 11', hospital: '참포도나무치과', amount: 759000, fee: 75900, method: '네이버페이', datetime: '2026-04-06 10:20', status: '환불' },
  { id: 'PAY-20260405-005', customer: '최유진', product: '무삭제 폴리네이트', hospital: '레브치과의원', amount: 385000, fee: 38500, method: '카카오페이', datetime: '2026-04-05 16:45', status: '완료' },
  { id: 'PAY-20260405-006', customer: '한소희', product: '레진 인레이 3개', hospital: '참포도나무치과', amount: 450000, fee: 45000, method: '카드', datetime: '2026-04-05 14:20', status: '완료' },
  { id: 'PAY-20260405-007', customer: '오지은', product: '임플란트 1개', hospital: '아이디치과', amount: 1200000, fee: 120000, method: '계좌이체', datetime: '2026-04-05 11:30', status: '부분환불' },
  { id: 'PAY-20260404-008', customer: '윤도현', product: '교정 상담 + 장치', hospital: '온리프성형외과', amount: 3500000, fee: 350000, method: '카드', datetime: '2026-04-04 15:00', status: '완료' },
  { id: 'PAY-20260404-009', customer: '강민지', product: '스케일링 패키지', hospital: '참포도나무치과', amount: 89000, fee: 8900, method: '토스', datetime: '2026-04-04 10:45', status: '완료' },
  { id: 'PAY-20260403-010', customer: '서준혁', product: '사랑니 발치 2개', hospital: '레브치과의원', amount: 260000, fee: 26000, method: '카카오페이', datetime: '2026-04-03 16:30', status: '완료' },
  { id: 'PAY-20260403-011', customer: '임수빈', product: '치아미백 홈키트', hospital: '아이디치과', amount: 120000, fee: 12000, method: '네이버페이', datetime: '2026-04-03 14:10', status: '환불' },
  { id: 'PAY-20260402-012', customer: '조예진', product: '세라믹 크라운 2개', hospital: '참포도나무치과', amount: 980000, fee: 98000, method: '카드', datetime: '2026-04-02 09:30', status: '완료' },
];

// --- 30-day Revenue Data for Area Chart ---
const dailyRevenueData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const base = 5 + Math.random() * 20;
  const weekday = new Date(2026, 3, day).getDay();
  const weekendDip = weekday === 0 || weekday === 6 ? 0.6 : 1;
  const trend = 1 + i * 0.015;
  const revenue = Math.round(base * weekendDip * trend * 10) / 10;
  return {
    date: `4/${day}`,
    revenue,
  };
});

// --- Payment Method Donut Data ---
const paymentMethodData = [
  { name: '카카오페이', value: 35, color: '#F59E0B' },
  { name: '토스', value: 25, color: '#3B82F6' },
  { name: '카드', value: 20, color: '#7C3AED' },
  { name: '계좌이체', value: 12, color: '#10B981' },
  { name: '네이버페이', value: 8, color: '#EC4899' },
];

// --- Top 10 Hospital Revenue Data for Bar Chart ---
const hospitalBarData = [
  { name: '참포도나무치과', revenue: 4820 },
  { name: '온리프성형외과', revenue: 3870 },
  { name: '레브치과의원', revenue: 3210 },
  { name: '아이디치과', revenue: 2890 },
  { name: '서울미소치과', revenue: 2540 },
  { name: '강남유치과', revenue: 2230 },
  { name: '연세플러스치과', revenue: 1980 },
  { name: '에스플란트치과', revenue: 1750 },
  { name: '미르치과의원', revenue: 1520 },
  { name: '올바른치과', revenue: 1340 },
];

// --- Heatmap Data (hour x day of week) ---
const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
const heatmapData: number[][] = Array.from({ length: 7 }, (_, dayIdx) =>
  Array.from({ length: 24 }, (__, hour) => {
    if (hour < 7 || hour > 22) return Math.floor(Math.random() * 3);
    if (hour >= 9 && hour <= 18) {
      const peak = dayIdx < 5 ? 0.9 : 0.4;
      const lunchBoost = hour >= 12 && hour <= 14 ? 1.3 : 1;
      return Math.floor(Math.random() * 30 * peak * lunchBoost + 5);
    }
    return Math.floor(Math.random() * 10 + 2);
  })
);

// --- Sparkline Data for Summary Cards ---
const sparklineTotal = [
  { v: 32 }, { v: 35 }, { v: 33 }, { v: 38 }, { v: 36 }, { v: 40 }, { v: 42 },
];
const sparklineNet = [
  { v: 28 }, { v: 31 }, { v: 29 }, { v: 34 }, { v: 32 }, { v: 35 }, { v: 37 },
];
const sparklineRefund = [
  { v: 4.2 }, { v: 3.8 }, { v: 5.1 }, { v: 3.5 }, { v: 4.0 }, { v: 3.2 }, { v: 3.6 },
];
const sparklineFee = [
  { v: 4.8 }, { v: 5.2 }, { v: 5.0 }, { v: 5.7 }, { v: 5.4 }, { v: 6.0 }, { v: 6.3 },
];

const statusColors: Record<PaymentStatus, string> = {
  완료: 'bg-green-100 text-green-700',
  환불: 'bg-red-100 text-red-700',
  부분환불: 'bg-orange-100 text-orange-700',
};

const methodColors: Record<PaymentMethod, string> = {
  카카오페이: 'bg-yellow-100 text-yellow-800',
  토스: 'bg-blue-100 text-blue-800',
  카드: 'bg-gray-100 text-gray-800',
  계좌이체: 'bg-emerald-100 text-emerald-800',
  네이버페이: 'bg-green-100 text-green-800',
};

function formatCurrency(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toLocaleString()}만`;
  }
  return `${value.toLocaleString()}`;
}

// Mini sparkline component for summary cards
function MiniSparkline({
  data,
  color,
  height = 32,
}: {
  data: { v: number }[];
  color: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Heatmap intensity helper
function getHeatmapColor(value: number, max: number): string {
  if (max === 0) return 'bg-gray-100';
  const ratio = value / max;
  if (ratio > 0.8) return 'bg-[#7C3AED]';
  if (ratio > 0.6) return 'bg-[#A78BFA]';
  if (ratio > 0.4) return 'bg-[#C4B5FD]';
  if (ratio > 0.2) return 'bg-[#DDD6FE]';
  if (ratio > 0.05) return 'bg-[#EDE9FE]';
  return 'bg-gray-100';
}

function getHeatmapTextColor(value: number, max: number): string {
  if (max === 0) return 'text-gray-400';
  const ratio = value / max;
  if (ratio > 0.6) return 'text-white';
  return 'text-gray-500';
}

// Custom tooltip for Area Chart
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-[#7C3AED]">
          {payload[0].value.toFixed(1)}M
        </p>
      </div>
    );
  }
  return null;
}

// Custom tooltip for Bar Chart
function HospitalTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; revenue: number } }[] }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs font-medium text-gray-900">{payload[0].payload.name}</p>
        <p className="text-sm font-semibold text-[#7C3AED]">
          {formatCurrency(payload[0].payload.revenue * 10000)}
        </p>
      </div>
    );
  }
  return null;
}

export default function AdminPaymentsPage() {
  const [period, setPeriod] = useState<Period>('일별');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-06');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 10;

  // Heatmap max
  const heatmapMax = useMemo(() => Math.max(...heatmapData.flat()), []);

  // Filter payments
  const filteredPayments = mockPayments.filter((p) => {
    if (searchQuery === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      p.customer.toLowerCase().includes(query) ||
      p.product.toLowerCase().includes(query) ||
      p.hospital.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / paymentsPerPage));
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * paymentsPerPage,
    currentPage * paymentsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">매출/결제 관리</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-sm rounded-lg hover:bg-[#6D28D9] transition-colors">
          <Download size={16} />
          엑셀 다운로드
        </button>
      </div>

      {/* Revenue Summary Cards with Sparklines */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={16} className="text-[#7C3AED]" />
                <span className="text-sm text-gray-500">총 매출</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">248.5M</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5">
                <TrendingUp size={12} /> +18.2% 전월 대비
              </p>
            </div>
            <div className="w-20 h-10">
              <MiniSparkline data={sparklineTotal} color="#7C3AED" height={40} />
            </div>
          </div>
        </div>
        {/* Net Revenue */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={16} className="text-[#10B981]" />
                <span className="text-sm text-gray-500">순 매출</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">223.6M</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5">
                <TrendingUp size={12} /> +15.7% 전월 대비
              </p>
            </div>
            <div className="w-20 h-10">
              <MiniSparkline data={sparklineNet} color="#10B981" height={40} />
            </div>
          </div>
        </div>
        {/* Refund */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={16} className="text-[#EF4444]" />
                <span className="text-sm text-gray-500">환불</span>
              </div>
              <p className="text-2xl font-bold text-red-600">24.9M</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-0.5">
                <TrendingDown size={12} /> 환불율 10.0%
              </p>
            </div>
            <div className="w-20 h-10">
              <MiniSparkline data={sparklineRefund} color="#EF4444" height={40} />
            </div>
          </div>
        </div>
        {/* Fee Income */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Percent size={16} className="text-[#F59E0B]" />
                <span className="text-sm text-gray-500">수수료 수입</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">37.3M</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5">
                <TrendingUp size={12} /> +12.4% 전월 대비
              </p>
            </div>
            <div className="w-20 h-10">
              <MiniSparkline data={sparklineFee} color="#F59E0B" height={40} />
            </div>
          </div>
        </div>
      </div>

      {/* Date Range + Period Tabs + Revenue Area Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['일별', '주별', '월별'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  period === p
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue Area Chart */}
        <h3 className="font-semibold text-gray-900 mb-4">
          매출 추이 ({period})
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyRevenueData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}M`}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7C3AED"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                activeDot={{ r: 5, fill: '#7C3AED', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row: Donut + Horizontal Bar */}
      <div className="grid grid-cols-2 gap-6">
        {/* Payment Method Donut Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">결제수단 비율</h3>
          <div className="flex items-center">
            <div className="w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={3}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value}%`, name]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3 pl-4">
              {paymentMethodData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hospital Revenue Horizontal Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-[#7C3AED]" />
            <h3 className="font-semibold text-gray-900">병원별 매출 TOP 10</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hospitalBarData}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(1)}B` : `${v}M`}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<HospitalTooltip />} />
                <Bar
                  dataKey="revenue"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                >
                  {hospitalBarData.map((_, index) => (
                    <Cell
                      key={`bar-cell-${index}`}
                      fill={index < 3 ? '#7C3AED' : index < 6 ? '#A78BFA' : '#C4B5FD'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Transaction Heatmap */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">시간대별 거래량 히트맵</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-10 flex-shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[10px] text-gray-400 font-medium"
                >
                  {h}시
                </div>
              ))}
            </div>
            {/* Heatmap rows */}
            {dayLabels.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <div className="w-10 flex-shrink-0 text-xs font-medium text-gray-500 text-right pr-2">
                  {day}
                </div>
                {heatmapData[dayIdx].map((val, hour) => (
                  <div
                    key={hour}
                    className={`flex-1 h-8 rounded-sm flex items-center justify-center transition-colors ${getHeatmapColor(
                      val,
                      heatmapMax
                    )}`}
                    title={`${day} ${hour}시: ${val}건`}
                  >
                    <span className={`text-[10px] font-medium ${getHeatmapTextColor(val, heatmapMax)}`}>
                      {val > 0 ? val : ''}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {/* Heatmap legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-gray-400">적음</span>
              <div className="flex gap-0.5">
                {['bg-gray-100', 'bg-[#EDE9FE]', 'bg-[#DDD6FE]', 'bg-[#C4B5FD]', 'bg-[#A78BFA]', 'bg-[#7C3AED]'].map(
                  (cls, i) => (
                    <div key={i} className={`w-5 h-3 rounded-sm ${cls}`} />
                  )
                )}
              </div>
              <span className="text-[10px] text-gray-400">많음</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">결제 내역</h3>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="고객명, 상품명, 병원명 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] w-80"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">결제번호</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">고객명</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">상품명</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">병원명</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">결제금액</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">수수료</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">결제수단</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">결제일시</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">상태</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-[#7C3AED] font-medium font-mono">
                    {payment.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{payment.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                    {payment.product}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.hospital}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                    {payment.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {payment.fee.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        methodColors[payment.method]
                      }`}
                    >
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{payment.datetime}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[payment.status]
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        title="상세"
                        className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      {payment.status === '완료' && (
                        <button
                          title="환불처리"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            총 {filteredPayments.length}건 중 {(currentPage - 1) * paymentsPerPage + 1}-
            {Math.min(currentPage * paymentsPerPage, filteredPayments.length)}건
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  currentPage === page
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
