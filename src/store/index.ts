import { create } from 'zustand';
import { User, Reservation, Product, Post, Comment, Review, Hospital, Notification, PointHistory } from '@/types';
import {
  products as mockProducts,
  hospitals as mockHospitals,
  reservations as mockReservations,
  posts as mockPosts,
  comments as mockComments,
  reviews as mockReviews,
  coupons,
  categories as mockCategories,
  notifications as mockNotifications,
  pointHistory as mockPointHistory,
  announcements as mockAnnouncements,
} from '@/lib/mock-data';

interface Category {
  id: string;
  name: string;
  icon: string;
  popular: boolean;
}

/* ---------------------- DB sync helpers ---------------------- */

async function syncWrite(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  onError?: () => void
) {
  try {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok && res.status === 401) onError?.();
  } catch {
    onError?.();
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function reservationFromRow(r: any): Reservation {
  return {
    id: r.id,
    status: r.status,
    date: r.reservation_at ? new Date(r.reservation_at).toLocaleDateString('ko-KR') : '',
    productTitle: r.product?.title ?? '',
    productImage: r.product?.image_url ?? '',
    hospitalName: r.hospital?.name ?? '',
    hospitalId: r.hospital?.slug ?? r.hospital?.id ?? r.hospital_id,
    location: r.hospital?.location ?? '',
    visitDate: r.visit_at ? new Date(r.visit_at).toLocaleString('ko-KR') : '',
    reservationDate: r.reservation_at ? new Date(r.reservation_at).toLocaleString('ko-KR') : '',
    cancelDate: r.cancel_at ? new Date(r.cancel_at).toLocaleString('ko-KR') : undefined,
    amount: r.amount ?? 0,
    customerName: r.customer_name ?? '',
    customerPhone: r.customer_phone ?? '',
    cancelReason: r.cancel_reason ?? undefined,
    assignedDoctor: r.doctor?.name ?? undefined,
    paymentMethod: r.payment_method ?? undefined,
    paymentType: r.payment_type ?? undefined,
  };
}

function couponFromRow(c: any) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    discountAmount: c.discount_amount,
    expiryDate: c.expiry_date ?? undefined,
    daysLeft: c.expiry_date
      ? Math.max(0, Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000))
      : undefined,
    status: c.status as 'available' | 'used' | 'expired',
  };
}

function notificationFromRow(n: any): Notification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content ?? '',
    date: n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR') : '',
    isRead: n.is_read ?? false,
    link: n.link ?? undefined,
  };
}

function pointFromRow(p: any): PointHistory {
  return {
    id: p.id,
    type: p.type,
    description: p.description ?? '',
    amount: p.amount,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('ko-KR') : '',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface AppState {
  // Catalog hydration (DB-backed, replaces mock-data when loaded)
  catalogHydrated: boolean;
  hydrateCatalog: () => Promise<void>;

  // User hydration on login (wishlist, reservations, coupons, etc.)
  meHydrated: boolean;
  hydrateMe: () => Promise<void>;
  resetMe: () => void;

  // Auth
  isLoggedIn: boolean;
  isDoctor: boolean;
  user: User | null;
  login: (type: 'kakao' | 'apple') => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  interestedCategories: string[];
  toggleInterestedCategory: (id: string) => void;

  // Categories
  categories: Category[];
  addCategory: (cat: Category) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  removeCategory: (id: string) => void;

  // Hospitals (DB-backed; mock fallback until hydrate)
  hospitals: Hospital[];

  // Products
  products: Product[];
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;

  // Reservations
  reservations: Reservation[];
  updateReservationStatus: (id: string, status: Reservation['status'], cancelReason?: string) => void;
  addReservation: (reservation: Reservation, opts?: { visitAtIso?: string }) => Promise<{ error: string | null; id?: string }>;

  // Posts
  posts: Post[];
  addPost: (post: Post) => Promise<{ error: string | null; id?: string }>;
  deletePost: (id: string) => void;

  // Comments
  comments: Comment[];
  addComment: (comment: Comment) => void;
  deleteComment: (id: string) => void;

  // Reviews
  reviews: Review[];
  addReview: (review: Review) => void;

  // Notifications & point history (hydrated from /api/me)
  notifications: Notification[];
  pointHistory: PointHistory[];

  // Announcements (public)
  announcements: { id: string; title: string; date: string; content: string }[];

  // Search
  recentSearches: string[];
  addRecentSearch: (keyword: string) => void;
  removeRecentSearch: (keyword: string) => void;

  // Toast
  toast: string | null;
  showToast: (message: string) => void;

  // Modal
  modal: { title: string; message: string; onConfirm: () => void } | null;
  showModal: (title: string, message: string, onConfirm: () => void) => void;
  hideModal: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  catalogHydrated: false,
  hydrateCatalog: async () => {
    if (get().catalogHydrated) return;
    try {
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      set({
        hospitals: data.hospitals?.length ? data.hospitals : get().hospitals,
        products: data.products?.length ? data.products : get().products,
        reviews: data.reviews?.length ? data.reviews : get().reviews,
        categories: data.categories?.length ? data.categories : get().categories,
        posts: data.posts?.length ? data.posts : get().posts,
        comments: data.comments?.length ? data.comments : get().comments,
        announcements: data.announcements?.length ? data.announcements : get().announcements,
        catalogHydrated: true,
      });
    } catch {
      // network down → keep mock data; app still works
    }
  },

  meHydrated: false,
  hydrateMe: async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.user) {
        set({ meHydrated: true });
        return;
      }
      set({
        wishlist: data.wishlist ?? [],
        recentlyViewed: data.recentlyViewed ?? [],
        reservations:
          (data.reservations ?? []).length > 0
            ? (data.reservations ?? []).map(reservationFromRow)
            : get().reservations,
        interestedCategories: data.interestedCategories ?? [],
        notifications:
          (data.notifications ?? []).length > 0
            ? (data.notifications ?? []).map(notificationFromRow)
            : get().notifications,
        pointHistory:
          (data.pointHistory ?? []).length > 0
            ? (data.pointHistory ?? []).map(pointFromRow)
            : get().pointHistory,
        recentSearches:
          (data.recentSearches ?? []).length > 0 ? data.recentSearches : get().recentSearches,
        meHydrated: true,
      });
      // patch coupons + points into user
      const u = get().user;
      if (u) {
        set({
          user: {
            ...u,
            coupons: (data.coupons ?? []).map(couponFromRow),
            points: data.user.profile?.points ?? u.points,
          },
        });
      }
    } catch {
      // ignore
    }
  },
  resetMe: () => {
    set({
      wishlist: [],
      recentlyViewed: [],
      reservations: mockReservations,
      interestedCategories: [],
      notifications: mockNotifications,
      pointHistory: mockPointHistory,
      meHydrated: false,
    });
  },

  isLoggedIn: false,
  isDoctor: false,
  user: null,

  login: (type) => {
    set({
      isLoggedIn: true,
      user: {
        id: 'user1',
        name: '홍길동',
        phone: '010-1245-2189',
        loginType: type,
        gender: '남성',
        birthYear: '1995',
        country: '대한민국',
        points: 5000,
        coupons: coupons,
      },
    });
  },

  logout: () => {
    set({ isLoggedIn: false, user: null, isDoctor: false });
  },
  updateUser: (patch) => {
    set((state) => (state.user ? { user: { ...state.user, ...patch } } : {}));
    void syncWrite('PATCH', '/api/profile', patch);
  },
  interestedCategories: [],
  toggleInterestedCategory: (id) => {
    const wasIn = get().interestedCategories.includes(id);
    set((state) => ({
      interestedCategories: wasIn
        ? state.interestedCategories.filter((x) => x !== id)
        : [...state.interestedCategories, id],
    }));
    void syncWrite(wasIn ? 'DELETE' : 'POST', '/api/interested-categories', { categoryId: id });
  },

  categories: mockCategories,
  addCategory: (cat) => set({ categories: [...get().categories, cat] }),
  updateCategory: (id, data) => set({ categories: get().categories.map(c => c.id === id ? { ...c, ...data } : c) }),
  removeCategory: (id) => set({ categories: get().categories.filter(c => c.id !== id) }),

  hospitals: mockHospitals,

  products: mockProducts,
  wishlist: [],
  toggleWishlist: (productId) => {
    const current = get().wishlist;
    const wasIn = current.includes(productId);
    set({
      wishlist: wasIn ? current.filter((id) => id !== productId) : [...current, productId],
    });
    get().showToast(wasIn ? '찜목록에서 삭제되었습니다.' : '찜목록에 추가하였습니다!');
    void syncWrite(wasIn ? 'DELETE' : 'POST', '/api/wishlist', { productId }, () => {
      // rollback on auth/network error
      set({ wishlist: wasIn ? [...get().wishlist, productId] : get().wishlist.filter((id) => id !== productId) });
    });
  },

  recentlyViewed: [],
  addRecentlyViewed: (productId) => {
    const current = get().recentlyViewed.filter((id) => id !== productId);
    set({ recentlyViewed: [productId, ...current].slice(0, 20) });
    void syncWrite('POST', '/api/recently-viewed', { productId });
  },

  reservations: mockReservations,
  updateReservationStatus: (id, status, cancelReason) => {
    set({
      reservations: get().reservations.map((r) =>
        r.id === id
          ? { ...r, status, ...(cancelReason ? { cancelReason, cancelDate: new Date().toLocaleString('ko-KR') } : {}) }
          : r
      ),
    });
    if (/^[0-9a-f]{8}-/.test(id)) {
      void syncWrite('PATCH', `/api/reservations/${id}`, { status, cancelReason });
    }
  },
  addReservation: async (reservation, opts) => {
    set({ reservations: [reservation, ...get().reservations] });
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: reservation.hospitalId,
          visitAt: opts?.visitAtIso ?? reservation.visitDate,
          amount: reservation.amount,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone,
          paymentType: reservation.paymentType,
          paymentMethod: reservation.paymentMethod,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // rollback optimistic
        set({ reservations: get().reservations.filter((r) => r.id !== reservation.id) });
        return { error: j.error || `예약 실패 (${res.status})` };
      }
      const { id } = await res.json();
      set({
        reservations: get().reservations.map((r) => (r.id === reservation.id ? { ...r, id } : r)),
      });
      return { error: null, id };
    } catch (e) {
      set({ reservations: get().reservations.filter((r) => r.id !== reservation.id) });
      return { error: (e as Error).message || '네트워크 오류' };
    }
  },

  posts: mockPosts,
  addPost: async (post) => {
    set({ posts: [post, ...get().posts] });
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardType: post.boardType,
          title: post.title,
          content: post.content,
          isAnonymous: post.isAnonymous,
          anonymousId: post.anonymousId,
          imageUrl: post.imageUrl,
          thumbnailUrl: post.thumbnailUrl,
          tags: post.tags,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // rollback optimistic
        set({ posts: get().posts.filter((p) => p.id !== post.id) });
        return { error: j.error || `등록 실패 (${res.status})` };
      }
      const { id } = await res.json();
      set({ posts: get().posts.map((p) => (p.id === post.id ? { ...p, id } : p)) });
      return { error: null, id };
    } catch (e) {
      set({ posts: get().posts.filter((p) => p.id !== post.id) });
      return { error: (e as Error).message || '네트워크 오류' };
    }
  },
  deletePost: (id) => {
    set({ posts: get().posts.filter((p) => p.id !== id) });
    if (/^[0-9a-f]{8}-/.test(id)) {
      void syncWrite('DELETE', `/api/posts/${id}`, {});
    }
  },

  comments: mockComments,
  addComment: (comment) => {
    set({ comments: [...get().comments, comment] });
    set({
      posts: get().posts.map((p) =>
        p.id === comment.postId ? { ...p, commentCount: p.commentCount + 1 } : p
      ),
    });
    if (/^[0-9a-f]{8}-/.test(comment.postId)) {
      void (async () => {
        try {
          const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: comment.postId,
              content: comment.content,
              isAnonymous: comment.isAnonymous,
              anonymousId: comment.anonymousId,
              parentCommentId: comment.parentCommentId,
            }),
          });
          if (res.ok) {
            const { id } = await res.json();
            set({ comments: get().comments.map((c) => (c.id === comment.id ? { ...c, id } : c)) });
          }
        } catch {/* ignore */}
      })();
    }
  },
  deleteComment: (id) => {
    const comment = get().comments.find((c) => c.id === id);
    if (comment) {
      set({ comments: get().comments.filter((c) => c.id !== id) });
      set({
        posts: get().posts.map((p) =>
          p.id === comment.postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
        ),
      });
      if (/^[0-9a-f]{8}-/.test(id)) {
        void syncWrite('DELETE', `/api/comments/${id}`, {});
      }
    }
  },

  notifications: mockNotifications,
  pointHistory: mockPointHistory,
  announcements: mockAnnouncements,

  reviews: mockReviews,
  addReview: (review) => {
    set({ reviews: [review, ...get().reviews] });
    // Add points for review
    const user = get().user;
    if (user) {
      set({ user: { ...user, points: user.points + 500 } });
    }
    void (async () => {
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hospitalId: review.hospitalId,
            productId: review.productId,
            doctorId: review.doctorId,
            rating: review.rating,
            content: review.content,
            treatmentName: review.treatmentName,
            treatmentDate: review.treatmentDate,
            totalCost: review.totalCost,
            beforeImage: review.beforeImage,
            afterImage: review.afterImage,
          }),
        });
        if (res.ok) {
          const { id } = await res.json();
          set({ reviews: get().reviews.map((r) => (r.id === review.id ? { ...r, id } : r)) });
        }
      } catch {/* ignore */}
    })();
  },

  recentSearches: [],
  addRecentSearch: (keyword) => {
    const current = get().recentSearches.filter((s) => s !== keyword);
    set({ recentSearches: [keyword, ...current].slice(0, 10) });
    void syncWrite('POST', '/api/recent-searches', { keyword });
  },
  removeRecentSearch: (keyword) => {
    set({ recentSearches: get().recentSearches.filter((s) => s !== keyword) });
    void syncWrite('DELETE', '/api/recent-searches', { keyword });
  },

  toast: null,
  showToast: (message) => {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), 3000);
  },

  modal: null,
  showModal: (title, message, onConfirm) => set({ modal: { title, message, onConfirm } }),
  hideModal: () => set({ modal: null }),
}));
