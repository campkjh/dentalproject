// 의사 ↔ 고객 화면 오가기 — 정해 둔 계정만(이메일이 아니라 id 로).
//  · campkjh@nate.com(김정훈, 카카오) = 서울대내과 주인으로 연결(261029, 원래 주인 '테스트4' 테스트 계정).
//  · 고른 화면은 이 기기에 기억한다. 고객 화면이면 병원 주인이어도 isDoctor 를 끈다(홈이 /partner 로 보내지 않게).
'use client';

import { DUAL_MODE_USER_IDS } from './dual-mode-ids';

export { DUAL_MODE_USER_IDS };

export type AccountMode = 'doctor' | 'customer';
const KEY = 'md-account-mode';

export function isDualModeUser(userId?: string | null): boolean {
  return Boolean(userId && DUAL_MODE_USER_IDS.includes(userId));
}

export function readAccountMode(): AccountMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'doctor' || v === 'customer' ? v : null;
  } catch {
    return null;
  }
}

export function writeAccountMode(mode: AccountMode) {
  try { localStorage.setItem(KEY, mode); } catch { /* 저장소 막힘 — 이번 화면에서만 */ }
}
