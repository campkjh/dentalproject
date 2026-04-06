export interface Product {
  id: string;
  title: string;
  hospitalName: string;
  hospitalId: string;
  location: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  likeCount: number;
  imageUrl: string;
  tags: string[];
  category: string;
  subCategory: string;
  options?: ProductOption[];
}

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface Hospital {
  id: string;
  name: string;
  category: string;
  location: string;
  phone: string;
  tags: string[];
  logoUrl?: string;
  coverImages: string[];
  introduction?: string;
  operatingHours: OperatingHour[];
  holidayNotice?: string;
  address: string;
  addressDetail?: string;
  mapUrl?: string;
  doctors: Doctor[];
  rating: number;
  reviewCount: number;
}

export interface OperatingHour {
  day: string;
  startTime?: string;
  endTime?: string;
  isClosed?: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
  hospitalName: string;
  hospitalId?: string;
  profileImage?: string;
  isOwner?: boolean;
  bio?: string;
  careers?: string[];
  certifications?: string[];
}

export interface Review {
  id: string;
  authorName: string;
  authorId: string;
  date: string;
  rating: number;
  content: string;
  beforeImage?: string;
  afterImage?: string;
  treatmentName: string;
  totalCost: number;
  treatmentDate: string;
  productId?: string;
  hospitalId?: string;
  doctorId?: string;
  doctorName?: string;
}

export interface Reservation {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  date: string;
  productTitle: string;
  productImage: string;
  hospitalName: string;
  hospitalId: string;
  location: string;
  visitDate: string;
  reservationDate: string;
  cancelDate?: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  cancelReason?: string;
  assignedDoctor?: string;
  paymentMethod?: string;
  paymentType?: string;
}

export interface Post {
  id: string;
  boardType: 'question' | 'free' | 'dental';
  title: string;
  content: string;
  authorName: string;
  authorTitle?: string;
  authorHospital?: string;
  authorId: string;
  isAnonymous?: boolean;
  anonymousId?: string;
  date: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  hasAnswer?: boolean;
  answerCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorTitle?: string;
  authorHospital?: string;
  authorId: string;
  isAnonymous?: boolean;
  anonymousId?: string;
  content: string;
  date: string;
  likeCount: number;
  isReply?: boolean;
  parentCommentId?: string;
}

export interface Notification {
  id: string;
  type: 'event' | 'important' | 'recommendation' | 'info' | 'update';
  title: string;
  content: string;
  date: string;
  isRead: boolean;
}

export interface Coupon {
  id: string;
  name: string;
  description: string;
  discountAmount: number;
  expiryDate?: string;
  daysLeft?: number;
  status: 'available' | 'used' | 'expired';
}

export interface PointHistory {
  id: string;
  type: 'earn' | 'use';
  description: string;
  amount: number;
  date: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  loginType: 'kakao' | 'apple';
  gender?: string;
  birthYear?: string;
  country?: string;
  profileImage?: string;
  points: number;
  coupons: Coupon[];
  isDoctor?: boolean;
  doctorInfo?: Doctor;
}
