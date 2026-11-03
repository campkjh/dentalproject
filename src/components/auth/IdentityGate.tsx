'use client';

/**
 * 본인인증 문 — 로그인한 고객이 아직 본인인증(만 19세 이상)을 하지 않았으면 /verify-identity 로 보낸다.
 * 카카오·애플·이메일 어떤 방식으로 가입해도 여기를 거친다. 의사·병원·관리자는 서버가 제외한다.
 * 서버 설정(IDENTITY_VERIFICATION_REQUIRED + 포트원 키)이 없으면 아무것도 하지 않는다.
 */
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store';

// 인증 전에도 열 수 있어야 하는 화면
const OPEN_PATHS = ['/verify-identity', '/login', '/terms', '/withdraw', '/partner', '/admin', '/hospital/register', '/payment/fail'];

export default function IdentityGate() {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isDoctor = useStore((s) => s.isDoctor);
  const isAdmin = useStore((s) => s.isAdmin);
  const verifiedRef = useRef<string | null>(null); // 이미 확인된 사용자는 다시 묻지 않는다

  useEffect(() => {
    if (!isLoggedIn) { verifiedRef.current = null; return; }
    if (isDoctor || isAdmin) return;
    if (OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (verifiedRef.current === 'ok') return;

    let cancelled = false;
    fetch('/api/identity/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((s: { required?: boolean; verified?: boolean } | null) => {
        if (cancelled || !s) return;
        if (!s.required || s.verified) { verifiedRef.current = 'ok'; return; }
        const next = `${pathname}${window.location.search}`;
        router.replace(`/verify-identity?next=${encodeURIComponent(next)}`);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isLoggedIn, isDoctor, isAdmin, pathname, router]);

  return null;
}
