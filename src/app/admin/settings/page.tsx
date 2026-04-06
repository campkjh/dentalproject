'use client';

import { useState } from 'react';
import {
  Settings,
  Save,
  Upload,
  Percent,
  FileText,
  Edit3,
  Plus,
  Shield,
  User,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
  Globe,
  ChevronDown,
} from 'lucide-react';

interface AdminAccount {
  id: number;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: '활성' | '비활성';
}

interface ServiceCategory {
  id: number;
  name: string;
  enabled: boolean;
}

const mockAdmins: AdminAccount[] = [
  { id: 1, name: '김관리', email: 'admin@kidoctor.co.kr', role: '최고 관리자', lastLogin: '2026-04-06 14:30', status: '활성' },
  { id: 2, name: '이운영', email: 'operation@kidoctor.co.kr', role: '운영 관리자', lastLogin: '2026-04-06 10:15', status: '활성' },
  { id: 3, name: '박마케팅', email: 'marketing@kidoctor.co.kr', role: '마케팅 관리자', lastLogin: '2026-04-05 18:20', status: '활성' },
  { id: 4, name: '최상담', email: 'cs@kidoctor.co.kr', role: '고객상담 관리자', lastLogin: '2026-04-06 09:00', status: '활성' },
  { id: 5, name: '정개발', email: 'dev@kidoctor.co.kr', role: '개발 관리자', lastLogin: '2026-04-04 16:45', status: '비활성' },
];

const termsItems = [
  { id: 1, name: '서비스 이용약관', updatedAt: '2026-03-15' },
  { id: 2, name: '개인정보처리방침', updatedAt: '2026-03-20' },
  { id: 3, name: '위치기반서비스 이용약관', updatedAt: '2026-02-10' },
];

export default function AdminSettingsPage() {
  // Basic settings
  const [platformName, setPlatformName] = useState('키닥터');
  const [email, setEmail] = useState('support@kidoctor.co.kr');
  const [phone, setPhone] = useState('02-1234-5678');

  // Fee settings
  const [baseFee, setBaseFee] = useState('15');
  const [premiumFee, setPremiumFee] = useState('12');
  const [settlementCycle, setSettlementCycle] = useState('월간');

  // Service categories
  const [categories, setCategories] = useState<ServiceCategory[]>([
    { id: 1, name: '치아미백', enabled: true },
    { id: 2, name: '라미네이트', enabled: true },
    { id: 3, name: '임플란트', enabled: true },
    { id: 4, name: '교정', enabled: true },
    { id: 5, name: '충치치료', enabled: true },
    { id: 6, name: '스케일링', enabled: true },
    { id: 7, name: '잇몸치료', enabled: false },
    { id: 8, name: '턱관절 치료', enabled: false },
  ]);

  const toggleCategory = (id: number) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, enabled: !cat.enabled } : cat))
    );
  };

  const adminStatusBadge: Record<string, string> = {
    '활성': 'bg-green-100 text-green-700',
    '비활성': 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">설정</h2>
      </div>

      {/* Basic Settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <Globe size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">기본 설정</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">플랫폼명</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">대표 이메일</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">대표 전화번호</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">로고 업로드</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <Upload size={20} className="text-gray-400" />
              </div>
              <div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  파일 선택
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG 최대 2MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Percent size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">수수료 설정</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">기본 수수료율</label>
            <div className="relative">
              <input
                type="text"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">일반 병원에 적용되는 기본 수수료율입니다.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">프리미엄 병원 수수료율</label>
            <div className="relative">
              <input
                type="text"
                value={premiumFee}
                onChange={(e) => setPremiumFee(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">프리미엄 계약 병원에 적용됩니다.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">정산 주기</label>
            <div className="relative">
              <select
                value={settlementCycle}
                onChange={(e) => setSettlementCycle(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-colors cursor-pointer pr-10"
              >
                <option value="주간">주간</option>
                <option value="월간">월간</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1">병원에 대한 정산 주기를 설정합니다.</p>
          </div>
        </div>
      </div>

      {/* Terms Management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">약관 관리</h3>
        </div>
        <div className="space-y-3">
          {termsItems.map((term) => (
            <div
              key={term.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{term.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">최종 수정: {term.updatedAt}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
                <Edit3 size={14} />
                수정
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Service Management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Settings size={16} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">서비스 관리</h3>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors shadow-sm">
            <Plus size={14} />
            신규 카테고리 추가
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">카테고리를 활성화/비활성화하여 서비스 노출 여부를 관리합니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                cat.enabled
                  ? 'bg-purple-50 border-[#7C3AED]/20'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <span className={`text-sm font-medium ${cat.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                {cat.name}
              </span>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="flex-shrink-0"
              >
                {cat.enabled ? (
                  <ToggleRight size={28} className="text-[#7C3AED]" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-300" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Accounts */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">관리자 계정</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최근 로그인</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {admin.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{admin.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{admin.email}</td>
                  <td className="px-5 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{admin.lastLogin}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${adminStatusBadge[admin.status]}`}>
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600" title="수정">
                      <Edit3 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-3 bg-[#7C3AED] text-white rounded-xl text-sm font-semibold hover:bg-[#6D28D9] transition-colors shadow-lg shadow-[#7C3AED]/25">
          <Save size={18} />
          저장하기
        </button>
      </div>
    </div>
  );
}
