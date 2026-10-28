import CommunityDetail from '@/components/community/CommunityDetail';

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityDetail postId={id} />;
}
