import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">로그인 오류</h1>
        <p className="text-sm text-gray-500 mb-6">
          인증에 실패했습니다. 다시 시도해 주세요.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-[#7C3AED] text-white rounded-xl text-sm font-bold"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
