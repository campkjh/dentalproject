import { redirect } from 'next/navigation';

export default async function CommunitySearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(`/community?q=${encodeURIComponent(q || '')}`);
}
