import { create } from 'zustand';
import { User, Reservation, Product, Post, Comment, Review } from '@/types';
import {
  products as mockProducts,
  reservations as mockReservations,
  posts as mockPosts,
  comments as mockComments,
  reviews as mockReviews,
  coupons,
  categories as mockCategories,
} from '@/lib/mock-data';

interface Category {
  id: string;
  name: string;
  icon: string;
  popular: boolean;
}

interface AppState {
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

  // Products
  products: Product[];
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;

  // Reservations
  reservations: Reservation[];
  updateReservationStatus: (id: string, status: Reservation['status'], cancelReason?: string) => void;
  addReservation: (reservation: Reservation) => void;

  // Posts
  posts: Post[];
  addPost: (post: Post) => void;
  deletePost: (id: string) => void;

  // Comments
  comments: Comment[];
  addComment: (comment: Comment) => void;
  deleteComment: (id: string) => void;

  // Reviews
  reviews: Review[];
  addReview: (review: Review) => void;

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
  updateUser: (patch) =>
    set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
  interestedCategories: [],
  toggleInterestedCategory: (id) =>
    set((state) => ({
      interestedCategories: state.interestedCategories.includes(id)
        ? state.interestedCategories.filter((x) => x !== id)
        : [...state.interestedCategories, id],
    })),

  categories: mockCategories,
  addCategory: (cat) => set({ categories: [...get().categories, cat] }),
  updateCategory: (id, data) => set({ categories: get().categories.map(c => c.id === id ? { ...c, ...data } : c) }),
  removeCategory: (id) => set({ categories: get().categories.filter(c => c.id !== id) }),

  products: mockProducts,
  wishlist: [],
  toggleWishlist: (productId) => {
    const current = get().wishlist;
    if (current.includes(productId)) {
      set({ wishlist: current.filter((id) => id !== productId) });
      get().showToast('찜목록에서 삭제되었습니다.');
    } else {
      set({ wishlist: [...current, productId] });
      get().showToast('찜목록에 추가하였습니다!');
    }
  },

  recentlyViewed: [],
  addRecentlyViewed: (productId) => {
    const current = get().recentlyViewed.filter((id) => id !== productId);
    set({ recentlyViewed: [productId, ...current].slice(0, 20) });
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
  },
  addReservation: (reservation) => {
    set({ reservations: [reservation, ...get().reservations] });
  },

  posts: mockPosts,
  addPost: (post) => {
    set({ posts: [post, ...get().posts] });
  },
  deletePost: (id) => {
    set({ posts: get().posts.filter((p) => p.id !== id) });
  },

  comments: mockComments,
  addComment: (comment) => {
    set({ comments: [...get().comments, comment] });
    // Update comment count on post
    set({
      posts: get().posts.map((p) =>
        p.id === comment.postId ? { ...p, commentCount: p.commentCount + 1 } : p
      ),
    });
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
    }
  },

  reviews: mockReviews,
  addReview: (review) => {
    set({ reviews: [review, ...get().reviews] });
    // Add points for review
    const user = get().user;
    if (user) {
      set({ user: { ...user, points: user.points + 500 } });
    }
  },

  recentSearches: ['이빨', '임플란트', '치아교정'],
  addRecentSearch: (keyword) => {
    const current = get().recentSearches.filter((s) => s !== keyword);
    set({ recentSearches: [keyword, ...current].slice(0, 10) });
  },
  removeRecentSearch: (keyword) => {
    set({ recentSearches: get().recentSearches.filter((s) => s !== keyword) });
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
