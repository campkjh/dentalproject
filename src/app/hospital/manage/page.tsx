import { redirect } from 'next/navigation';

export default async function LegacyHospitalManagePage({ searchParams }: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab === 'reviews' || tab === 'review' || tab === '리뷰') redirect('/partner/reviews');
  if (tab === 'doctors' || tab === 'doctor' || tab === '원장') redirect('/partner/doctors');
  redirect('/partner/hospital-info');
}
