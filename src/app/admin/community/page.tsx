'use client';

import { useState } from 'react';
import {
  Search,
  FileText,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Flag,
  MessageSquare,
  ThumbsUp,
  Clock,
  CheckCircle,
} from 'lucide-react';

// --- Types ---
type Board = '전체' | '질문게시판' | '자유게시판' | '치과게시판';
type ReportStatus = '대기' | '처리완료';

interface Post {
  id: number;
  title: string;
  board: '질문게시판' | '자유게시판' | '치과게시판';
  author: string;
  views: number;
  comments: number;
  likes: number;
  reports: number;
  date: string;
  hidden: boolean;
}

interface Report {
  id: number;
  postId: number;
  postTitle: string;
  reason: string;
  reporter: string;
  reportDate: string;
  status: ReportStatus;
}

// --- Mock Data ---
const mockPosts: Post[] = [
  { id: 2456, title: '임플란트 시술 후 통증이 계속되는데 정상인가요?', board: '질문게시판', author: '김서연', views: 342, comments: 28, likes: 15, reports: 3, date: '2026-04-06', hidden: false },
  { id: 2455, title: '라미네이트 가격 비교 후기 (강남 3곳 방문)', board: '자유게시판', author: '박지훈', views: 891, comments: 45, likes: 67, reports: 0, date: '2026-04-06', hidden: false },
  { id: 2454, title: '치아교정 6개월차 경과 사진 공유합니다', board: '자유게시판', author: '이하은', views: 1203, comments: 56, likes: 89, reports: 0, date: '2026-04-06', hidden: false },
  { id: 2453, title: '치과에서 추천하는 전동칫솔 브랜드가 궁금합니다', board: '질문게시판', author: '정민수', views: 234, comments: 12, likes: 8, reports: 0, date: '2026-04-05', hidden: false },
  { id: 2452, title: '스케일링 주기 어떻게 하시나요?', board: '질문게시판', author: '최유진', views: 456, comments: 34, likes: 22, reports: 1, date: '2026-04-05', hidden: false },
  { id: 2451, title: '[공지] 치과게시판 이용 규칙 안내', board: '치과게시판', author: '관리자', views: 2341, comments: 5, likes: 12, reports: 0, date: '2026-04-05', hidden: false },
  { id: 2450, title: '사랑니 발치 후 회복기간 실제 후기', board: '자유게시판', author: '한소희', views: 678, comments: 41, likes: 55, reports: 0, date: '2026-04-04', hidden: false },
  { id: 2449, title: '불법 시술 광고하는 게시글입니다 (신고)', board: '치과게시판', author: '미확인업체', views: 123, comments: 2, likes: 0, reports: 8, date: '2026-04-04', hidden: false },
  { id: 2448, title: '치아미백 집에서 하는 방법 공유해요~', board: '자유게시판', author: '오지은', views: 567, comments: 23, likes: 34, reports: 2, date: '2026-04-04', hidden: false },
  { id: 2447, title: '교정 브라켓 탈락 시 응급 대처법', board: '질문게시판', author: '윤도현', views: 345, comments: 18, likes: 25, reports: 0, date: '2026-04-03', hidden: false },
  { id: 2446, title: '레진 vs 세라믹 인레이 가격 차이 질문', board: '질문게시판', author: '강민지', views: 289, comments: 15, likes: 11, reports: 0, date: '2026-04-03', hidden: false },
  { id: 2445, title: '부정확한 의료 정보 유포 게시글', board: '치과게시판', author: '익명사용자', views: 89, comments: 1, likes: 0, reports: 5, date: '2026-04-03', hidden: false },
];

const mockReports: Report[] = [
  { id: 1, postId: 2456, postTitle: '임플란트 시술 후 통증이 계속되는데 정상인가요?', reason: '부적절한 의료 정보', reporter: '치과의사A', reportDate: '2026-04-06 14:20', status: '대기' },
  { id: 2, postId: 2449, postTitle: '불법 시술 광고하는 게시글입니다 (신고)', reason: '불법 광고/스팸', reporter: '김서연', reportDate: '2026-04-05 09:15', status: '대기' },
  { id: 3, postId: 2449, postTitle: '불법 시술 광고하는 게시글입니다 (신고)', reason: '허위/사기 정보', reporter: '박지훈', reportDate: '2026-04-05 10:30', status: '대기' },
  { id: 4, postId: 2448, postTitle: '치아미백 집에서 하는 방법 공유해요~', reason: '위험한 시술 방법 공유', reporter: '치과의사B', reportDate: '2026-04-04 16:45', status: '대기' },
  { id: 5, postId: 2452, postTitle: '스케일링 주기 어떻게 하시나요?', reason: '욕설/비방 댓글 포함', reporter: '이하은', reportDate: '2026-04-04 11:00', status: '처리완료' },
  { id: 6, postId: 2445, postTitle: '부정확한 의료 정보 유포 게시글', reason: '부정확한 의료 정보 유포', reporter: '관리자', reportDate: '2026-04-03 15:20', status: '대기' },
  { id: 7, postId: 2445, postTitle: '부정확한 의료 정보 유포 게시글', reason: '허위 의료 정보', reporter: '최유진', reportDate: '2026-04-03 17:00', status: '처리완료' },
];

const boardTabs: Board[] = ['전체', '질문게시판', '자유게시판', '치과게시판'];

const boardColors: Record<string, string> = {
  질문게시판: 'bg-blue-100 text-blue-700',
  자유게시판: 'bg-green-100 text-green-700',
  치과게시판: 'bg-purple-100 text-purple-700',
};

export default function AdminCommunityPage() {
  const [activeBoard, setActiveBoard] = useState<Board>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesBoard = activeBoard === '전체' || post.board === activeBoard;
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBoard && matchesSearch;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / postsPerPage));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  // Select/deselect
  const toggleSelectPost = (id: number) => {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPosts.length === paginatedPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(paginatedPosts.map((p) => p.id));
    }
  };

  // Bulk delete
  const handleBulkDelete = () => {
    if (selectedPosts.length === 0) return;
    if (confirm(`선택한 ${selectedPosts.length}개의 게시글을 삭제하시겠습니까?`)) {
      setPosts((prev) => prev.filter((p) => !selectedPosts.includes(p.id)));
      setSelectedPosts([]);
    }
  };

  // Single actions
  const handleHidePost = (id: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p))
    );
  };

  const handleDeletePost = (id: number) => {
    if (confirm('이 게시글을 삭제하시겠습니까?')) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Process report
  const handleProcessReport = (reportId: number) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: '처리완료' as ReportStatus } : r))
    );
  };

  // Stats
  const totalPosts = 2456;
  const todayNew = 34;
  const reportedCount = 12;
  const deletedCount = 89;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">커뮤니티 관리</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-[#7C3AED]" />
            <span className="text-sm text-gray-500">전체 게시글</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPosts.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={16} className="text-blue-500" />
            <span className="text-sm text-gray-500">오늘 신규</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayNew}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm text-gray-500">신고접수</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{reportedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Trash2 size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">삭제된 글</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{deletedCount}</p>
        </div>
      </div>

      {/* Board Filter Tabs + Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {boardTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveBoard(tab);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  activeBoard === tab
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="제목/내용 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] w-72"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedPosts.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-lg">
            <span className="text-sm text-[#7C3AED] font-medium">
              {selectedPosts.length}개 선택됨
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 size={14} />
              일괄 삭제
            </button>
          </div>
        )}

        {/* Posts Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-[#7C3AED]">
                    {selectedPosts.length === paginatedPosts.length && paginatedPosts.length > 0 ? (
                      <CheckSquare size={18} className="text-[#7C3AED]" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">번호</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">제목</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">게시판</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">작성자</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">조회수</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">댓글수</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">좋아요</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">신고수</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">작성일</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPosts.map((post) => (
                <tr
                  key={post.id}
                  className={`transition-colors ${
                    post.reports > 0
                      ? 'bg-red-50 hover:bg-red-100/70'
                      : post.hidden
                      ? 'bg-gray-50 opacity-60 hover:opacity-80'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSelectPost(post.id)}
                      className="text-gray-400 hover:text-[#7C3AED]"
                    >
                      {selectedPosts.includes(post.id) ? (
                        <CheckSquare size={18} className="text-[#7C3AED]" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{post.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[280px] truncate font-medium">
                    {post.hidden && (
                      <span className="inline-block mr-1 px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] rounded">
                        숨김
                      </span>
                    )}
                    {post.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        boardColors[post.board]
                      }`}
                    >
                      {post.board}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{post.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center">{post.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center">{post.comments}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center">{post.likes}</td>
                  <td className="px-4 py-3 text-center">
                    {post.reports > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <Flag size={10} />
                        {post.reports}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{post.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        title="보기"
                        className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-purple-50 rounded-md transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title={post.hidden ? '숨김 해제' : '숨김'}
                        onClick={() => handleHidePost(post.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          post.hidden
                            ? 'text-orange-500 hover:bg-orange-50'
                            : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                        }`}
                      >
                        <EyeOff size={15} />
                      </button>
                      <button
                        title="삭제"
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            총 {filteredPosts.length}건 중 {(currentPage - 1) * postsPerPage + 1}-
            {Math.min(currentPage * postsPerPage, filteredPosts.length)}건
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  currentPage === page
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Report Management Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">신고 관리</h3>
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              {reports.filter((r) => r.status === '대기').length}건 대기중
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500">게시글 번호</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">게시글 제목</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">신고 사유</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">신고자</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">신고일</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 text-center">처리상태</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-[#7C3AED] font-medium">#{report.postId}</td>
                  <td className="px-5 py-3 text-sm text-gray-900 max-w-[240px] truncate">
                    {report.postTitle}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{report.reason}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{report.reporter}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{report.reportDate}</td>
                  <td className="px-5 py-3 text-center">
                    {report.status === '대기' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        <Clock size={10} />
                        대기
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle size={10} />
                        처리완료
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {report.status === '대기' ? (
                      <button
                        onClick={() => handleProcessReport(report.id)}
                        className="px-3 py-1.5 bg-[#7C3AED] text-white text-xs rounded-lg hover:bg-[#6D28D9] transition-colors"
                      >
                        처리하기
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">처리됨</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report Pagination */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100">
          <p className="text-sm text-gray-500">총 {reports.length}건</p>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 rounded-lg text-sm bg-[#7C3AED] text-white">1</button>
            <button className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors" disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
