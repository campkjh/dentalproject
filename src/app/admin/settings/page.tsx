'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Trash2, Plus, X, Save } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { useStore } from '@/store';
import { Dropdown } from '@/components/admin/Dropdown';

type AdminRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  last_sign_in_at: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

const cycleLabel: Record<string, string> = {
  weekly: '주간', biweekly: '격주', monthly: '월간', quarterly: '분기',
};

// ---- Reusable Toss-style components ----
function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-3 px-1">
        <h2 className="text-[17px] font-bold text-[#191F28] tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function InfoRow({ label, value, action, last }: { label: string; value: React.ReactNode; action?: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="grid grid-cols-[160px_1fr_auto] items-center gap-4 px-5 py-[14px]"
      style={{ borderBottom: last ? 'none' : '1px solid #F2F4F6' }}
    >
      <span className="text-[13px] font-medium text-[#8B95A1]">{label}</span>
      <span className="text-[14px] text-[#191F28] truncate">{value}</span>
      <span>{action}</span>
    </div>
  );
}

function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="grid grid-cols-[160px_1fr] items-center gap-4 px-5 py-[14px]"
      style={{ borderBottom: last ? 'none' : '1px solid #F2F4F6' }}
    >
      <span className="text-[13px] font-medium text-[#8B95A1]">{label}</span>
      <div className="max-w-[420px]">{children}</div>
    </div>
  );
}

function PillButton({ children, onClick, tone = 'gray' }: { children: React.ReactNode; onClick?: () => void; tone?: 'gray' | 'blue' | 'red' }) {
  const styles: Record<string, string> = {
    gray: 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]',
    blue: 'bg-[#E5F1FF] text-[#3182F6] hover:bg-[#D6E8FF]',
    red: 'bg-[#FEECEC] text-[#E54848] hover:bg-[#FCDCDC]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center h-[28px] px-[10px] rounded-md text-[12px] font-semibold transition-colors ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

export default function AdminSettingsPage() {
  const showAlert = useStore((s) => s.showAlert);
  const showConfirm = useStore((s) => s.showConfirm);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showGrant, setShowGrant] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const [feePolicy, setFeePolicy] = useState({
    base_fee_percent: 15,
    premium_fee_percent: 12,
    settlement_cycle: 'monthly',
    minimum_payout: 100000,
  });
  const [policyMigrationRequired, setPolicyMigrationRequired] = useState(false);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);

  const loadPolicy = async () => {
    const res = await fetch('/api/admin/platform-settings', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.migration_required) setPolicyMigrationRequired(true);
    if (data.settings?.fee_policy) setFeePolicy({ ...feePolicy, ...data.settings.fee_policy });
  };

  const savePolicy = async () => {
    setPolicyBusy(true);
    setPolicySaved(false);
    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'fee_policy', value: feePolicy }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert(data?.error ?? '저장 실패');
        return;
      }
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 2000);
    } finally {
      setPolicyBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/admins', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data?.error ?? `관리자 목록 불러오기 실패 (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setAdmins(data.admins ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGrant = async () => {
    if (!grantUserId.trim()) {
      setGrantError('회원 ID가 필요합니다.');
      return;
    }
    setGrantBusy(true);
    setGrantError(null);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: grantUserId.trim(), action: 'grant' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGrantError(data?.error ?? '권한 부여에 실패했습니다.');
        return;
      }
      setShowGrant(false);
      setGrantUserId('');
      await load();
    } finally {
      setGrantBusy(false);
    }
  };

  const handleRevoke = (a: AdminRow) => {
    showConfirm(
      '관리자 권한 해제',
      `"${a.name || a.email}"의 관리자 권한을 해제하시겠습니까?`,
      async () => {
        const res = await fetch('/api/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: a.id, action: 'revoke' }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showAlert(data?.error ?? '해제 실패');
          return;
        }
        await load();
      },
      { confirmText: '해제', cancelText: '취소' }
    );
  };

  const inputCls =
    'w-full h-11 px-3.5 border border-[#E5E8EB] rounded-[10px] text-[14px] text-[#191F28] focus:outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-[#3182F6]/15 bg-white transition-all';

  return (
    <div className="max-w-[920px] mx-auto space-y-7">
      {/* Page header — Toss-style: bold title + small description */}
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[#191F28]">설정</h1>
        <p className="text-[13px] text-[#8B95A1] mt-1.5">플랫폼 기본 정보와 관리자 권한, 정산 정책을 관리합니다.</p>
      </div>

      {/* ---------- 기본 정보 ---------- */}
      <SectionCard title="기본 정보">
        <InfoRow label="서비스명" value={siteConfig.copyrightName} />
        <InfoRow label="상호" value={siteConfig.companyName} />
        <InfoRow label="대표자" value={siteConfig.representative} />
        <InfoRow label="사업자등록번호" value={siteConfig.businessNumber} />
        <InfoRow label="통신판매업신고" value={siteConfig.mailOrderNumber} />
        <InfoRow label="주소" value={siteConfig.address} />
        <InfoRow label="고객센터" value={siteConfig.phone} />
        <InfoRow label="이메일" value={siteConfig.email} last />
      </SectionCard>
      <p className="text-[12px] text-[#8B95A1] -mt-4 px-1">
        이 정보는 Vercel 환경 변수(<code className="px-1 py-0.5 bg-[#F2F4F6] rounded text-[#4E5968]">NEXT_PUBLIC_COMPANY_*</code>)에서 가져옵니다.
      </p>

      {/* ---------- 관리자 계정 ---------- */}
      <SectionCard
        title="관리자 계정"
        action={
          <button
            onClick={() => setShowGrant(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#3182F6] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[#1B64DA] transition-colors"
          >
            권한 부여
          </button>
        }
      >
        {loadError && (
          <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {loadError}
          </div>
        )}
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-[#8B95A1]">불러오는 중…</div>
        ) : admins.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[14px] text-[#4E5968] font-medium">관리자 권한을 가진 회원이 없어요.</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">우측 상단의 "권한 부여" 버튼으로 추가할 수 있어요.</p>
          </div>
        ) : (
          <div>
            {admins.map((a, i) => (
              <div
                key={a.id}
                className="grid grid-cols-[1.2fr_1.4fr_1fr_1.2fr_auto] items-center gap-4 px-5 py-[14px]"
                style={{ borderBottom: i === admins.length - 1 ? 'none' : '1px solid #F2F4F6' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3182F6, #90C2FF)' }}
                  >
                    {(a.name || a.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[14px] font-semibold text-[#191F28] truncate">{a.name || '(미입력)'}</span>
                </div>
                <span className="text-[13px] text-[#4E5968] truncate">{a.email}</span>
                <span className="text-[13px] text-[#8B95A1]">{a.phone || '-'}</span>
                <span className="text-[13px] text-[#8B95A1]">{formatDate(a.last_sign_in_at)}</span>
                <PillButton tone="red" onClick={() => handleRevoke(a)}>해제</PillButton>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ---------- 수수료 / 정산 정책 ---------- */}
      <SectionCard
        title="수수료 · 정산 정책"
        action={
          <button
            onClick={savePolicy}
            disabled={policyBusy}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#3182F6] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-50"
          >
            {policyBusy ? '저장 중...' : policySaved ? '저장됨' : '저장'}
          </button>
        }
      >
        {policyMigrationRequired && (
          <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
            <p className="font-semibold flex items-center gap-1.5 mb-1"><AlertCircle size={12} /> 정책 테이블이 없습니다.</p>
            <p>Supabase SQL Editor에서 <code className="px-1 py-0.5 bg-amber-100 rounded">supabase/migrations/0013_platform_settings.sql</code>을 실행한 후 저장하세요.</p>
          </div>
        )}
        <FieldRow label="기본 수수료율">
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.1" min={0} max={100}
              value={feePolicy.base_fee_percent}
              onChange={(e) => setFeePolicy({ ...feePolicy, base_fee_percent: Number(e.target.value) || 0 })}
              className={inputCls}
            />
            <span className="text-[13px] text-[#8B95A1]">%</span>
          </div>
        </FieldRow>
        <FieldRow label="프리미엄 수수료율">
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.1" min={0} max={100}
              value={feePolicy.premium_fee_percent}
              onChange={(e) => setFeePolicy({ ...feePolicy, premium_fee_percent: Number(e.target.value) || 0 })}
              className={inputCls}
            />
            <span className="text-[13px] text-[#8B95A1]">%</span>
          </div>
        </FieldRow>
        <FieldRow label="정산 주기">
          <Dropdown
            title="정산 주기 선택"
            value={feePolicy.settlement_cycle}
            onChange={(v) => setFeePolicy({ ...feePolicy, settlement_cycle: v })}
            options={Object.entries(cycleLabel).map(([value, label]) => ({ value, label }))}
            width={200}
          />
        </FieldRow>
        <FieldRow label="최소 정산 금액" last>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} step={10000}
              value={feePolicy.minimum_payout}
              onChange={(e) => setFeePolicy({ ...feePolicy, minimum_payout: Number(e.target.value) || 0 })}
              className={inputCls}
            />
            <span className="text-[13px] text-[#8B95A1]">원</span>
          </div>
        </FieldRow>
      </SectionCard>
      <p className="text-[12px] text-[#8B95A1] -mt-4 px-1">
        결제 시 수수료 계산과 정산 배치 작업에 이 값이 사용됩니다.
      </p>

      {/* ---------- 기타 안내 ---------- */}
      <SectionCard title="기타 설정">
        <InfoRow
          label="서비스 카테고리"
          value="카테고리 활성/비활성을 직접 관리합니다."
          action={<a href="/admin/categories"><PillButton tone="blue">바로 가기</PillButton></a>}
        />
        <InfoRow
          label="약관 편집"
          value="개인정보처리방침, 이용약관 등을 편집합니다."
          action={<a href="/admin/terms"><PillButton tone="blue">바로 가기</PillButton></a>}
          last
        />
      </SectionCard>

      {/* ---------- 권한 부여 모달 ---------- */}
      {showGrant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowGrant(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold text-[#191F28]">관리자 권한 부여</h3>
              <button onClick={() => setShowGrant(false)} className="p-1 -m-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-[#8B95A1]" />
              </button>
            </div>
            <p className="text-[13px] text-[#4E5968] mb-4 leading-relaxed">
              관리자로 지정할 회원의 <strong>UUID</strong>를 입력하세요.<br />
              (회원 관리 페이지에서 확인 가능)
            </p>
            <input
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              placeholder="예) 8614da07-0cd9-442e-..."
              className={`${inputCls} font-mono`}
              autoFocus
            />
            {grantError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {grantError}
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowGrant(false)}
                disabled={grantBusy}
                className="flex-1 h-11 border border-[#E5E8EB] rounded-[10px] text-[14px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleGrant}
                disabled={grantBusy}
                className="flex-1 h-11 bg-[#3182F6] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#1B64DA] disabled:opacity-50"
              >
                {grantBusy ? '처리 중...' : '권한 부여'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
