'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/lib/supabase/SessionProvider';

/* ─────────────────────────────────────────────────────────────
 * 어드민 입구(261101) — 로그인 안 했으면 로그인 판, 관리자가 아니면 '권한 없음' 판.
 *  · 예전엔 껍데기가 그대로 열리고 화면마다 '로그인이 필요합니다'만 떴다.
 *  · 로그인은 앱 /login 과 같은 signInWithEmail — 성공하면 껍데기가 is_admin 을 보고 바로 바뀐다.
 *  · 로그인 중엔 세션 loading 이 켜져도 이 판을 내리지 않는다(내리면 입력·오류가 날아간다).
 *  · 아이디 로그인 — Supabase 는 이메일만 받아서 '@' 없는 아이디(mydocadmin)는 ADMIN_ID_DOMAIN 을 붙여 이메일로 본다.
 *    scripts/create-admin.mjs 도 같은 규칙이다(바꾸면 둘 다).
 * ──────────────────────────────────────────────────────────── */

const ADMIN_ID_DOMAIN = 'my-doc.co.kr';

function loginEmail(idOrEmail: string) {
  const v = idOrEmail.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${ADMIN_ID_DOMAIN}`;
}

const ERRORS: Record<string, string> = {
  'Invalid login credentials': '아이디 또는 비밀번호가 맞지 않아요.',
  'Email not confirmed': '이메일 인증이 아직 안 된 계정이에요.',
  'Supabase not configured': '서버 설정이 끝나지 않았어요. 잠시 뒤 다시 시도해 주세요.',
};

function translate(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) return '시도가 너무 많았어요. 1분 뒤 다시 해 주세요.';
  return ERRORS[msg] ?? msg;
}

function Brand() {
  return (
    <div className="adm-gate-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/brand-logo-mark.png" alt="" className="adm-gate-logo" />
      <span className="adm-brand-name">마이닥</span>
      <span className="adm-brand-tag">관리자</span>
    </div>
  );
}

export function AdminGateLoading() {
  return (
    <div className="admin-shell adm-gate">
      <div className="adm-spinner" aria-label="불러오는 중" />
    </div>
  );
}

export function AdminLogin({ booting }: { booting: boolean }) {
  const { signInWithEmail } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  // 첫 세션 확인 중(로그인 버튼을 누른 게 아닐 때)엔 판 대신 빙글이
  if (booting && !pending) return <AdminGateLoading />;

  const canSubmit = email.trim().length >= 2 && password.length > 0 && !pending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError('');
    const { error: err, isAdmin } = await signInWithEmail(loginEmail(email), password);
    setPending(false);
    if (err) setError(translate(err));
    else if (!isAdmin) setError('관리자 권한이 없는 계정이에요.');
  };

  return (
    <div className="admin-shell adm-gate">
      <form className="adm-gate-card" onSubmit={submit} noValidate>
        <Brand />
        <h1 className="adm-gate-title">관리자 로그인</h1>
        <p className="adm-gate-desc">관리자 아이디와 비밀번호를 넣어 주세요</p>

        <div className="adm-gate-fields">
          <input
            className="adm-gate-input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="아이디 또는 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <div className="adm-gate-pw">
            <input
              className="adm-gate-input"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="adm-gate-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              <span
                className="adm-gate-eye-ic"
                style={{
                  WebkitMaskImage: `url(/icons/mono/${showPw ? 'eye-on' : 'eye-off'}.svg)`,
                  maskImage: `url(/icons/mono/${showPw ? 'eye-on' : 'eye-off'}.svg)`,
                }}
              />
            </button>
          </div>
        </div>

        {error && <p className="adm-gate-error" role="alert">{error}</p>}

        <button type="submit" className="adm-btn primary lg adm-gate-submit" disabled={!canSubmit}>
          {pending ? <span className="adm-gate-dots" aria-label="로그인 중"><i /><i /><i /></span> : '로그인'}
        </button>
        <Link href="/" className="adm-gate-home">서비스 홈으로</Link>
      </form>
    </div>
  );
}

export function AdminDenied({ email, onLogout }: { email?: string; onLogout: () => void }) {
  return (
    <div className="admin-shell adm-gate">
      <div className="adm-gate-card">
        <Brand />
        <h1 className="adm-gate-title">관리자 권한이 없어요</h1>
        <p className="adm-gate-desc">
          {email ? <><b>{email}</b> 계정은 관리자가 아니에요.<br /></> : null}
          관리자 계정으로 다시 로그인해 주세요.
        </p>
        <button type="button" className="adm-btn primary lg adm-gate-submit" onClick={onLogout}>
          다른 계정으로 로그인
        </button>
        <Link href="/" className="adm-gate-home">서비스 홈으로</Link>
      </div>
    </div>
  );
}
