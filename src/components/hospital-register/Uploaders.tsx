'use client';

// 병원 신청 서류·프로필 사진 올리기 — 업로드 흐름(/api/upload · folder)은 옛 화면 그대로, 겉모습만 선택 카드 결로.
import { useRef, useState } from 'react';
import { rgCx as cx, rgStyles as s } from './RegisterKit';

function UploadIcon({ color = '#828E9B' }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#3180F7" />
      <path d="m7.5 12.3 3 3 6-6.3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 서류 한 줄 — 올리면 파랑 테두리 카드로 바뀌고 파일 이름이 보인다 */
export function DocUploadRow({
  title,
  desc,
  required,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    setError(null);
    setFileName(f.name);
    try {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('folder', 'hospital-docs');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) {
        setError(payload.error || '업로드 실패');
        setFileName(null);
        return;
      }
      onChange(payload.url);
    } catch {
      setError('업로드 실패');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  };

  const uploaded = !!value;
  const display = fileName || (value ? value.split('/').pop() : null);
  return (
    <label htmlFor={`doc-${title}`} className={cx(s.opt, s.tall, uploaded && s.on)}>
      <input
        ref={inputRef}
        id={`doc-${title}`}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={handleFile}
      />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F2F4F6]">
        {uploaded && !uploading ? <DoneIcon /> : <UploadIcon />}
      </span>
      <span className={s.optT}>
        <span className="block break-keep">
          {title}
          {required && <span className={s.req} aria-label="필수">*</span>}
        </span>
        <span className={cx(s.optHint, 'truncate', error && '!text-[#F04452]')}>
          {uploading ? '올리는 중…' : error ? error : uploaded ? display : desc}
        </span>
      </span>
      {uploaded && !uploading && (
        <button type="button" onClick={handleReset} className="flex-none rounded-[10px] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#3180F7]">
          다시 올리기
        </button>
      )}
    </label>
  );
}

/** 원장 프로필 사진 — 동그라미 112 + 파랑 연필 단추 */
export function ProfilePhotoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'doctor-profiles');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) {
        setError(payload.error || '업로드에 실패했어요.');
        return;
      }
      onChange(payload.url);
    } catch {
      setError('업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center pb-2 pt-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#F2F4F6] transition-transform active:scale-95 disabled:opacity-60"
        aria-label="프로필 사진 올리기"
      >
        <span className="absolute inset-0 overflow-hidden rounded-full">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="프로필 사진" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="#B0B8C1" strokeWidth="1.8" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#B0B8C1" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#3180F7]">
          <UploadIcon color="#fff" />
        </span>
      </button>
      <p className="mt-3 text-[15px] font-semibold text-[#333D4B]">
        {uploading ? '올리는 중…' : value ? '프로필 사진 바꾸기' : '프로필 사진 추가'}
      </p>
      <p className="mt-0.5 text-[13px] text-[#8B95A1]">정면 얼굴이 잘 보이는 사진이 좋아요</p>
      {value && (
        <button type="button" onClick={() => onChange('')} className="mt-2 text-[13px] text-[#8B95A1] underline underline-offset-2">
          사진 지우기
        </button>
      )}
      {error && <p className="mt-2 text-[13px] text-[#F04452]">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
