import { create } from 'zustand';
import { User, Reservation, Product, Post, Comment, Review, Hospital, Notification, PointHistory } from '@/types';
import { pickCustomerProfileAvatarBySeed } from '@/lib/customer-profile-avatars';
import { resolveHospitalImageUrl, resolveProductImageUrl } from '@/lib/images';
import { haptic, toneOfMessage } from '@/lib/haptics';
import { normalizeCategory } from '@/lib/api/normalize';
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
    productId: r.product?.id ?? r.product_id ?? undefined,
    productTitle: r.product?.title ?? '',
    productImage: resolveProductImageUrl(r.product?.image_url, r.product?.id ?? r.product_id),
    hospitalName: r.hospital?.name ?? '',
    hospitalId: r.hospital?.slug ?? r.hospital?.id ?? r.hospital_id,
    hospitalImage: resolveHospitalImageUrl(r.hospital),
    location: r.hospital?.location ?? '',
    visitDate: r.visit_at ? new Date(r.visit_at).toLocaleString('ko-KR') : '',
    reservationDate: r.reservation_at ? new Date(r.reservation_at).toLocaleString('ko-KR') : '',
    cancelDate: r.cancel_at ? new Date(r.cancel_at).toLocaleString('ko-KR') : undefined,
    amount: r.amount ?? 0,
    customerName: r.customer_name ?? '',
    customerPhone: r.customer_phone ?? '',
    cancelReason: r.cancel_reason ?? undefined,
    assignedDoctor: r.doctor?.name ?? undefined,
    assignedDoctorImage: r.doctor?.profile_image ?? undefined,
    assignedDoctorTitle: r.doctor?.title ?? undefined,
    paymentMethod: r.payment_method ?? undefined,
    paymentType: r.payment_type ?? undefined,
    scheduleHistory: (r.schedule_history ?? []).map((item: any) => ({
      id: item.id,
      title: item.title ?? '예약일시 변경',
      content: item.content ?? '',
      createdAt: item.created_at ?? item.createdAt ?? '',
    })),
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
  hydrateCatalog: (options?: { force?: boolean }) => Promise<void>;

  // User hydration on login (wishlist, reservations, coupons, etc.)
  meHydrated: boolean;
  hydrateMe: () => Promise<void>;
  resetMe: () => void;

  // Auth
  isLoggedIn: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
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
  /** 포켓에 담은 커뮤니티 글 id(최근 담은 순) */
  postPockets: string[];
  togglePostPocket: (postId: string) => void;
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;

  // Reservations
  reservations: Reservation[];
  /** 서버 반영에 실패하면 화면 상태를 되돌리고 { error }를 돌려준다(예: 결제 취소 실패). */
  updateReservationStatus: (id: string, status: Reservation['status'], cancelReason?: string) => Promise<{ error?: string }>;
  addReservation: (reservation: Reservation, opts?: { visitAtIso?: string }) => Promise<{ error: string | null; id?: string }>;

  // Posts
  posts: Post[];
  addPost: (post: Post) => Promise<{ error: string | null; id?: string }>;
  deletePost: (id: string) => void;

  // Comments
  comments: Comment[];
  addComment: (comment: Comment) => Promise<{ error: string | null; id?: string }>;
  deleteComment: (id: string) => void;

  // Reviews
  reviews: Review[];
  addReview: (review: Review) => Promise<{ error: string | null; id?: string }>;

  // Notifications & point history (hydrated from /api/me)
  notifications: Notification[];
  refreshNotifications: () => Promise<void>;
  deleteNotifications: (ids?: string[]) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  pointHistory: PointHistory[];

  // Announcements (public)
  announcements: { id: string; title: string; date: string; content: string }[];

  // Search
  recentSearches: string[];
  addRecentSearch: (keyword: string) => void;
  removeRecentSearch: (keyword: string) => void;

  // Toast
  toast: string | null;
  /** 같은 문구를 다시 띄워도 새로 튀어나오게 — 띄울 때마다 1씩 오른다 */
  toastKey: number;
  /** 닫히는 중(가라앉는 움직임) — 끝나면 toast 가 null 이 된다 */
  toastLeaving: boolean;
  showToast: (message: string) => void;
  hideToast: () => void;

  // Modal
  modal: {
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    singleButton?: boolean;
  } | null;
  showModal: (title: string, message: string, onConfirm: () => void) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    opts?: { confirmText?: string; cancelText?: string; onCancel?: () => void }
  ) => void;
  showAlert: (title: string, message?: string, opts?: { confirmText?: string; onConfirm?: () => void }) => void;
  hideModal: () => void;
}

// A GET started before a mutation must not restore deleted or unread messages.
let notificationsRevision = 0;
let catalogInFlight: Promise<void> | null = null;

export const useStore = create<AppState>((set, get) => ({
  catalogHydrated: false,
  hydrateCatalog: async (options = {}) => {
    if (catalogInFlight) return catalogInFlight;
    if (get().catalogHydrated && !options.force) return;
    const load = async () => {

      // 1) Instant: restore from localStorage cache (0ms render)
      try {
        const cached = !get().catalogHydrated && typeof window !== 'undefined' ? localStorage.getItem('catalog_cache') : null;
        if (cached) {
          const data = JSON.parse(cached);
          set({
            hospitals: data.hospitals ?? get().hospitals,
            products: data.products ?? get().products,
            reviews: data.reviews ?? get().reviews,
            categories: (data.categories ?? get().categories).map(normalizeCategory),
            posts: data.posts ?? get().posts,
            comments: data.comments ?? get().comments,
            announcements: data.announcements ?? get().announcements,
            catalogHydrated: true,
          });
        }
      } catch { /* corrupt cache — ignore */ }

      // 2) Background: fetch fresh from server
      try {
        const res = await fetch('/api/catalog', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        set({
          hospitals: Array.isArray(data.hospitals) ? data.hospitals : get().hospitals,
          products: Array.isArray(data.products) ? data.products : get().products,
          reviews: Array.isArray(data.reviews) ? data.reviews : get().reviews,
          categories: (Array.isArray(data.categories) ? data.categories : get().categories).map(normalizeCategory),
          posts: Array.isArray(data.posts) ? data.posts : get().posts,
          comments: Array.isArray(data.comments) ? data.comments : get().comments,
          announcements: Array.isArray(data.announcements) ? data.announcements : get().announcements,
          catalogHydrated: true,
        });
        // Save to cache for next visit
        try {
          localStorage.setItem('catalog_cache', JSON.stringify(data));
        } catch { /* storage full — ignore */ }
      } catch {
        // network down → keep cached/mock data
      }
    };
    catalogInFlight = load();
    try { await catalogInFlight; }
    finally { catalogInFlight = null; }
  },

  meHydrated: false,
  hydrateMe: async () => {
    const notificationRevision = notificationsRevision;
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
        postPockets: data.postPockets ?? [],
        recentlyViewed: data.recentlyViewed ?? [],
        reservations: (data.reservations ?? []).map(reservationFromRow),
        interestedCategories: data.interestedCategories ?? [],
        ...(notificationRevision === notificationsRevision ? { notifications: (data.notifications ?? []).map(notificationFromRow) } : {}),
        pointHistory: (data.pointHistory ?? []).map(pointFromRow),
        recentSearches: data.recentSearches ?? [],
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
      postPockets: [],
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
  isAdmin: false,
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
        profileImage: pickCustomerProfileAvatarBySeed('user1'),
        points: 5000,
        coupons: coupons,
      },
    });
  },

  logout: () => {
    set({ isLoggedIn: false, user: null, isDoctor: false, isAdmin: false });
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
    get().showToast(wasIn ? '포켓에서 뺐어요.' : '포켓에 담았어요!');
    void syncWrite(wasIn ? 'DELETE' : 'POST', '/api/wishlist', { productId }, () => {
      // rollback on auth/network error
      set({ wishlist: wasIn ? [...get().wishlist, productId] : get().wishlist.filter((id) => id !== productId) });
    });
  },

  // 커뮤니티 글 포켓 — 상품 포켓과 같은 결(바로 바꾸고, 서버가 거절하면 되돌리며 이유를 알려 준다)
  postPockets: [],
  togglePostPocket: (postId) => {
    const wasIn = get().postPockets.includes(postId);
    set({ postPockets: wasIn ? get().postPockets.filter((id) => id !== postId) : [postId, ...get().postPockets] });
    get().showToast(wasIn ? '포켓에서 뺐어요.' : '포켓에 담았어요!');
    const rollback = (message: string) => {
      const now = get().postPockets.filter((id) => id !== postId);
      set({ postPockets: wasIn ? [postId, ...now] : now });
      get().showToast(message);
    };
    void fetch('/api/post-pockets', {
      method: wasIn ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
      .then(async (res) => {
        if (res.ok) return;
        const payload = await res.json().catch(() => ({}));
        rollback(payload.error || '포켓을 저장하지 못했어요.');
      })
      .catch(() => rollback('포켓을 저장하지 못했어요.'));
  },

  recentlyViewed: [],
  addRecentlyViewed: (productId) => {
    const current = get().recentlyViewed.filter((id) => id !== productId);
    set({ recentlyViewed: [productId, ...current].slice(0, 20) });
    void syncWrite('POST', '/api/recently-viewed', { productId });
  },

  reservations: mockReservations,
  updateReservationStatus: async (id, status, cancelReason) => {
    const previous = get().reservations;
    set({
      reservations: previous.map((r) =>
        r.id === id
          ? { ...r, status, ...(cancelReason ? { cancelReason, cancelDate: new Date().toLocaleString('ko-KR') } : {}) }
          : r
      ),
    });
    if (!/^[0-9a-f]{8}-/.test(id)) return {};
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancelReason }),
      });
      if (res.ok) return {};
      const data = await res.json().catch(() => ({}));
      set({ reservations: previous });
      return { error: data?.error ?? '예약 상태를 변경하지 못했어요.' };
    } catch {
      set({ reservations: previous });
      return { error: '네트워크 오류로 예약 상태를 변경하지 못했어요.' };
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
          productId: reservation.productId,
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
          isSecret: post.isSecret,
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
      const { id, tags } = await res.json();
      // 서버(AI)가 고른 태그로 바꿔 끼운다
      set({ posts: get().posts.map((p) => (p.id === post.id ? { ...p, id, tags: Array.isArray(tags) ? tags : p.tags } : p)) });
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
  addComment: async (comment) => {
    set({ comments: [...get().comments, comment] });
    set({
      posts: get().posts.map((p) =>
        p.id === comment.postId ? { ...p, commentCount: p.commentCount + 1 } : p
      ),
    });
    if (!/^[0-9a-f]{8}-/.test(comment.postId)) {
      return { error: null, id: comment.id };
    }
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
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        set({ comments: get().comments.filter((c) => c.id !== comment.id) });
        set({
          posts: get().posts.map((p) =>
            p.id === comment.postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
          ),
        });
        return { error: j.error || `댓글 등록 실패 (${res.status})` };
      }
      const { id } = await res.json();
      set({ comments: get().comments.map((c) => (c.id === comment.id ? { ...c, id } : c)) });
      return { error: null, id };
    } catch (e) {
      set({ comments: get().comments.filter((c) => c.id !== comment.id) });
      set({
        posts: get().posts.map((p) =>
          p.id === comment.postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
        ),
      });
      return { error: (e as Error).message || '네트워크 오류' };
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
  refreshNotifications: async () => {
    const userId = get().user?.id;
    if (!userId) return;
    const revision = notificationsRevision;
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (get().user?.id === userId && revision === notificationsRevision) set({ notifications: (data.notifications ?? []).map(notificationFromRow) });
    } catch { /* Keep existing messages when temporarily offline. */ }
  },
  deleteNotifications: async (ids) => {
    const userId = get().user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    const response = await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.deletedIds)) throw new Error('알림을 삭제하지 못했어요.');
    if (get().user?.id !== userId) return;
    notificationsRevision++;
    const deletedIds = new Set<string>(data.deletedIds);
    set(state => ({ notifications: state.notifications.filter(item => !deletedIds.has(item.id)) }));
  },
  markAllNotificationsRead: async () => {
    const userId = get().user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.readIds)) throw new Error('알림을 읽음 처리하지 못했어요.');
    if (get().user?.id !== userId) return;
    notificationsRevision++;
    const readIds = new Set<string>(data.readIds);
    set(state => ({ notifications: state.notifications.map(item => readIds.has(item.id) ? { ...item, isRead: true } : item) }));
  },
  markNotificationRead: (id) => {
    set({
      notifications: get().notifications.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      ),
    });
  },
  pointHistory: mockPointHistory,
  announcements: mockAnnouncements,

  reviews: mockReviews,
  addReview: async (review) => {
    set({ reviews: [review, ...get().reviews] });
    const authorId = get().user?.id;
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: review.hospitalId,
          productId: review.productId,
          reservationId: review.reservationId,
          doctorId: review.doctorId,
          rating: review.rating,
          content: review.content,
          treatmentName: review.treatmentName,
          treatmentDate: review.treatmentDate || undefined,
          totalCost: review.totalCost,
          beforeImage: review.beforeImage,
          afterImage: review.afterImage,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        set({ reviews: get().reviews.filter((r) => r.id !== review.id) });
        return { error: j.error || `리뷰 등록 실패 (${res.status})` };
      }
      const { id } = await res.json();
      // Reload the committed balance and reward ledger together; never invent +500 locally.
      if (get().user?.id === authorId) await get().hydrateMe();
      set({ reviews: get().reviews.map((r) => (r.id === review.id ? { ...r, id } : r)) });
      return { error: null, id };
    } catch (e) {
      set({ reviews: get().reviews.filter((r) => r.id !== review.id) });
      return { error: (e as Error).message || '네트워크 오류' };
    }
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
  toastKey: 0,
  toastLeaving: false,
  showToast: (message) => {
    const key = get().toastKey + 1;
    set({ toast: message, toastKey: key, toastLeaving: false });
    // 결과 진동 — 문구로 고른다(토스트 아이콘과 같은 규칙): 실패=error · 확인 필요=warning · 됐어요=success · 그 밖=light
    const tone = toneOfMessage(message);
    haptic(tone === 'info' ? 'light' : tone);
    // 뒤에 띄운 문구가 있으면 그쪽 타이머가 닫는다
    setTimeout(() => { if (get().toastKey === key) get().hideToast(); }, 2800);
  },
  hideToast: () => {
    const key = get().toastKey;
    if (!get().toast) return;
    set({ toastLeaving: true });
    setTimeout(() => { if (get().toastKey === key) set({ toast: null, toastLeaving: false }); }, 280);
  },

  modal: null,
  showModal: (title, message, onConfirm) => set({ modal: { title, message, onConfirm } }),
  showConfirm: (title, message, onConfirm, opts) =>
    set({
      modal: {
        title,
        message,
        onConfirm,
        onCancel: opts?.onCancel,
        confirmText: opts?.confirmText,
        cancelText: opts?.cancelText,
      },
    }),
  showAlert: (title, message = '', opts) => {
    // 실패·확인 필요 알림창은 같이 떨린다(그냥 안내는 조용히)
    const tone = toneOfMessage(`${title} ${message}`);
    if (tone === 'error' || tone === 'warning') haptic(tone);
    set({
      modal: {
        title,
        message,
        onConfirm: opts?.onConfirm,
        confirmText: opts?.confirmText ?? '확인',
        singleButton: true,
      },
    });
  },
  hideModal: () => set({ modal: null }),
}));
