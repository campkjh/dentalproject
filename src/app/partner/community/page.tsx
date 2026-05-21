'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 병원앱 커뮤니티는 고객 커뮤니티와 동일한 화면을 사용
// isDoctor 상태에 따라 3개 탭(질문/자유/과별) 자동 노출
export default function PartnerCommunityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/community');
  }, [router]);

  return null;
}
