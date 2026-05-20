'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/supabase/SessionProvider';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { EyeOff, Eye, Plus, Image, FileText, Star } from 'lucide-react';

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

type ReviewTab = 'image' | 'text';

const MAX_INITIAL_IMAGE = 10;
const MAX_INITIAL_TEXT = 20;

export default function PartnerReviewsPage() {
  const { authUser } = useSession();
  const showToast = useStore((s) => s.showToast);
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [doctorCount, setDoctorCount] = useState(0);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalCreatedAt, setHospitalCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReviewTab>('image');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ type: 'image' as 'image' | 'text', content: '', rating: 5, treatmentName: '', beforeImage: '', afterImage: '' });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    if (!authUser) { setLoading(false); return; }
    const res = await fetch('/api/my-hospital', { cache: 'no-store' });
    if (!res.ok) { setLoading(false); return; }
    const { hospital, reviews } = await res.json();
    setHospitalId(hospital?.id ?? null);
    setHospitalCreatedAt(hospital?.created_at ?? null);
    setDoctorCount(hospital?.doctors?.length ?? 0);
    setItems(reviews ?? []);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [authUser]);

  const avgRating = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((s, r) => s + Number(r.rating), 0) / items.length;
  }, [items]);

  const imageReviews = items.filter((r) => r.before_image || r.after_image);
  const textReviews = items.filter((r) => !r.before_image && !r.after_image);
  const displayList = (tab === 'image' ? imageReviews : textReviews).filter((r) => !hiddenIds.has(r.id));

  // Check if hospital can add initial reviews (within 1 month of registration)
  const canAddInitial = useMemo(() => {
    if (!hospitalCreatedAt) return false;
    const created = new Date(hospitalCreatedAt);
    const diff = Date.now() - created.getTime();
    return diff < 30 * 24 * 60 * 60 * 1000;
  }, [hospitalCreatedAt]);

  const initialImageCount = imageReviews.length;
  const initialTextCount = textReviews.length;
  const canAddImage = canAddInitial && initialImageCount < MAX_INITIAL_IMAGE;
  const canAddText = canAddInitial && initialTextCount < MAX_INITIAL_TEXT;

  const toggleHide = async (id: string) => {
    if (hiddenIds.has(id)) {
      setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      showToast('리뷰를 다시 표시합니다.');
    } else {
      setHiddenIds((prev) => new Set([...prev, id]));
      showToast('리뷰를 숨겼습니다.');
    }
    // TODO: DB에 hidden 컬럼 추가 후 실제 저장
    // await sb.from('reviews').update({ hidden: !hiddenIds.has(id) }).eq('id', id);
  };

  const handleAddReview = async () => {
    if (!addForm.content.trim()) { showToast('리뷰 내용을 입력해주세요.'); return; }
    if (!hospitalId || !hasSupabaseEnv()) { showToast('병원 정보를 불러올 수 없습니다.'); return; }
    if (addForm.type === 'image' && !canAddImage) { showToast(`이미지 리뷰는 최대 ${MAX_INITIAL_IMAGE}개까지 등록할 수 있습니다.`); return; }
    if (addForm.type === 'text' && !canAddText) { showToast(`텍스트 리뷰는 최대 ${MAX_INITIAL_TEXT}개까지 등록할 수 있습니다.`); return; }

    setSaving(true);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');
      const { error } = await sb.from('reviews').insert({
        author_id: user.id,
        hospital_id: hospitalId,
        rating: addForm.rating,
        content: addForm.content,
        treatment_name: addForm.treatmentName || null,
        total_cost: 0,
        before_image: addForm.beforeImage || null,
        after_image: addForm.afterImage || null,
      });
      if (error) throw error;
      showToast('초기 리뷰가 등록되었습니다.');
      setShowAddModal(false);
      setAddForm({ type: 'image', content: '', rating: 5, treatmentName: '', beforeImage: '', afterImage: '' });
      await reload();
    } catch (e: any) {
      showToast(e?.message || '등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!authUser) return (
    <div className="bg-white rounded-xl p-10 text-center">
      <p className="text-sm text-gray-500 mb-4">로그인이 필요합니다.</p>
      <Link href="/partner/login" className="inline-block px-5 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">로그인</Link>
    </div>
  );

  return (
    <div className="partner-mobile-screen">
      <header className="partner-screen-title with-action">
        <h1>병원관리</h1>
        <nav className="partner-inline-segment" aria-label="병원관리 탭">
          <Link href="/partner/hospital-info">병원</Link>
          <Link href="/partner/doctors">{`멤버(${doctorCount})`}</Link>
          <Link href="/partner/reviews" className="is-active">{`리뷰(${items.length})`}</Link>
        </nav>
      </header>

      <section className="partner-review-content">
        {/* Score */}
        <div className="partner-review-score">
          <img src="/partner-template/review-star.svg" alt="" />
          <strong>{avgRating.toFixed(1)}</strong>
          <span>({items.length})</span>
        </div>

        {/* Review type tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
          {([
            { key: 'image', label: '이미지 리뷰', icon: <Image size={14} />, count: imageReviews.length },
            { key: 'text', label: '텍스트 리뷰', icon: <FileText size={14} />, count: textReviews.length },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                paddingBottom: 10, fontSize: 13, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? '2px solid #8037FF' : '2px solid transparent',
                color: tab === t.key ? '#8037FF' : '#9CA3AF',
              }}
            >
              {t.icon}{t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="partner-loading small">불러오는 중...</div>
        ) : displayList.length === 0 ? (
          <div className="partner-review-empty">
            <span><img src="/partner-template/review-empty.svg" alt="" /></span>
            <p>리뷰가 없습니다</p>
            {canAddInitial && (
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                가입 후 1개월 내 초기 리뷰 등록 가능
              </p>
            )}
          </div>
        ) : (
          <ul className="partner-review-list">
            {displayList.map((r) => (
              <li key={r.id} className="partner-review-card" style={{ opacity: hiddenIds.has(r.id) ? 0.4 : 1 }}>
                <div className="partner-review-card-head">
                  <div className="partner-review-author">
                    <div>{r.author?.name?.[0] ?? '?'}</div>
                    <div>
                      <strong>{r.author?.name ?? '익명'}</strong>
                      <p>{new Date(r.created_at).toLocaleDateString('ko-KR')}{r.doctor?.name ? ` · ${r.doctor.name} 원장` : ''}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600 }}>
                      <Star size={13} fill="#FBBF24" stroke="none" />{Number(r.rating).toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleHide(r.id)}
                      title={hiddenIds.has(r.id) ? '표시하기' : '숨기기'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
                    >
                      {hiddenIds.has(r.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>
                {r.treatment_name && (
                  <div className="partner-review-meta">
                    <span>시술: {r.treatment_name}</span>
                    {r.total_cost > 0 && <span> · {r.total_cost.toLocaleString()}원</span>}
                  </div>
                )}
                {(r.before_image || r.after_image) && (
                  <div className="partner-review-images">
                    {r.before_image && <img src={r.before_image} alt="Before" />}
                    {r.after_image && <img src={r.after_image} alt="After" />}
                  </div>
                )}
                <p>{r.content}</p>
              </li>
            ))}
          </ul>
        )}

        {/* 초기 리뷰 등록 버튼 */}
        {canAddInitial && (
          <div style={{ padding: '16px 0' }}>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px dashed #C8CEDA', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: '#8037FF', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} />
              초기 리뷰 등록 ({initialImageCount}/{MAX_INITIAL_IMAGE} 이미지 · {initialTextCount}/{MAX_INITIAL_TEXT} 텍스트)
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>가입 후 1개월 내에만 등록 가능합니다</p>
          </div>
        )}
      </section>

      {/* 초기 리뷰 등록 모달 */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px', paddingBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>초기 리뷰 등록</h2>

            {/* 리뷰 타입 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {([{ v: 'image', label: '이미지 리뷰' }, { v: 'text', label: '텍스트 리뷰' }] as const).map((t) => (
                <button key={t.v} type="button" onClick={() => setAddForm((f) => ({ ...f, type: t.v }))}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${addForm.type === t.v ? '#8037FF' : '#E5E7EB'}`, background: addForm.type === t.v ? '#F3EEFF' : 'white', color: addForm.type === t.v ? '#8037FF' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* 별점 */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" onClick={() => setAddForm((f) => ({ ...f, rating: s }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={24} fill={s <= addForm.rating ? '#FBBF24' : 'none'} stroke={s <= addForm.rating ? '#FBBF24' : '#D1D5DB'} />
                </button>
              ))}
            </div>

            <input value={addForm.treatmentName} onChange={(e) => setAddForm((f) => ({ ...f, treatmentName: e.target.value }))}
              placeholder="시술명 (선택)" style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }} />
            <textarea value={addForm.content} onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))}
              rows={4} placeholder="리뷰 내용을 입력하세요" style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'none', marginBottom: addForm.type === 'image' ? 10 : 16, boxSizing: 'border-box' }} />

            {addForm.type === 'image' && (
              <>
                <input value={addForm.beforeImage} onChange={(e) => setAddForm((f) => ({ ...f, beforeImage: e.target.value }))}
                  placeholder="Before 이미지 URL" style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
                <input value={addForm.afterImage} onChange={(e) => setAddForm((f) => ({ ...f, afterImage: e.target.value }))}
                  placeholder="After 이미지 URL" style={{ width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#6B7280' }}>
                취소
              </button>
              <button type="button" onClick={handleAddReview} disabled={saving} style={{ flex: 2, height: 48, borderRadius: 12, background: saving ? '#C4B5FD' : '#8037FF', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                {saving ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
