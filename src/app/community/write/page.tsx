'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CommunityComposer from '@/components/community/CommunityComposer';
import { CommunitySkeleton } from '@/components/community/CommunityDetail';
import styles from '@/components/community/community.module.css';

function WritePage() {
  const router = useRouter();
  const params = useSearchParams();
  const board = params.get('board');
  return <div className={styles.standaloneCompose}><CommunityComposer initialBoard={board === 'free' || board === 'dental' ? board : 'question'} onClose={() => router.push('/community')} onPosted={id => router.push(`/community/${id}`)} /></div>;
}

export default function CommunityWritePage() {
  return <Suspense fallback={<CommunitySkeleton />}><WritePage /></Suspense>;
}
