import type { Hospital, Product, Doctor, Review, OperatingHour } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function normalizeHospital(row: any): Hospital {
  return {
    id: row.slug ?? row.id,
    name: row.name,
    category:
      row.category === 'dental' ? '치과'
        : row.category === 'plastic' ? '성형외과'
        : row.category ?? '',
    location: row.location ?? '',
    phone: row.phone ?? '',
    tags: row.tags ?? [],
    logoUrl: row.logo_url ?? undefined,
    coverImages: row.cover_images ?? [],
    introduction: row.introduction ?? undefined,
    operatingHours: (row.operating_hours ?? []).map((o: any): OperatingHour => ({
      day: o.day,
      startTime: o.start_time ?? undefined,
      endTime: o.end_time ?? undefined,
      isClosed: o.is_closed ?? false,
    })),
    holidayNotice: row.holiday_notice ?? undefined,
    address: row.address ?? '',
    addressDetail: row.address_detail ?? undefined,
    mapUrl: row.map_url ?? undefined,
    doctors: (row.doctors ?? []).map((d: any): Doctor => ({
      id: d.id,
      name: d.name,
      title: d.title ?? '',
      specialty: d.specialty ?? '',
      hospitalName: row.name,
      hospitalId: row.slug ?? row.id,
      profileImage: d.profile_image ?? undefined,
      isOwner: d.is_owner ?? false,
      bio: d.bio ?? undefined,
      careers: d.careers ?? [],
      certifications: d.certifications ?? [],
    })),
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
  };
}

export function normalizeProduct(row: any): Product {
  return {
    id: row.id,
    title: row.title,
    hospitalName: row.hospitals?.name ?? row.hospital_name ?? '',
    hospitalId: row.hospitals?.id ?? row.hospital_id ?? '',
    location: row.location ?? row.hospitals?.location ?? '',
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    discount: row.discount ?? undefined,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    likeCount: row.like_count ?? 0,
    imageUrl: row.image_url ?? '',
    tags: row.tags ?? [],
    category: row.category ?? '',
    subCategory: row.sub_category ?? '',
    options: row.product_options
      ? row.product_options
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((o: any) => ({ id: o.id, name: o.name, price: o.price }))
      : undefined,
  };
}

export function normalizeReview(row: any): Review {
  return {
    id: row.id,
    authorName: row.author?.name ?? '익명',
    authorId: row.author_id,
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
    rating: Number(row.rating ?? 0),
    content: row.content,
    beforeImage: row.before_image ?? undefined,
    afterImage: row.after_image ?? undefined,
    treatmentName: row.treatment_name ?? '',
    totalCost: row.total_cost ?? 0,
    treatmentDate: row.treatment_date ?? '',
    productId: row.product_id ?? undefined,
    hospitalId: row.hospital_id ?? undefined,
    doctorId: row.doctor_id ?? undefined,
    doctorName: row.doctor?.name ?? undefined,
  };
}

export function normalizeCategory(row: any) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? '',
    popular: row.popular ?? false,
  };
}
