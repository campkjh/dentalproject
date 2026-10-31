'use client';

// 로그인 필요 화면 — 최신 톤(261031): 회색 둥근 칸 안 토스 흑백 자물쇠 · 19 굵은 제목 · 15 회색 부제 ·
// 연파랑 면 + 파랑 굵은 글자 버튼(예약내역 빈 화면과 같은 결). 누르면 로그인 시트(dental:login)를 연다.
import MonoIcon from './MonoIcon';

export default function LoginRequired({
  title = '로그인이 필요해요',
  sub = '로그인하면 포켓·예약내역·포인트를 한곳에서 볼 수 있어요',
}: {
  title?: string;
  sub?: string;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-220px)] flex-col items-center justify-center px-6 py-10 text-center pc:min-h-[60vh]">
      <span className="qd-a-item flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#F2F4F6]">
        <MonoIcon name="lock" size={34} color="#B0B8C1" />
      </span>
      <p className="qd-a-item mt-5 break-keep text-[19px] font-bold tracking-[-0.4px] text-[#191F28]" style={{ animationDelay: '.06s' }}>{title}</p>
      <p className="qd-a-item mt-1.5 break-keep text-[15px] leading-[1.6] tracking-[-0.2px] text-[#8B95A1]" style={{ animationDelay: '.12s' }}>{sub}</p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('dental:login'))}
        className="qd-a-item mt-5 inline-flex h-[46px] items-center rounded-[12px] bg-[#E8F3FF] px-5 text-[16px] font-bold tracking-[-0.3px] text-[#3180F7] transition active:scale-[0.97] active:bg-[#DCEBFF]"
        style={{ animationDelay: '.18s' }}
      >
        로그인 / 회원가입
      </button>
    </div>
  );
}
