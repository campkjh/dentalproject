import { NextResponse, type NextRequest } from 'next/server';
import {
  buildScheduleChangeContent,
  formatScheduleDate,
  getScheduleHistoryForReservation,
} from '@/lib/db/reservation-history';
import { completePastConfirmedReservations } from '@/lib/db/reservation-status';
import { normalizeProductImageUrl } from '@/lib/images';
import { broadcastReservationChange } from '@/lib/realtime/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set(['pending', 'confirmed', 'completed', 'cancelled']);

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-/i.test(value);
}

function hasField(body: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function parseDateField(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function canManageHospital(admin: Awaited<ReturnType<typeof createAdminClient>>, userId: string, hospitalId: string) {
  const { data: ownedHospital } = await admin
    .from('hospitals')
    .select('id')
    .eq('id', hospitalId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (ownedHospital) return true;

  const { data: doctorMember } = await admin
    .from('doctors')
    .select('id')
    .eq('hospital_id', hospitalId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(doctorMember);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = await createAdminClient();
  const { data: reservation, error } = await admin
    .from('reservations')
    .select(`
      id, user_id, hospital_id, product_id, doctor_id, status, visit_at, reservation_at,
      cancel_at, cancel_reason, amount, customer_name, customer_phone, payment_type, payment_method,
      hospital:hospitals (id, name, address, location, owner_id),
      product:products (id, title, image_url, price),
      doctor:doctors (id, name, title),
      user:profiles!reservations_user_id_fkey (name, phone)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!reservation) return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });

  const row = reservation as {
    user_id: string;
    hospital_id: string;
  };
  const isPatientOwner = row.user_id === user.id;
  const isHospitalManager = await canManageHospital(admin, user.id, row.hospital_id);

  if (!isPatientOwner && !isHospitalManager) {
    return NextResponse.json({ error: '예약을 볼 권한이 없습니다.' }, { status: 403 });
  }

  const completed = await completePastConfirmedReservations(admin, { reservationId: id });
  const normalizedReservation = completed.length > 0
    ? { ...reservation, status: 'completed' }
    : reservation;
  let product = Array.isArray((normalizedReservation as any).product)
    ? (normalizedReservation as any).product[0] ?? null
    : (normalizedReservation as any).product ?? null;
  if (!product) {
    const { data: fallbackProduct } = await admin
      .from('products')
      .select('id, title, image_url, price')
      .eq('hospital_id', row.hospital_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    product = fallbackProduct;
  }

  const scheduleHistory = await getScheduleHistoryForReservation(admin, id);

  return NextResponse.json({
    reservation: {
      ...normalizedReservation,
      product: product
        ? {
            ...product,
            image_url: normalizeProductImageUrl(product.image_url) ?? null,
          }
        : null,
      schedule_history: scheduleHistory,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const admin = await createAdminClient();
  const { data: reservation, error: reservationError } = await admin
    .from('reservations')
    .select('id, user_id, hospital_id, status, reservation_at, visit_at')
    .eq('id', id)
    .maybeSingle();

  if (reservationError) {
    return NextResponse.json({ error: reservationError.message }, { status: 400 });
  }

  if (!reservation) {
    return NextResponse.json({ error: '예약을 찾을 수 없습니다.' }, { status: 404 });
  }

  const isPatientOwner = reservation.user_id === user.id;
  const isHospitalManager = await canManageHospital(admin, user.id, reservation.hospital_id);

  if (!isPatientOwner && !isHospitalManager) {
    return NextResponse.json({ error: '예약을 변경할 권한이 없습니다.' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  const nextStatus = typeof body.status === 'string' ? body.status : null;

  if (nextStatus) {
    if (!VALID_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: '지원하지 않는 예약 상태입니다.' }, { status: 400 });
    }

    if (!isHospitalManager && nextStatus !== 'cancelled') {
      return NextResponse.json({ error: '고객은 예약 취소만 요청할 수 있습니다.' }, { status: 403 });
    }

    patch.status = nextStatus;

    if (nextStatus === 'cancelled') {
      patch.cancel_at = new Date().toISOString();
      patch.cancel_reason =
        typeof body.cancelReason === 'string' && body.cancelReason.trim()
          ? body.cancelReason.trim()
          : isPatientOwner
            ? '고객이 예약을 취소했습니다.'
            : '병원 사정으로 취소되었습니다.';
    } else {
      patch.cancel_at = null;
      patch.cancel_reason = null;
    }
  } else if (typeof body.cancelReason === 'string' && body.cancelReason.trim()) {
    patch.cancel_reason = body.cancelReason.trim();
  }

  if (hasField(body, 'doctorId')) {
    if (!isHospitalManager) {
      return NextResponse.json({ error: '담당의 지정 권한이 없습니다.' }, { status: 403 });
    }

    const doctorId = isUuid(body.doctorId) ? body.doctorId : null;

    if (doctorId) {
      const { data: doctor, error: doctorError } = await admin
        .from('doctors')
        .select('id, hospital_id')
        .eq('id', doctorId)
        .maybeSingle();

      if (doctorError) return NextResponse.json({ error: doctorError.message }, { status: 400 });
      if (!doctor || doctor.hospital_id !== reservation.hospital_id) {
        return NextResponse.json({ error: '해당 병원의 담당의만 지정할 수 있습니다.' }, { status: 400 });
      }
    }

    patch.doctor_id = doctorId;
  }

  if (hasField(body, 'reservationAt')) {
    if (!isHospitalManager) {
      return NextResponse.json({ error: '예약일시 변경 권한이 없습니다.' }, { status: 403 });
    }

    const nextReservationAt = parseDateField(body.reservationAt);
    if (!nextReservationAt) {
      return NextResponse.json({ error: '예약일시 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    patch.reservation_at = nextReservationAt;
  }

  if (hasField(body, 'visitAt')) {
    if (!isHospitalManager) {
      return NextResponse.json({ error: '방문일시 변경 권한이 없습니다.' }, { status: 403 });
    }

    const nextVisitAt = parseDateField(body.visitAt);
    if (!nextVisitAt) {
      return NextResponse.json({ error: '방문일시 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    patch.visit_at = nextVisitAt;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const scheduleChanged = Boolean(
    (patch.reservation_at && patch.reservation_at !== reservation.reservation_at) ||
      (patch.visit_at && patch.visit_at !== reservation.visit_at)
  );
  const previousSchedule = reservation.reservation_at ?? reservation.visit_at;
  const nextSchedule = (patch.reservation_at as string | undefined)
    ?? (patch.visit_at as string | undefined)
    ?? previousSchedule;

  patch.updated_at = new Date().toISOString();

  const { error } = await admin.from('reservations').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: hospitalRow } = await admin
    .from('hospitals')
    .select('owner_id, name')
    .eq('id', reservation.hospital_id)
    .maybeSingle();

  if (nextStatus) {
    if (reservation.user_id) {
      const hospitalName = hospitalRow?.name ?? '병원';
      const titleMap: Record<string, string> = {
        confirmed: '예약이 확정되었습니다',
        cancelled: '예약이 취소되었습니다',
        completed: '시술이 완료되었습니다',
        pending: '예약이 검토 중입니다',
      };
      const typeMap: Record<string, string> = {
        confirmed: 'important',
        cancelled: 'important',
        completed: 'info',
        pending: 'info',
      };
      await admin.from('notifications').insert({
        user_id: reservation.user_id,
        type: typeMap[nextStatus] ?? 'info',
        title: titleMap[nextStatus] ?? '예약 상태가 변경되었습니다',
        content: `${hospitalName}의 예약 상태가 변경되었습니다.${patch.cancel_reason ? '\n\n사유: ' + patch.cancel_reason : ''}`,
        link: `/reservations/${id}`,
      });
    }

    if (nextStatus === 'cancelled' && isPatientOwner && hospitalRow?.owner_id && hospitalRow.owner_id !== user.id) {
      await admin.from('notifications').insert({
        user_id: hospitalRow.owner_id,
        type: 'important',
        title: '예약이 취소되었습니다',
        content: `${hospitalRow.name ?? '병원'} 예약이 고객 요청으로 취소되었습니다.`,
        link: `/partner/reservations/${id}`,
      });
    }
  } else if (scheduleChanged && nextSchedule) {
    const hospitalName = hospitalRow?.name ?? '병원';
    const content = buildScheduleChangeContent(hospitalName, previousSchedule, nextSchedule);

    if (reservation.user_id) {
      await admin.from('notifications').insert({
        user_id: reservation.user_id,
        type: 'important',
        title: '예약 스케줄이 변경되었습니다',
        content,
        link: `/reservations/${id}`,
      });
    }

    if (hospitalRow?.owner_id && hospitalRow.owner_id !== user.id) {
      await admin.from('notifications').insert({
        user_id: hospitalRow.owner_id,
        type: 'info',
        title: '예약 스케줄 변경내역',
        content: `${formatScheduleDate(nextSchedule)} 예약으로 변경 처리되었습니다.`,
        link: `/partner/reservations/${id}`,
      });
    }
  }

  await broadcastReservationChange({
    event: 'UPDATE',
    reservationId: id,
    hospitalId: reservation.hospital_id,
    userId: reservation.user_id,
  });

  const scheduleHistory = scheduleChanged
    ? await getScheduleHistoryForReservation(admin, id)
    : undefined;

  return NextResponse.json({ ok: true, scheduleHistory });
}
