import { Suspense } from 'react';
import CommunityFeed from '@/components/community/CommunityFeed';
import { CommunitySkeleton } from '@/components/community/CommunityDetail';

export default function PartnerCommunityPage() {
  return <Suspense fallback={<CommunitySkeleton />}><CommunityFeed partner /></Suspense>;
}
