'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReviewRow = {
  id: string;
  rating: number;
  content: string;
  treatment_name: string | null;
  treatment_date: string | null;
  total_cost: number;
  before_image: string | null;
  after_image: string | null;
  created_at: string;
  author?: { name?: string } | null;
  doctor?: { name?: string } | null;
};

export default function PartnerReviewsPage() {
  const { authUser } = useSession();
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [doctorCount, setDoctorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const { hospital, reviews } = await res.json();
        if (cancelled) return;
        setDoctorCount(hospital?.doctors?.length ?? 0);
        setItems(reviews ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((s, r) => s + Number(r.rating), 0) / items.length;
  }, [items]);

  if (!authUser) {
    return (
      <div className="bg-white rounded-xl p-10 text-center">
        <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href="/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <nav className="partner-inline-segment" aria-label="병원관리 탭">
          <Link href="/partner/hospital-info">병원</Link>
          <Link href="/partner/doctors">{`멤버(${doctorCount.toLocaleString()})`}</Link>
          <Link href="/partner/reviews" className="is-active">{`리뷰(${items.length.toLocaleString()})`}</Link>
        </nav>
      </header>

      <section className="partner-review-content">
        <div className="partner-review-score">
          <img src="/partner-template/review-star.svg" alt="" />
          <strong>{avgRating.toFixed(1)}</strong>
          <span>({items.length.toLocaleString()})</span>
        </div>

      {loading ? (
        <div className="partner-loading small">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="partner-review-empty">
          <span>
            <img src="/partner-template/review-empty.svg" alt="" />
          </span>
          <p>리뷰가 존재하지 않아요</p>
        </div>
      ) : (
        <ul className="partner-review-list">
          {items.map((r) => (
            <li key={r.id} className="partner-review-card">
              <div className="partner-review-card-head">
                <div className="partner-review-author">
                  <div>
                    {r.author?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <strong>{r.author?.name ?? '익명'}</strong>
                    <p>
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      {r.doctor?.name ? <> · {r.doctor.name} 원장</> : null}
                    </p>
                  </div>
                </div>
                <span>{Number(r.rating).toFixed(1)}</span>
              </div>

              {r.treatment_name && (
                <div className="partner-review-meta">
                  <span>시술: {r.treatment_name}</span>
                  {r.total_cost > 0 && (
                    <span>· {r.total_cost.toLocaleString()}원</span>
                  )}
                </div>
              )}

              {(r.before_image || r.after_image) && (
                <div className="partner-review-images">
                  {r.before_image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.before_image} alt="Before" />
                  )}
                  {r.after_image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={r.after_image} alt="After" />
                  )}
                </div>
              )}

              <p>{r.content}</p>
            </li>
          ))}
        </ul>
      )}
      </section>
    </div>
  );
}
