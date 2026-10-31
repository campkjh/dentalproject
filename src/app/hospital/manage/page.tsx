'use client';

// 병원관리 — 상품 상세(261031 쿠팡 견본) 톤: 세그먼트 탭 · 20 굵은 제목 · 회색 이름 정보 줄 · 회색 띠로 칸 나눔.
import { useState, useEffect } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import Avatar from '@/components/common/Avatar';
import LoginRequired from '@/components/common/LoginRequired';
import MonoIcon from '@/components/common/MonoIcon';
import { useStore } from '@/store';
import { useSession } from '@/lib/supabase/SessionProvider';
import { resolveHospitalImageUrl } from '@/lib/images';

/* eslint-disable @typescript-eslint/no-explicit-any */
type HospitalRow = {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  tags: string[];
  introduction: string | null;
  address: string | null;
  address_detail: string | null;
  holiday_notice: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  cover_images: string[];
  rating: number;
  review_count: number;
  status: string;
  doctors: any[];
  operating_hours: any[];
};

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
  author: { name: string; profile_image?: string | null } | null;
};

export default function HospitalManagePage() {
  const { authUser, loading: sessionLoading } = useSession();
  const { showModal, showToast } = useStore();
  const [activeTab, setActiveTab] = useState('병원');
  const [hospital, setHospital] = useState<HospitalRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/my-hospital', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setHospital(data.hospital ?? null);
        setReviews(data.reviews ?? []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-[15px] text-[#8B95A1]">불러오는 중…</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="mx-auto min-h-screen max-w-[500px] bg-white pt-14">
        <ManageHead />
        <LoginRequired />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="mx-auto min-h-screen max-w-[500px] bg-white pt-14">
        <ManageHead />
        <EmptyBlock icon="hospital" title="등록된 병원이 없어요" sub="병원 등록 신청을 먼저 진행해 주세요.">
          <Link
            href="/hospital/register"
            className="mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] transition active:scale-[0.97] active:bg-[#DCEBFF]"
          >
            병원 등록하기
          </Link>
        </EmptyBlock>
      </div>
    );
  }

  const tabs = [
    '병원',
    '멤버',
    '리뷰',
  ];

  const handleAcceptDoctor = (name: string) => {
    showModal('멤버 수락', `${name}님의 가입 요청을 수락하시겠습니까?`, () => {
      showToast('수락되었습니다.');
    });
  };
  const handleRejectDoctor = (name: string) => {
    showModal('멤버 거절', `${name}님의 가입 요청을 거절하시겠습니까?`, () => {
      showToast('거절되었습니다.');
    });
  };
  const handleRemoveDoctor = (name: string) => {
    showModal('멤버 탈퇴', `${name}님을 탈퇴 처리하시겠습니까?`, () => {
      showToast('탈퇴 처리되었습니다.');
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-[500px] bg-white pb-[86px] pt-14 page-enter">
      <ManageHead badge={hospital.status === 'pending'} />

      <div className="sticky top-14 z-40 bg-white px-5 pb-2 pt-1 lg:top-[168px]">
        <SegTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === '병원' && <HospitalTab hospital={hospital} />}
      {activeTab.startsWith('멤버') && (
        <MemberTab
          hospital={hospital}
          onAccept={handleAcceptDoctor}
          onReject={handleRejectDoctor}
          onRemove={handleRemoveDoctor}
        />
      )}
      {activeTab.startsWith('리뷰') && <ReviewTab reviews={reviews} reviewCount={hospital.review_count} />}
    </div>
  );
}

function ManageHead({ badge }: { badge?: boolean }) {
  return (
    <div className="fixed left-1/2 top-0 z-50 flex h-14 w-full max-w-[500px] -translate-x-1/2 items-center justify-between bg-white px-5 lg:top-[112px]">
      <h1 className="text-[20px] font-bold tracking-[-0.4px] text-[#191F28]">병원관리</h1>
      {badge && <span className="inline-flex h-6 items-center rounded-[6px] bg-[#F2F4F6] px-2 text-[13.5px] font-semibold text-[#6B7684]">승인대기</span>}
    </div>
  );
}

/* ==================== 공통 조각 ==================== */
const Band = () => <div className="h-2.5 bg-[#F2F4F6]" />;

/** 세그먼트 탭 — 회색 트랙 + 미끄러지는 흰 알약 */
function SegTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  const idx = Math.max(0, tabs.indexOf(active));
  const n = tabs.length;
  return (
    <div className="relative flex rounded-[12px] bg-[#F2F4F6] p-1">
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-500"
        style={{
          left: `calc(4px + ${(idx * 100) / n}% - ${(idx * 8) / n}px)`,
          width: `calc(${100 / n}% - ${8 / n}px)`,
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`relative h-9 flex-1 rounded-[10px] text-[15px] transition-colors duration-300 ${active === tab ? 'font-bold text-[#191F28]' : 'font-semibold text-[#8B95A1]'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/** 칸 제목 줄 — 20 굵은 제목 + 오른쪽 파란 행동 글자 */
function SectionHead({ title, href, action = '편집' }: { title: React.ReactNode; href?: string; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">{title}</h2>
      {href && (
        <Link href={href} className="-mr-1 inline-flex h-9 items-center gap-0.5 rounded-[10px] pl-2 pr-1 text-[15px] font-semibold text-[#3180F7] active:bg-[#F2F4F6]">
          {action}
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function InfoRows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div>
      {rows.map((r) => (
        <p key={r.label} className="flex min-h-11 items-center py-1.5">
          <span className="w-[86px] shrink-0 text-[17px] text-[#8B95A1]">{r.label}</span>
          <span className="min-w-0 flex-1 break-keep text-[17px] text-[#333D4B]">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyBlock({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
        <MonoIcon name={icon} size={34} color="#B0B8C1" />
      </span>
      <p className="qd-a-item mt-5 break-keep text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>{title}</p>
      {sub && <p className="qd-a-item mt-1.5 break-keep text-[15px] leading-[1.6] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>{sub}</p>}
      {children}
    </div>
  );
}

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= value ? '#FFC342' : '#E5E8EB'} stroke="none" />
      ))}
    </span>
  );
}

/* ==================== Hospital Tab ==================== */
function HospitalTab({ hospital }: { hospital: HospitalRow }) {
  const dayOrder = ['월', '화', '수', '목', '금', '토', '일'];
  const orderedHours = [...(hospital.operating_hours ?? [])].sort(
    (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  );
  const hospitalImage = resolveHospitalImageUrl(hospital);

  return (
    <div className="pt-3">
      {/* 대문사진 */}
      <section className="px-5 pb-7 pt-4">
        <SectionHead title="대문사진" href="/hospital/manage/photos" />
        <div className="relative mt-3 aspect-[16/9] overflow-hidden rounded-[16px] bg-[#F2F4F6]">
          {hospital.cover_images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hospital.cover_images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <MonoIcon name="camera" size={30} color="#B0B8C1" />
              <span className="text-[14px] text-[#8B95A1]">대문사진을 올려 주세요</span>
            </div>
          )}
        </div>
      </section>

      {/* 병원 프로필 */}
      <Band />
      <section className="px-5 py-7">
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">병원 정보</h2>
        <div className="mt-3 flex items-center gap-3.5 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hospitalImage} alt="" className="h-[52px] w-[52px] shrink-0 rounded-[14px] bg-[#F2F4F6] object-cover" />
          <div className="min-w-0 flex-1">
            {hospital.category && (
              <span className="inline-flex h-6 items-center rounded-[6px] bg-[#EFF5FE] px-2 text-[13px] font-semibold text-[#2F6FE4]">{hospital.category}</span>
            )}
            <p className="mt-0.5 truncate text-[17px] font-bold text-[#191F28]">{hospital.name}</p>
          </div>
        </div>
        <div className="mt-2">
          <InfoRows
            rows={[
              ...(hospital.address ? [{ label: '주소', value: hospital.address }] : []),
              ...(hospital.phone ? [{ label: '전화', value: hospital.phone }] : []),
              ...((hospital.tags ?? []).length > 0 ? [{ label: '키워드', value: hospital.tags.map((t) => t.replace(/^#/, '')).join(', ') }] : []),
            ]}
          />
        </div>
      </section>

      {/* 운영시간 */}
      <Band />
      <section className="px-5 py-7">
        <SectionHead title="운영일 및 시간" href="/hospital/manage/hours" />
        <dl className="mt-3">
          {orderedHours.map((oh) => (
            <div key={oh.day} className="flex min-h-11 items-center justify-between py-1.5 text-[16px]">
              <dt className={oh.day === '토' || oh.day === '일' ? 'text-[#8B95A1]' : 'text-[#6B7684]'}>{oh.day}요일</dt>
              <dd className={`tabular-nums ${oh.is_closed ? 'text-[#B0B8C1]' : 'text-[#333D4B]'}`}>
                {oh.is_closed ? '휴진' : `${oh.start_time ?? ''} – ${oh.end_time ?? ''}`}
              </dd>
            </div>
          ))}
        </dl>
        {hospital.holiday_notice && (
          <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#F2F4F6] px-4 py-3.5 text-[14px] leading-[1.5] text-[#4E5968]">
            <MonoIcon name="exclamation-circle" size={17} color="#B0B8C1" className="mt-0.5" />
            {hospital.holiday_notice}
          </p>
        )}
      </section>

      {/* 병원소개 */}
      <Band />
      <section className="px-5 py-7">
        <SectionHead title="병원소개" href="/hospital/manage/intro" />
        <p className={`mt-3 whitespace-pre-wrap break-words text-[16px] leading-[1.7] ${hospital.introduction ? 'text-[#333D4B]' : 'text-[#B0B8C1]'}`}>
          {hospital.introduction || '병원 소개가 아직 등록되지 않았어요.'}
        </p>
      </section>

      {/* 병원위치 */}
      <Band />
      <section className="px-5 py-7">
        <SectionHead title="병원위치" />
        <div className="mt-3 flex aspect-[16/10] items-center justify-center rounded-[16px] bg-[#F2F4F6]">
          <MonoIcon name="pin-location" size={30} color="#B0B8C1" />
        </div>
        <p className="mt-3 text-[15px] leading-[1.5] text-[#191F28]">{hospital.address}</p>
        {hospital.address_detail && (
          <p className="mt-1.5 whitespace-pre-line rounded-[14px] bg-[#F2F4F6] px-4 py-3 text-[14px] leading-[1.6] text-[#4E5968]">
            {hospital.address_detail}
          </p>
        )}
      </section>
    </div>
  );
}

/* ==================== Member Tab ==================== */
function MemberTab({
  hospital,
  onAccept,
  onReject,
  onRemove,
}: {
  hospital: HospitalRow;
  onAccept: (name: string) => void;
  onReject: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const pendingRequests: { id: string; name: string; title: string; specialty: string }[] = [];
  const doctors = hospital.doctors ?? [];

  return (
    <div className="pt-3">
      <section className="px-5 pb-7 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">
            활성 멤버 <span className="text-[#3180F7]">{doctors.length}</span>
          </h2>
          <Link href="/hospital/manage/doctor" className="-mr-1 inline-flex h-9 items-center rounded-[10px] px-2 text-[15px] font-semibold text-[#3180F7] active:bg-[#F2F4F6]">
            + 의료진 추가
          </Link>
        </div>
        <div className="-mx-2 mt-2">
          {doctors.map((doctor, i) => (
            <div key={doctor.id} className="qd-a-item flex items-center gap-3.5 rounded-[16px] px-2 py-3" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
              <Avatar src={doctor.profile_image} role="doctor" seed={doctor.name} size={48} alt="" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[17px] font-bold text-[#191F28]">{doctor.name}</span>
                  <span className="shrink-0 text-[14px] text-[#6B7684]">{doctor.title}</span>
                  {doctor.is_owner && (
                    <span className="inline-flex h-5 shrink-0 items-center rounded-[5px] bg-[#EFF5FE] px-1.5 text-[12px] font-bold text-[#2F6FE4]">나</span>
                  )}
                </p>
                {doctor.specialty && <p className="mt-0.5 truncate text-[14px] text-[#8B95A1]">{doctor.specialty}</p>}
              </div>
              <div className="shrink-0">
                {doctor.is_owner ? (
                  <button type="button" aria-label="정보 수정" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F2F4F6]">
                    <MonoIcon name="pencil" size={16} color="#6B7684" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemove(doctor.name)}
                    className="inline-flex h-9 items-center rounded-[10px] bg-[#F2F4F6] px-3 text-[14px] font-semibold text-[#F04452]"
                  >
                    탈퇴
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {pendingRequests.length > 0 && (
        <>
          <Band />
          <section className="px-5 py-7">
            <h2 className="text-[20px] font-bold leading-tight tracking-[-0.4px] text-[#191F28]">새로운 요청</h2>
            <div className="mt-2 space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="py-3">
                  <div className="flex items-center gap-3.5">
                    <Avatar role="doctor" seed={request.name} size={48} alt="" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5">
                        <span className="text-[17px] font-bold text-[#191F28]">{request.name}</span>
                        <span className="text-[14px] text-[#6B7684]">{request.title}</span>
                      </p>
                      <p className="mt-0.5 text-[14px] text-[#8B95A1]">{request.specialty}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onReject(request.name)}
                      className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#F2F4F6] text-[15px] font-semibold text-[#4E5968]"
                    >
                      거절
                    </button>
                    <button
                      type="button"
                      onClick={() => onAccept(request.name)}
                      className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#4A82EE] text-[15px] font-semibold text-white"
                    >
                      수락
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ==================== Review Tab ==================== */
function ReviewTab({ reviews, reviewCount }: { reviews: ReviewRow[]; reviewCount: number }) {
  if (reviews.length === 0) {
    return <EmptyBlock icon="chat-bubble-question" title="리뷰가 아직 없어요" sub="환자가 후기를 남기면 여기에 모여요." />;
  }

  const avgRating =
    reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length;

  return (
    <div className="pt-3">
      <section className="px-5 pb-7 pt-4">
        <div className="rounded-[14px] bg-[#EFF5FE] px-5 pb-5 pt-4">
          <span className="rounded-[6px] bg-[#2F6FE4] px-2 py-1 text-[13.5px] font-bold text-white">평균 평점</span>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-[30px] font-bold leading-none tracking-[-0.8px] text-[#1E3A78]">{avgRating.toFixed(1)}</p>
            <Stars value={Math.round(avgRating)} size={18} />
          </div>
          <p className="mt-2 text-[15px] font-semibold text-[#1E3A78]">리뷰 {reviewCount.toLocaleString()}개</p>
        </div>
      </section>

      <Band />
      <section className="px-5 py-3">
        {reviews.map((review) => (
          <div key={review.id} className="py-5">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar src={review.author?.profile_image ?? undefined} seed={review.author?.name ?? review.id} size={36} alt="" className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#191F28]">{review.author?.name ?? '익명'}</p>
                  <Stars value={review.rating} size={13} />
                </div>
              </div>
              <span className="shrink-0 text-[13px] text-[#B0B8C1]">
                {review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : ''}
              </span>
            </div>

            {(review.before_image || review.after_image) && (
              <div className="mt-3 flex gap-2">
                {review.before_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={review.before_image} alt="Before" className="h-32 min-w-0 flex-1 rounded-[12px] object-cover" />
                )}
                {review.after_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={review.after_image} alt="After" className="h-32 min-w-0 flex-1 rounded-[12px] object-cover" />
                )}
              </div>
            )}

            <p className="mt-3 line-clamp-3 text-[15px] leading-[1.6] text-[#333D4B]">{review.content}</p>

            <div className="mt-3 space-y-1 rounded-[14px] bg-[#F2F4F6] px-4 py-3">
              {[
                { label: '시술명', value: review.treatment_name ?? '-' },
                { label: '총 비용', value: `${(review.total_cost ?? 0).toLocaleString()}원` },
                { label: '시술일', value: review.treatment_date ?? '-' },
              ].map((r) => (
                <p key={r.label} className="flex items-center text-[14px]">
                  <span className="w-[64px] shrink-0 text-[#8B95A1]">{r.label}</span>
                  <span className="min-w-0 flex-1 truncate text-[#333D4B]">{r.value}</span>
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
