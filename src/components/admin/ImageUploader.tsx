'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';

export function ImageUploader({
  value,
  onChange,
  folder = 'admin',
  placeholder = '이미지를 업로드해 주세요',
  aspect = '2/1',
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  aspect?: '1/1' | '2/1' | '4/3' | '16/9';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.url) {
        setError(payload.error || '업로드에 실패했어요.');
        return;
      }
      onChange(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-[12px] border border-[#E5E8EB] bg-[#F9FAFB]"
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="이미지 제거"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex flex-col items-center justify-center text-[#8B95A1] hover:bg-[#F2F4F6] transition-colors disabled:opacity-50"
          >
            <Upload size={20} className="mb-1.5" />
            <span className="text-[12px] font-semibold">
              {uploading ? '업로드 중…' : placeholder}
            </span>
            <span className="text-[11px] mt-0.5 text-[#C9CDD2]">클릭해서 파일 선택</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-9 px-3.5 bg-white border border-[#E5E8EB] rounded-[10px] text-[12px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB] disabled:opacity-50"
        >
          {uploading ? '업로드 중…' : value ? '이미지 변경' : '이미지 선택'}
        </button>
        {value && (
          <span className="text-[11px] text-[#8B95A1] truncate">{value.split('/').pop()}</span>
        )}
      </div>
      {error && <p className="text-[11px] text-[#E54848]">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
