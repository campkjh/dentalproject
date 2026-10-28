'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ShieldCheck, Users, ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { useStore } from '@/store';
import { Dropdown } from '@/components/admin/Dropdown';
import { PageHeader, SectionCard, PillButton, EmptyState, LoadingRows, AdminModal } from '@/components/admin/ui';

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

// ---- 설정 줄(라벨·값·동작) — 어드민 2.0 표 줄 결 ----
function InfoRow({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-4 adm-grow">
      <span className="adm-cell dim">{label}</span>
      <span className="adm-cell-main truncate">{value}</span>
      <span>{action}</span>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4 adm-grow">
      <span className="adm-label !mb-0">{label}</span>
      <div className="max-w-[420px]">{children}</div>
    </div>
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

  return (
    <div className="adm-stack max-w-[920px]">
      <PageHeader
        right={
          <button type="button" className="adm-btn primary" onClick={() => setShowGrant(true)}>
            <ShieldCheck size={16} /> 관리자 권한 부여
          </button>
        }
      />

      {/* ---------- 기본 정보 ---------- */}
      <SectionCard title="기본 정보" sub="Vercel 환경 변수(NEXT_PUBLIC_COMPANY_*)에서 가져와요">
        <InfoRow label="서비스명" value={siteConfig.copyrightName} />
        <InfoRow label="상호" value={siteConfig.companyName} />
        <InfoRow label="대표자" value={siteConfig.representative} />
        <InfoRow label="사업자등록번호" value={siteConfig.businessNumber} />
        <InfoRow label="통신판매업신고" value={siteConfig.mailOrderNumber} />
        <InfoRow label="주소" value={siteConfig.address} />
        <InfoRow label="고객센터" value={siteConfig.phone} />
        <InfoRow label="이메일" value={siteConfig.email} />
      </SectionCard>

      {/* ---------- 관리자 계정 ---------- */}
      <SectionCard
        title="관리자 계정"
        sub={loading ? undefined : `${admins.length}명`}
      >
        {loadError && (
          <p className="adm-note red mx-6 mb-4 flex items-center gap-2">
            <AlertCircle size={16} /> {loadError}
          </p>
        )}
        {loading ? (
          <LoadingRows rows={3} />
        ) : admins.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="관리자 권한을 가진 회원이 없어요" hint="오른쪽 위 '관리자 권한 부여'로 추가할 수 있어요." />
        ) : (
          <div className="adm-tscroll">
            <div className="adm-tscroll-in">
              <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1.2fr_auto] items-center gap-4 adm-ghead">
                <div>이름</div>
                <div>이메일</div>
                <div>연락처</div>
                <div>마지막 로그인</div>
                <div className="text-right">관리</div>
              </div>
              {admins.map((a) => (
                <div key={a.id} className="grid grid-cols-[1.2fr_1.4fr_1fr_1.2fr_auto] items-center gap-4 adm-grow">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="adm-avatar">{(a.name || a.email || '?').charAt(0).toUpperCase()}</span>
                    <span className="adm-cell-main truncate">{a.name || '(미입력)'}</span>
                  </div>
                  <span className="adm-cell">{a.email}</span>
                  <span className="adm-cell dim">{a.phone || '-'}</span>
                  <span className="adm-cell dim">{formatDate(a.last_sign_in_at)}</span>
                  <div className="adm-actions">
                    <PillButton tone="red" onClick={() => handleRevoke(a)}>해제</PillButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ---------- 수수료 / 정산 정책 ---------- */}
      <SectionCard
        title="수수료 · 정산 정책"
        sub="결제 시 수수료 계산과 정산 배치 작업에 이 값이 사용돼요"
        action={
          <button type="button" className="adm-btn sm primary" onClick={savePolicy} disabled={policyBusy}>
            {policyBusy ? '저장 중…' : policySaved ? '저장됨' : '저장'}
          </button>
        }
      >
        {policyMigrationRequired && (
          <div className="adm-note mx-6 mb-4">
            <p className="flex items-center gap-1.5"><AlertCircle size={14} /> 정책 테이블이 없어요.</p>
            <p className="font-medium">Supabase SQL Editor에서 <code className="adm-mono">supabase/migrations/0013_platform_settings.sql</code>을 실행한 뒤 저장하세요.</p>
          </div>
        )}
        <FieldRow label="기본 수수료율">
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.1" min={0} max={100}
              value={feePolicy.base_fee_percent}
              onChange={(e) => setFeePolicy({ ...feePolicy, base_fee_percent: Number(e.target.value) || 0 })}
              className="adm-input"
            />
            <span className="adm-cell dim">%</span>
          </div>
        </FieldRow>
        <FieldRow label="프리미엄 수수료율">
          <div className="flex items-center gap-2">
            <input
              type="number" step="0.1" min={0} max={100}
              value={feePolicy.premium_fee_percent}
              onChange={(e) => setFeePolicy({ ...feePolicy, premium_fee_percent: Number(e.target.value) || 0 })}
              className="adm-input"
            />
            <span className="adm-cell dim">%</span>
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
        <FieldRow label="최소 정산 금액">
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} step={10000}
              value={feePolicy.minimum_payout}
              onChange={(e) => setFeePolicy({ ...feePolicy, minimum_payout: Number(e.target.value) || 0 })}
              className="adm-input"
            />
            <span className="adm-cell dim">원</span>
          </div>
        </FieldRow>
      </SectionCard>

      {/* ---------- 기타 안내 ---------- */}
      <SectionCard title="기타 설정">
        <InfoRow
          label="서비스 카테고리"
          value="카테고리 활성/비활성을 직접 관리해요."
          action={<a href="/admin/categories" className="adm-card-link">바로 가기 <ChevronRight size={16} /></a>}
        />
        <InfoRow
          label="약관 편집"
          value="개인정보처리방침, 이용약관 등을 편집해요."
          action={<a href="/admin/terms" className="adm-card-link">바로 가기 <ChevronRight size={16} /></a>}
        />
      </SectionCard>

      {/* ---------- 권한 부여 모달 ---------- */}
      {showGrant && (
        <AdminModal
          onClose={() => setShowGrant(false)}
          busy={grantBusy}
          icon={<span className="adm-modal-ic"><ShieldCheck size={22} /></span>}
          title="관리자 권한 부여"
          sub="회원 관리 페이지에서 회원 UUID를 확인할 수 있어요"
          actions={
            <>
              <button type="button" className="adm-btn" onClick={() => setShowGrant(false)} disabled={grantBusy}>취소</button>
              <button type="button" className="adm-btn primary" onClick={handleGrant} disabled={grantBusy}>
                {grantBusy ? '처리 중…' : '권한 부여'}
              </button>
            </>
          }
        >
          <label className="adm-label" htmlFor="grant-user-id">회원 UUID</label>
          <input
            id="grant-user-id"
            value={grantUserId}
            onChange={(e) => setGrantUserId(e.target.value)}
            placeholder="예) 8614da07-0cd9-442e-..."
            className="adm-input font-mono"
            autoFocus
          />
          {grantError && <p className="adm-note red mt-3">{grantError}</p>}
        </AdminModal>
      )}
    </div>
  );
}
