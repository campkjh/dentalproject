import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type DoctorRecord = {
  user_id: string;
  title: string | null;
  specialty: string | null;
  profile_image: string | null;
  hospitals: { name: string | null } | { name: string | null }[] | null;
};

type ProfileRecord = {
  id: string;
  name: string | null;
  is_doctor: boolean | null;
  profile_image: string | null;
};

type CommentRecord = {
  post_id: string;
  author_id: string;
  created_at: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { postIds } = (await req.json()) as { postIds?: string[] };
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ answerers: {} });
    }

    const admin = await createAdminClient();

    const { data: comments } = await admin
      .from('comments')
      .select('post_id, author_id, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true });

    const commentRows = (comments ?? []) as CommentRecord[];
    if (commentRows.length === 0) {
      return NextResponse.json({ answerers: {} });
    }

    const authorIds = Array.from(new Set(commentRows.map((row) => row.author_id).filter(Boolean)));
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, is_doctor, profile_image')
      .in('id', authorIds);

    const profileMap = new Map<string, ProfileRecord>();
    for (const row of (profiles ?? []) as ProfileRecord[]) {
      profileMap.set(row.id, row);
    }

    const doctorIds = Array.from(
      new Set(
        commentRows
          .map((row) => row.author_id)
          .filter((id) => profileMap.get(id)?.is_doctor),
      ),
    );

    const { data: doctors } = doctorIds.length > 0
      ? await admin
          .from('doctors')
          .select('user_id, title, specialty, profile_image, hospitals(name)')
          .in('user_id', doctorIds)
      : { data: [] };

    const doctorMap = new Map<string, DoctorRecord>();
    for (const row of (doctors ?? []) as DoctorRecord[]) {
      doctorMap.set(row.user_id, row);
    }

    const answerCounts = new Map<string, number>();
    for (const row of commentRows) {
      const isDoc = profileMap.get(row.author_id)?.is_doctor;
      if (!isDoc) continue;
      answerCounts.set(row.post_id, (answerCounts.get(row.post_id) ?? 0) + 1);
    }

    const answerers: Record<string, {
      id: string;
      name: string;
      profileImage?: string;
      title?: string;
      specialty?: string;
      hospitalName?: string;
      answerCount: number;
    }> = {};

    for (const row of commentRows) {
      if (answerers[row.post_id]) continue;
      const profile = profileMap.get(row.author_id);
      if (!profile?.is_doctor) continue;
      const doctor = doctorMap.get(row.author_id);
      const hospital = Array.isArray(doctor?.hospitals) ? doctor?.hospitals[0] : doctor?.hospitals;
      answerers[row.post_id] = {
        id: row.author_id,
        name: profile.name ?? '전문의',
        profileImage: doctor?.profile_image ?? profile.profile_image ?? undefined,
        title: doctor?.title ?? undefined,
        specialty: doctor?.specialty ?? undefined,
        hospitalName: hospital?.name ?? undefined,
        answerCount: answerCounts.get(row.post_id) ?? 1,
      };
    }

    return NextResponse.json({ answerers });
  } catch (err) {
    console.error('[popular-answerers] error', err);
    return NextResponse.json({ answerers: {} });
  }
}
