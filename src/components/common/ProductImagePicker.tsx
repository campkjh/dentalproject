'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

function SelectionPreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <img ref={imageRef} alt={file.name} className="h-20 w-20 rounded-xl object-contain bg-white" />; // eslint-disable-line @next/next/no-img-element
}

/** Review only the files returned by this picker before adding them to the product. */
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
  const working = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [selected, setSelected] = useState<{ id: string; file: File }[]>([]);
  const changeSelection = (next: typeof selected) => {
    setSelected(next);
    onSelectionChange(next.length);
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
        // Cancel preserves the current selection; a new selection replaces the staged batch.
        if (files.length) changeSelection(files.map(file => ({ id: crypto.randomUUID(), file })));
      }} />
    {selected.length > 0 && <div className="flex flex-col gap-3 rounded-2xl bg-[#EFF5FE] p-3" aria-live="polite">
      <p className="text-sm font-semibold">{label} · 선택한 사진 {selected.length}장</p>
      <p className="text-xs text-[#6B7684]">아래 사진만 추가합니다. 기존 사진은 삭제 버튼으로 뺄 수 있어요.</p>
      {selected.map(item => <div key={item.id} className="flex items-center gap-3">
        <SelectionPreview file={item.file} />
        <span className="min-w-0 flex-1 break-all text-xs">{item.file.name}</span>
        <button type="button" className="shrink-0 rounded-lg px-2 py-2 text-sm text-[#6B7684] disabled:opacity-50" disabled={disabled} aria-label={`${item.file.name} 선택 취소`}
          onClick={() => changeSelection(selected.filter(candidate => candidate.id !== item.id))}>제외</button>
      </div>)}
      {selected.length > room && <p className="text-sm text-[#D14343]">최대 등록 수를 초과했어요. {selected.length - room}장을 제외해주세요.</p>}
      <div className="flex gap-3">
        <button type="button" className="rounded-xl bg-white px-3 py-3 text-sm font-semibold disabled:opacity-50" disabled={disabled} onClick={() => changeSelection([])}>선택 취소</button>
        <button type="button" className="rounded-xl bg-[#4A82EE] px-3 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={disabled || selected.length > room}
          onClick={async () => {
            if (working.current) return;
            working.current = true;
            try {
              const failed = await onUpload(selected.map(item => item.file));
              if (mounted.current) changeSelection(selected.filter(item => failed.includes(item.file)));
            } finally { working.current = false; }
          }}>{uploading ? '올리는 중…' : `선택한 ${selected.length}장 올리기`}</button>
      </div>
    </div>}
  </>;
}
