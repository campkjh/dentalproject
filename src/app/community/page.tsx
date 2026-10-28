import { Suspense } from 'react';
import CommunityFeed from '@/components/community/CommunityFeed';
import { CommunitySkeleton } from '@/components/community/CommunityDetail';

export default function CommunityPage() {
  return <Suspense fallback={<CommunitySkeleton />}><CommunityFeed /></Suspense>;
}
