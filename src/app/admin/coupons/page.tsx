'use client';

import { useState } from 'react';
import {
  Ticket,
  Coins,
  Plus,
  Search,
  Edit3,
  Power,
  ChevronLeft,
  ChevronRight,
  Gift,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Wallet,
  Save,
} from 'lucide-react';

type CouponStatus = '활성' | '비활성' | '만료';
type PointType = '적립' | '사용';

interface CouponRow {
  id: number;
  code: string;
  name: string;
  discount: string;
  issued: number;
  used: number;
  usageRate: number;
  validPeriod: string;
  status: CouponStatus;
}

interface PointHistory {
  id: number;
  memberName: string;
  type: PointType;
  reason: string;
  amount: number;
  date: string;
}

const mockCoupons: CouponRow[] = [
  { id: 1, code: 'SPRING2026', name: '봄맞이 할인쿠폰', discount: '15,000원', issued: 500, used: 342, usageRate: 68.4, validPeriod: '2026-04-01 ~ 2026-04-30', status: '활성' },
  { id: 2, code: 'WELCOME10', name: '신규가입 환영쿠폰', discount: '10,000원', issued: 245, used: 198, usageRate: 80.8, validPeriod: '2026-01-01 ~ 2026-12-31', status: '활성' },
  { id: 3, code: 'REVIEW5K', name: '리뷰작성 감사쿠폰', discount: '5,000원', issued: 180, used: 120, usageRate: 66.7, validPeriod: '2026-03-01 ~ 2026-06-30', status: '활성' },
  { id: 4, code: 'VIP20', name: 'VIP 회원 전용 쿠폰', discount: '20,000원', issued: 50, used: 38, usageRate: 76.0, validPeriod: '2026-04-01 ~ 2026-05-31', status: '활성' },
  { id: 5, code: 'WHITENING', name: '치아미백 전용 쿠폰', discount: '30,000원', issued: 100, used: 67, usageRate: 67.0, validPeriod: '2026-03-15 ~ 2026-04-15', status: '활성' },
  { id: 6, code: 'NEWYEAR26', name: '새해 특별 할인', discount: '20,000원', issued: 80, used: 52, usageRate: 65.0, validPeriod: '2026-01-01 ~ 2026-01-31', status: '만료' },
  { id: 7, code: 'FRIEND5K', name: '친구추천 쿠폰', discount: '5,000원', issued: 60, used: 25, usageRate: 41.7, validPeriod: '2026-02-01 ~ 2026-03-31', status: '만료' },
  { id: 8, code: 'SUMMER30', name: '여름 프로모션 쿠폰', discount: '30,000원', issued: 30, used: 14, usageRate: 46.7, validPeriod: '2026-06-01 ~ 2026-08-31', status: '비활성' },
  { id: 9, code: 'DENTAL15', name: '치과 정기검진 할인', discount: '15,000원', issued: 0, used: 0, usageRate: 0, validPeriod: '2026-05-01 ~ 2026-05-31', status: '비활성' },
];

const mockPointHistory: PointHistory[] = [
  { id: 1, memberName: '김서연', type: '적립', reason: '리뷰 작성', amount: 500, date: '2026-04-06 14:30' },
  { id: 2, memberName: '박지훈', type: '사용', reason: '예약 결제 시 사용', amount: 3000, date: '2026-04-06 13:15' },
  { id: 3, memberName: '이하은', type: '적립', reason: '결제 적립 (1%)', amount: 1959, date: '2026-04-06 11:00' },
  { id: 4, memberName: '정민수', type: '적립', reason: '신규 가입 축하', amount: 2000, date: '2026-04-05 18:20' },
  { id: 5, memberName: '최유진', type: '사용', reason: '예약 결제 시 사용', amount: 5000, date: '2026-04-05 16:45' },
  { id: 6, memberName: '한소희', type: '적립', reason: '이벤트 참여', amount: 1000, date: '2026-04-05 15:30' },
  { id: 7, memberName: '오승우', type: '사용', reason: '예약 결제 시 사용', amount: 2500, date: '2026-04-05 12:00' },
  { id: 8, memberName: '윤다은', type: '적립', reason: '리뷰 작성', amount: 500, date: '2026-04-04 17:45' },
  { id: 9, memberName: '임재현', type: '적립', reason: '결제 적립 (1%)', amount: 7590, date: '2026-04-04 14:20' },
  { id: 10, memberName: '강도윤', type: '사용', reason: '예약 결제 시 사용', amount: 10000, date: '2026-04-04 10:30' },
];

const couponStatusBadge: Record<CouponStatus, string> = {
  '활성': 'bg-green-100 text-green-700',
  '비활성': 'bg-gray-100 text-gray-500',
  '만료': 'bg-red-100 text-red-700',
};

const pointTypeBadge: Record<PointType, string> = {
  '적립': 'bg-blue-100 text-blue-700',
  '사용': 'bg-orange-100 text-orange-700',
};

const couponStats = [
  { label: '총 발급', value: '1,245', icon: Gift, color: 'bg-blue-500' },
  { label: '사용완료', value: '856', icon: CheckCircle2, color: 'bg-green-500' },
  { label: '사용가능', value: '234', icon: Clock, color: 'bg-purple-500' },
  { label: '기간만료', value: '155', icon: XCircle, color: 'bg-red-500' },
];

const pointStats = [
  { label: '총 발행 포인트', value: '2,450,000P', icon: Coins, color: 'bg-blue-500' },
  { label: '사용된 포인트', value: '1,230,000P', icon: TrendingUp, color: 'bg-green-500' },
  { label: '미사용 포인트', value: '1,220,000P', icon: Wallet, color: 'bg-purple-500' },
];

export default function AdminCouponsPage() {
  const [activeTab, setActiveTab] = useState<'coupons' | 'points'>('coupons');
  const [couponPage, setCouponPage] = useState(1);
  const [pointPage, setPointPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Point policy state
  const [signupPoint, setSignupPoint] = useState('2000');
  const [paymentRate, setPaymentRate] = useState('1');
  const [reviewPoint, setReviewPoint] = useState('500');
  const [eventPoint, setEventPoint] = useState('1000');

  const tabs = [
    { key: 'coupons' as const, label: '쿠폰 관리', icon: Ticket },
    { key: 'points' as const, label: '포인트 관리', icon: Coins },
  ];

  const totalCouponPages = 5;
  const totalPointPages = 8;

  const getPageNumbers = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total);
      } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
      }
    }
    return pages;
  };

  const filteredCoupons = mockCoupons.filter(
    (c) => c.name.includes(searchQuery) || c.code.includes(searchQuery.toUpperCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">쿠폰/포인트 관리</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <>
          {/* Coupon Stats */}
          <div className="grid grid-cols-4 gap-4">
            {couponStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Action */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="쿠폰명, 쿠폰코드로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors shadow-sm">
                <Plus size={16} />
                새 쿠폰 생성
              </button>
            </div>
          </div>

          {/* Coupon Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">쿠폰코드</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">쿠폰명</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">할인금액</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">발급수</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용수</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용률</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유효기간</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm text-[#7C3AED] font-mono font-medium">{coupon.code}</td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">{coupon.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-900 font-medium">{coupon.discount}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{coupon.issued.toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{coupon.used.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-[#7C3AED] rounded-full"
                              style={{ width: `${coupon.usageRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-700">{coupon.usageRate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{coupon.validPeriod}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${couponStatusBadge[coupon.status]}`}>
                          {coupon.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600" title="수정">
                            <Edit3 size={15} />
                          </button>
                          {coupon.status === '활성' && (
                            <button className="p-1.5 hover:bg-orange-50 rounded-lg transition-colors text-orange-600" title="비활성화">
                              <Power size={15} />
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
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                전체 <span className="font-medium text-gray-900">45</span>건 중{' '}
                <span className="font-medium text-gray-900">{(couponPage - 1) * 10 + 1}-{Math.min(couponPage * 10, 45)}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCouponPage(Math.max(1, couponPage - 1))}
                  disabled={couponPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                {getPageNumbers(couponPage, totalCouponPages).map((page, idx) =>
                  typeof page === 'string' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCouponPage(page)}
                      className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                        couponPage === page
                          ? 'bg-[#7C3AED] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCouponPage(Math.min(totalCouponPages, couponPage + 1))}
                  disabled={couponPage === totalCouponPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Points Tab */}
      {activeTab === 'points' && (
        <>
          {/* Point Stats */}
          <div className="grid grid-cols-3 gap-4">
            {pointStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Point Policy Settings */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">포인트 적립 정책</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors shadow-sm">
                <Save size={16} />
                정책 저장
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">가입 적립</label>
                <div className="relative">
                  <input
                    type="text"
                    value={signupPoint}
                    onChange={(e) => setSignupPoint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">P</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">결제 적립률</label>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentRate}
                    onChange={(e) => setPaymentRate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">리뷰 적립</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reviewPoint}
                    onChange={(e) => setReviewPoint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">P</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이벤트 적립</label>
                <div className="relative">
                  <input
                    type="text"
                    value={eventPoint}
                    onChange={(e) => setEventPoint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">P</span>
                </div>
              </div>
            </div>
          </div>

          {/* Point History Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">최근 포인트 내역</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회원명</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사유</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockPointHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">{item.memberName}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${pointTypeBadge[item.type]}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.reason}</td>
                      <td className="px-5 py-4 text-sm font-medium">
                        <span className={item.type === '적립' ? 'text-blue-600' : 'text-orange-600'}>
                          {item.type === '적립' ? '+' : '-'}{item.amount.toLocaleString()}P
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                전체 <span className="font-medium text-gray-900">78</span>건 중{' '}
                <span className="font-medium text-gray-900">{(pointPage - 1) * 10 + 1}-{Math.min(pointPage * 10, 78)}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPointPage(Math.max(1, pointPage - 1))}
                  disabled={pointPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                {getPageNumbers(pointPage, totalPointPages).map((page, idx) =>
                  typeof page === 'string' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setPointPage(page)}
                      className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                        pointPage === page
                          ? 'bg-[#7C3AED] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPointPage(Math.min(totalPointPages, pointPage + 1))}
                  disabled={pointPage === totalPointPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
