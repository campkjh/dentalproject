'use client';

import { useEffect, useState } from 'react';

export type HospitalApplication = {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  kind?: 'hospital' | 'doctor';
  hospitalName?: string;
};

/** 내 병원(원장) 신청 상태 — 로그인한 사람만 묻는다. 모르는 동안은 null */
export function useHospitalApplication(userId?: string | null) {
  const [state, setState] = useState<HospitalApplication | null>(null);
  useEffect(() => {
    if (!userId) { setState(null); return; }
    let alive = true;
    fetch('/api/hospital-applications', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: HospitalApplication | null) => { if (alive) setState(j ?? { status: 'none' }); })
      .catch(() => { if (alive) setState({ status: 'none' }); });
    return () => { alive = false; };
  }, [userId]);
  return state;
}
