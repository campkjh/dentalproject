'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, UserRound } from 'lucide-react';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import {
  PartnerButton,
  PartnerField,
  PartnerInput,
  PartnerListRow,
  PartnerPanel,
  PartnerTop,
} from '@/components/partner/tds';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PartnerAccountPage() {
  const { authUser, signOut } = useSession();
  const showToast = useStore((s) => s.showToast);
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const [hospital, setHospital] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/my-hospital', { cache: 'no-store' });
      if (!res.ok) return;
      const { hospital } = await res.json();
      if (cancelled) return;
      setHospital(hospital);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      updateUser({ name, phone });
      showToast('계정 정보가 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PartnerTop
        eyebrow="계정"
        title="계정 정보"
        description="파트너 계정과 병원 연결 정보를 관리합니다."
        icon={<UserRound size={28} />}
      />

      <PartnerPanel className="p-5 space-y-4">
        <h2>담당자 정보</h2>
        <PartnerField label="이메일">
          <p className="partner-input flex items-center text-[rgba(3,18,40,0.7)]">{authUser.email ?? '-'}</p>
        </PartnerField>
        <PartnerField label="이름">
          <PartnerInput
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </PartnerField>
        <PartnerField label="휴대폰">
          <PartnerInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </PartnerField>
        <PartnerButton
          type="button"
          onClick={save}
          disabled={saving}
          size="xl"
          className="w-full"
        >
          {saving ? '저장 중…' : '담당자 정보 저장'}
        </PartnerButton>
      </PartnerPanel>

      <PartnerPanel className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(0,27,55,0.06)]">
          <h2>연결된 병원</h2>
        </div>
        {hospital ? (
          <PartnerListRow
            href="/partner/hospital-info"
            icon={<Building2 size={16} />}
            title={hospital.name}
            description={`상태: ${hospital.status}`}
          />
        ) : (
          <div className="p-5">
            <p className="text-[13px] text-[rgba(0,19,43,0.58)] mb-3">아직 등록된 병원이 없습니다.</p>
            <PartnerButton href="/hospital/register" size="m">
              병원 등록 신청
            </PartnerButton>
          </div>
        )}
      </PartnerPanel>

      <PartnerPanel className="p-5">
        <h2 className="mb-3">계정 관리</h2>
        <PartnerButton
          type="button"
          variant="weak"
          tone="neutral"
          onClick={async () => {
            await signOut();
            // replace로 history 없이 고객 홈으로 이동 (layout 리다이렉트보다 먼저)
            window.location.replace('/');
          }}
          className="w-full"
        >
          로그아웃
        </PartnerButton>
      </PartnerPanel>
    </div>
  );
}
