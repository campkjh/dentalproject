'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

function SelectionPreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={imageRef} alt={file.name} onError={() => setFailed(true)} className={failed ? 'hidden' : 'h-full w-full object-contain'} />
    {failed && <span className="flex h-full items-center p-2 text-xs text-[#D14343]">미리보기 불가 · 이미지 형식을 확인해주세요.</span>}
  </div>;
}

/** Show the selected files immediately and upload them without a second confirmation. */
export default function ProductImagePicker({ label, className, disabled, uploading, room, onUpload, onSelectionChange }: {
  label: string;
  className: string;
  disabled: boolean;
  uploading: boolean;
  room: number;
  onUpload: (files: File[]) => Promise<File[]>;
  onSelectionChange: (count: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const revealSelection = useRef(false);
  const working = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [selected, setSelected] = useState<{ id: string; file: File }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!selected.length || !revealSelection.current) return;
    const frame = requestAnimationFrame(() => {
      revealSelection.current = false;
      previewRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  const changeSelection = (next: typeof selected) => {
    setSelected(next);
    onSelectionChange(next.length);
  };
  const uploadSelection = async (items: typeof selected) => {
    if (working.current || !items.length) return;
    if (items.length > room) {
      setError(`추가할 수 있는 사진은 ${room}장이에요. 초과한 사진을 제외해주세요.`);
      return;
    }
    working.current = true;
    setError('');
    try {
      const failed = await onUpload(items.map(item => item.file));
      if (!mounted.current) return;
      changeSelection(items.filter(item => failed.includes(item.file)));
      if (failed.length) setError('일부 사진을 올리지 못했어요. 이미지 형식·25MB 제한·네트워크 연결을 확인하고 다시 시도해주세요.');
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : '사진을 올리지 못했어요. 다시 시도해주세요.');
    } finally {
      working.current = false;
    }
  };
  return <>
    {room > 0 && <button type="button" className={className}
      disabled={disabled} aria-label={label} onClick={() => inputRef.current?.click()}>
      {uploading ? '올리는 중…' : <><Plus size={20} />{label}</>}
    </button>}
    <input ref={inputRef} hidden type="file" multiple accept="image/*" disabled={disabled}
      onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = '';
        if (files.length) {
          const items = files.map(file => ({ id: crypto.randomUUID(), file }));
          revealSelection.current = true;
          changeSelection(items);
          void uploadSelection(items);
        }
      }} />
    {selected.length > 0 && <div ref={previewRef} className="flex scroll-mt-4 flex-col gap-3 rounded-2xl bg-[#EFF5FE] p-3" aria-live="polite">
      <p className="text-sm font-semibold">{label} · {uploading ? '사진 업로드 중' : '업로드 대기'} {selected.length}장</p>
      <p className="text-xs text-[#6B7684]">선택한 사진을 자동으로 올립니다. 완료되면 등록된 사진에 표시돼요.</p>
      {selected.map(item => <div key={item.id} className="flex items-center gap-3">
        <SelectionPreview file={item.file} />
        <span className="min-w-0 flex-1 break-all text-xs">{item.file.name}</span>
        <button type="button" className="shrink-0 rounded-lg px-2 py-2 text-sm text-[#6B7684] disabled:opacity-50" disabled={disabled} aria-label={`${item.file.name} 선택 취소`}
          onClick={() => changeSelection(selected.filter(candidate => candidate.id !== item.id))}>제외</button>
      </div>)}
      {selected.length > room && <p className="text-sm text-[#D14343]">최대 등록 수를 초과했어요. {selected.length - room}장을 제외해주세요.</p>}
      {error && <p role="alert" className="text-sm text-[#D14343]">{error}</p>}
      {!uploading && <div className="flex gap-3">
        <button type="button" className="rounded-xl bg-white px-3 py-3 text-sm font-semibold disabled:opacity-50" disabled={disabled} onClick={() => { changeSelection([]); setError(''); }}>선택 취소</button>
        <button type="button" className="rounded-xl bg-[#4A82EE] px-3 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={disabled || selected.length > room}
          onClick={() => void uploadSelection(selected)}>업로드 다시 시도</button>
      </div>}
    </div>}
  </>;
}
