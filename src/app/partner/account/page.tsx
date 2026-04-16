'use client';

import { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

type NotifKey =
  | 'newConsult'
  | 'reservationChange'
  | 'eventApproval'
  | 'qaPending'
  | 'pointLow'
  | 'settlementReady'
  | 'marketing';

type NotifItem = {
  key: NotifKey;
  label: string;
  desc: string;
  channels: { push: boolean; sms: boolean; email: boolean };
};

const INITIAL_NOTIFS: NotifItem[] = [
  { key: 'newConsult', label: '신규 상담신청', desc: '고객이 상담을 신청했을 때 즉시 알림', channels: { push: true, sms: true, email: false } },
  { key: 'reservationChange', label: '예약 일정 변경', desc: '고객의 예약 변경·취소 요청', channels: { push: true, sms: false, email: true } },
  { key: 'eventApproval', label: '이벤트 승인 결과', desc: '승인/반려 결과 통보', channels: { push: true, sms: false, email: true } },
  { key: 'qaPending', label: 'Q&A 미답변 알림', desc: '12시간 경과 시 담당자에게 재알림', channels: { push: true, sms: true, email: false } },
  { key: 'pointLow', label: '포인트 잔액 부족', desc: '잔액이 50만 포인트 이하일 때', channels: { push: true, sms: false, email: true } },
  { key: 'settlementReady', label: '정산 완료 알림', desc: '주간 정산이 지급되었을 때', channels: { push: false, sms: false, email: true } },
  { key: 'marketing', label: '마케팅·공지 소식', desc: '파트너센터 업데이트 및 가이드', channels: { push: false, sms: false, email: true } },
];

export default function AccountPage() {
  const [tab, setTab] = useState<'profile' | 'password' | 'notifications'>('profile');
  const [email, setEmail] = useState('owner@okdental.co.kr');
  const [manager, setManager] = useState('이현수');
  const [pwCur, setPwCur] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConf, setPwConf] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>(INITIAL_NOTIFS);

  const updateChannel = (k: NotifKey, ch: 'push' | 'sms' | 'email', v: boolean) => {
    setNotifs((prev) =>
      prev.map((n) =>
        n.key === k ? { ...n, channels: { ...n.channels, [ch]: v } } : n
      )
    );
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-[18px] font-bold text-gray-900">계정 설정</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          파트너센터 로그인 계정과 알림 수신 설정을 관리합니다.
        </p>
      </div>

      <div className="flex gap-1">
        {(['profile', 'password', 'notifications'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold partner-pill"
            style={{
              backgroundColor: tab === t ? '#2B313D' : '#F4F5F7',
              color: tab === t ? '#fff' : '#51535C',
            }}
          >
            {t === 'profile' ? '프로필' : t === 'password' ? '비밀번호' : '알림 설정'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 partner-card">
          <Field label="아이디">
            <input
              value="okdental_admin"
              readOnly
              className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-500"
            />
            <p className="text-[11px] text-gray-400 mt-1">아이디는 수정할 수 없습니다.</p>
          </Field>
          <Field label="관리자 이름">
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] transition-colors"
            />
          </Field>
          <Field label="이메일">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] transition-colors"
            />
          </Field>
          <Field label="병원">
            <input
              value="오케이치과의원"
              readOnly
              className="w-full px-3 py-2.5 bg-gray-50 rounded-lg text-[13px] text-gray-500"
            />
          </Field>
          <div className="flex justify-end pt-2">
            <button className="px-5 py-2.5 rounded-lg bg-[#2B313D] text-white text-[13px] font-bold btn-press">
              저장
            </button>
          </div>
        </section>
      )}

      {tab === 'password' && (
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 partner-card">
          <div className="rounded-lg bg-[#FFF8E1] text-[11px] text-[#B45309] px-3 py-2 flex items-start gap-1.5">
            <Info size={11} className="mt-0.5 flex-shrink-0" />
            비밀번호는 최소 10자 이상, 영문·숫자·특수문자를 포함해야 합니다. 90일마다 변경을 권장합니다.
          </div>
          <Field label="현재 비밀번호">
            <PwInput value={pwCur} onChange={setPwCur} show={showPw} onToggle={() => setShowPw((v) => !v)} />
          </Field>
          <Field label="새 비밀번호">
            <PwInput value={pwNew} onChange={setPwNew} show={showPw} onToggle={() => setShowPw((v) => !v)} />
          </Field>
          <Field label="새 비밀번호 확인">
            <PwInput value={pwConf} onChange={setPwConf} show={showPw} onToggle={() => setShowPw((v) => !v)} />
            {pwNew && pwConf && pwNew !== pwConf && (
              <p className="text-[11px] text-red-500 mt-1">새 비밀번호가 일치하지 않습니다.</p>
            )}
          </Field>
          <div className="flex justify-end pt-2">
            <button
              disabled={!pwCur || !pwNew || pwNew !== pwConf}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold btn-press"
              style={{
                backgroundColor: pwCur && pwNew && pwNew === pwConf ? '#7C3AED' : '#E5E7EB',
                color: pwCur && pwNew && pwNew === pwConf ? '#fff' : '#A4ABBA',
              }}
            >
              비밀번호 변경
            </button>
          </div>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden partner-card">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">알림 유형</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[80px]">앱 푸시</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[80px]">SMS</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-[80px]">이메일</th>
                </tr>
              </thead>
              <tbody>
                {notifs.map((n) => (
                  <tr key={n.key} className="border-b border-gray-100 last:border-0 partner-row">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-gray-900">{n.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{n.desc}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Toggle on={n.channels.push} onToggle={() => updateChannel(n.key, 'push', !n.channels.push)} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Toggle on={n.channels.sms} onToggle={() => updateChannel(n.key, 'sms', !n.channels.sms)} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Toggle on={n.channels.email} onToggle={() => updateChannel(n.key, 'email', !n.channels.email)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 px-4 py-3 border-t border-gray-100">
            마케팅·공지 알림은 정보통신망법에 따른 광고성 정보로, 수신 거부 시에도 서비스 이용에 지장이 없습니다.
          </p>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PwInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-[#7C3AED] transition-colors"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100 text-gray-400"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-9 h-5 rounded-full"
      style={{
        backgroundColor: on ? '#7C3AED' : '#E5E7EB',
        transition: 'background-color 220ms ease',
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
        style={{ left: on ? 18 : 2, transition: 'left 240ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />
    </button>
  );
}
