'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, User, Calendar, Phone, CreditCard, Stethoscope, FileText } from 'lucide-react';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';

type ReservationDetail = {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  visit_at: string | null;
  reservation_at: string | null;
  amount: number;
  customer_name: string | null;
  customer_phone: string | null;
  payment_type: string | null;
  payment_method: string | null;
  memo: string | null;
  cancel_reason: string | null;
  user: { name: string | null; phone: string | null } | null;
  product: { title: string | null; price: number | null } | null;
  doctor: { name: string | null; title: string | null } | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '접수대기', color: '#F59E0B' },
  confirmed: { label: '예약확정', color: '#3182F6' },
  completed: { label: '진료완료', color: '#10B981' },
  cancelled: { label: '취소됨', color: '#9CA3AF' },
};

function fmt(v: string | null) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function money(v: number | null) {
  if (!v) return '-';
  return v.toLocaleString('ko-KR') + '원';
}

export default function PartnerReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [res, setRes] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) { setLoading(false); return; }
    const sb = createClient();
    sb.from('reservations')
      .select(`*, user:profiles!reservations_user_id_fkey (name, phone), product:products (title, price), doctor:doctors (name, title)`)
      .eq('id', id)
      .single()
      .then(({ data }) => { setRes(data as any); setLoading(false); });
  }, [id]);

  const updateStatus = async (status: 'confirmed' | 'cancelled') => {
    setUpdating(true);
    await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setRes((prev) => prev ? { ...prev, status } : prev);
    setUpdating(false);
  };

  const st = STATUS_LABEL[res?.status ?? 'pending'];

  return (
    <div className="min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#2B313D" />
        </button>
        <h1 className="text-base font-bold text-gray-900 flex-1">예약 상세</h1>
        {res && (
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: st.color, backgroundColor: st.color + '15' }}>
            {st.label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-sm text-gray-400">불러오는 중...</div>
      ) : !res ? (
        <div className="flex justify-center py-20 text-sm text-gray-400">예약 정보를 찾을 수 없습니다.</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* 환자 정보 */}
          <section className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">환자 정보</p>
            <div className="flex items-center gap-3">
              <User size={16} color="#6B7280" />
              <span className="text-sm text-gray-900">{res.user?.name ?? res.customer_name ?? '-'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} color="#6B7280" />
              <span className="text-sm text-gray-900">{res.user?.phone ?? res.customer_phone ?? '-'}</span>
            </div>
          </section>

          {/* 예약 정보 */}
          <section className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">예약 정보</p>
            <div className="flex items-center gap-3">
              <Stethoscope size={16} color="#6B7280" />
              <span className="text-sm text-gray-900">{res.product?.title ?? '-'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} color="#6B7280" />
              <span className="text-sm text-gray-900">{fmt(res.visit_at)}</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard size={16} color="#6B7280" />
              <span className="text-sm text-gray-900">{money(res.amount)} · {res.payment_method ?? res.payment_type ?? '후불'}</span>
            </div>
            {res.doctor && (
              <div className="flex items-center gap-3">
                <User size={16} color="#6B7280" />
                <span className="text-sm text-gray-900">담당: {res.doctor.name} {res.doctor.title ?? ''}</span>
              </div>
            )}
          </section>

          {/* 메모 */}
          {res.memo && (
            <section className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">메모</p>
              <div className="flex gap-3">
                <FileText size={16} color="#6B7280" className="flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{res.memo}</p>
              </div>
            </section>
          )}

          {/* 취소 사유 */}
          {res.cancel_reason && (
            <section className="bg-red-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-red-400 mb-2">취소 사유</p>
              <p className="text-sm text-red-700">{res.cancel_reason}</p>
            </section>
          )}

          {/* 액션 버튼 */}
          {res.status === 'pending' && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => updateStatus('confirmed')}
                disabled={updating}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#3182F6' }}
              >
                예약 확정
              </button>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200"
              >
                예약 취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
