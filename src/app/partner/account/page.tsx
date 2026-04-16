'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';

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
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">계정 정보</h1>
        <p className="text-[12px] text-gray-500 mt-1">파트너 계정과 병원 연결 정보를 관리합니다.</p>
      </div>

      {/* User profile */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-[14px] font-bold text-gray-900">담당자 정보</h2>
        <Field label="이메일">
          <p className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600">{authUser.email ?? '-'}</p>
        </Field>
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <Field label="휴대폰">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#7C3AED]"
          />
        </Field>
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-lg disabled:opacity-50"
        >
          {saving ? '저장 중…' : '담당자 정보 저장'}
        </button>
      </section>

      {/* Hospital connection */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-[14px] font-bold text-gray-900">연결된 병원</h2>
        {hospital ? (
          <div>
            <p className="text-[15px] font-bold text-gray-900">{hospital.name}</p>
            <p className="text-[12px] text-gray-500 mt-1">상태: {hospital.status}</p>
            <Link
              href="/partner/hospital-info"
              className="inline-block mt-3 text-[12px] text-[#7C3AED] font-bold"
            >
              병원 정보 편집 →
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-[12px] text-gray-500 mb-3">아직 등록된 병원이 없습니다.</p>
            <Link
              href="/hospital/register"
              className="inline-block px-4 py-2 bg-[#7C3AED] text-white text-[12px] font-bold rounded-lg"
            >
              병원 등록 신청
            </Link>
          </div>
        )}
      </section>

      {/* Logout */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-[14px] font-bold text-gray-900 mb-3">계정 관리</h2>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = '/';
          }}
          className="w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50"
        >
          로그아웃
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
