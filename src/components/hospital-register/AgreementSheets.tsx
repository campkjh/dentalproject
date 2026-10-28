'use client';

// 병원 신청 약관 시트 — 한 장 보기(AgreementSheet) · '모두 동의' 차례 읽기 + 서명(SequentialAgreeFlow).
//  · 동작(끝까지 스크롤해야 동의 · 0.55초 체크 연출 · 서명/직인)은 옛 화면 그대로, 겉모습만 프리티풀 .ft-sheet 결로.
//  · 열림·닫힘·Esc·안드로이드 뒤로가기는 예약 흐름 FlowKit.useFlowSheet 를 그대로 쓴다(닫힐 때도 스르르).
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useFlowSheet } from '@/components/booking/FlowKit';
import type { AgreementItem, AgreementTable } from './agreements';
import { RgCta, rgCx as cx, rgStyles as s } from './RegisterKit';

const stripPrefix = (label: string) => label.replace(/^\(필수\)\s*|^\(선택\)\s*/, '');

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), 0); return () => clearTimeout(t); }, []);
  return m;
}

export function AgreementTables({ tables }: { tables?: AgreementTable[] }) {
  if (!tables || tables.length === 0) return null;
  return (
    <div className="mt-5 space-y-5">
      {tables.map((t, i) => (
        <div key={i}>
          {t.title && <p className="mb-2 text-[14px] font-semibold text-[#333D4B]">{t.title}</p>}
          <div className="overflow-x-auto rounded-[12px] border border-[#E5E8EB]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#E5E8EB] bg-[#F7F8FA]">
                  {t.headers.map((h, hi) => (
                    <th key={hi} className="px-2.5 py-2 text-left font-semibold text-[#6B7684]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr key={ri} className={ri < t.rows.length - 1 ? 'border-b border-[#F2F4F6]' : ''}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2.5 py-2 align-top text-[#4E5968]">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 약관 한 장 보기 — 아래 '동의하고 계속하기' */
export function AgreementSheet({ item, onClose, onAgree }: { item: AgreementItem; onClose: () => void; onAgree: () => void }) {
  const { out, close } = useFlowSheet(onClose);
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <div className={cx(s.scrim, out && s.out)} onClick={() => close()}>
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={stripPrefix(item.label)} onClick={(e) => e.stopPropagation()}>
        <div className={s.grab} />
        <div className={s.sheetHead}>
          <h3 className={s.sheetTitle}>{stripPrefix(item.label)}</h3>
          <button type="button" className={s.sheetClose} onClick={() => close()} aria-label="닫기"><CloseIcon /></button>
        </div>
        <div className={s.sheetBody}>
          <p className={s.legal}>{item.body}</p>
          <AgreementTables tables={item.tables} />
        </div>
        <div className={s.sheetFoot}>
          <RgCta onClick={() => close(onAgree)}>{item.required ? '동의하고 계속하기' : '동의합니다'}</RgCta>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** '모두 동의' — 약관을 한 장씩 끝까지 읽고 동의 → 마지막에 서명/직인 */
export function SequentialAgreeFlow({
  items,
  existingSignature,
  onClose,
  onComplete,
}: {
  items: AgreementItem[];
  existingSignature: string | null;
  onClose: () => void;
  onComplete: (signedIds: string[], signatureDataUrl: string | null) => void;
}) {
  const { out, close } = useFlowSheet(onClose);
  const mounted = useMounted();
  const totalSteps = items.length + 1; // +1 = 서명 단계
  const [stepIdx, setStepIdx] = useState(0);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [signedIds, setSignedIds] = useState<string[]>([]);
  const [sigUrl, setSigUrl] = useState<string | null>(existingSignature);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSignatureStep = stepIdx >= items.length;
  const currentItem = isSignatureStep ? null : items[stepIdx];
  const currentNumber = stepIdx + 1;
  const progressPct = (currentNumber / totalSteps) * 100;

  const checkReachedBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const notScrollable = el.scrollHeight <= el.clientHeight + 12;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    if (notScrollable || atBottom) setReachedBottom(true);
  };

  // 단계가 바뀌면 다시 확인 — 짧은 약관은 바로 버튼이 켜진다
  useEffect(() => {
    if (isSignatureStep) return;
    const resetTimer = setTimeout(() => setReachedBottom(false), 0);
    const t = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const notScrollable = el.scrollHeight <= el.clientHeight + 12;
      if (notScrollable) setReachedBottom(true);
    }, 60);
    return () => {
      clearTimeout(resetTimer);
      clearTimeout(t);
    };
  }, [stepIdx, isSignatureStep, mounted]);

  const resetScroll = () => {
    setReachedBottom(false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
    });
  };

  const [justChecked, setJustChecked] = useState(false);

  const handleAgree = () => {
    if (!currentItem || justChecked) return;
    setJustChecked(true);
    setTimeout(() => {
      const next = [...signedIds, currentItem.id];
      setSignedIds(next);
      setStepIdx(stepIdx + 1);
      setJustChecked(false);
      resetScroll();
    }, 550);
  };

  const handleFinalSubmit = () => {
    if (!sigUrl) return;
    const ids = signedIds;
    const url = sigUrl;
    close(() => onComplete(ids, url));
  };

  if (!mounted) return null;
  return createPortal(
    <div className={cx(s.scrim, out && s.out)}>
      <div className={cx(s.sheet, s.tallSheet)} role="dialog" aria-modal="true" aria-label="약관 동의">
        <div className={s.grab} />
        <div className="flex-none px-6 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex-none text-[13px] font-medium tabular-nums text-[#8B95A1]">
              <b className="font-semibold text-[#3180F7]">{currentNumber}</b> / {totalSteps}
            </span>
            <h3 className="m-0 flex-1 text-[17px] font-semibold text-[#191F28]">{isSignatureStep ? '서명 및 직인' : '필수 약관 확인'}</h3>
            <button type="button" className={s.sheetClose} onClick={() => close()} aria-label="닫기"><CloseIcon /></button>
          </div>
          <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-[#F2F4F6]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#3180F7]"
              style={{ width: `${progressPct}%`, transition: 'width 380ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </div>
        </div>

        {isSignatureStep ? (
          <SignatureStep onChange={setSigUrl} initial={sigUrl} />
        ) : (
          <div ref={scrollRef} onScroll={checkReachedBottom} className={s.sheetBody}>
            <h4 key={stepIdx} className="qd-a-title mb-3 mt-2 text-[20px] font-semibold leading-[1.4] tracking-[-0.4px] text-[#191F28]">
              {currentItem ? stripPrefix(currentItem.label) : ''}
            </h4>
            <p className={s.legal}>{currentItem?.body}</p>
            <AgreementTables tables={currentItem?.tables} />
            <div className="mb-2 mt-6 border-t border-dashed border-[#E5E8EB] py-3 text-center text-[12px] text-[#B0B8C1]">— 약관 끝 —</div>
          </div>
        )}

        <div className={s.sheetFoot}>
          {!isSignatureStep && !reachedBottom && (
            <p className="mb-2 text-center text-[13px] text-[#8B95A1]">아래까지 내려서 약관을 모두 확인해 주세요</p>
          )}
          {isSignatureStep ? (
            <RgCta disabled={!sigUrl} onClick={handleFinalSubmit}>제출하고 완료하기</RgCta>
          ) : (
            <button
              type="button"
              disabled={!reachedBottom || justChecked}
              onClick={handleAgree}
              className={`qd-cta agree-btn ${justChecked ? 'is-checked' : ''}`}
              style={justChecked ? ({ background: '#3180F7', color: '#fff' } as CSSProperties) : undefined}
            >
              <span className="agree-btn-inner">
                <span className="agree-btn-check" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <path d="M5 12l4.8 4.8L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="agree-btn-label">
                  <span className="agree-btn-label-pre">동의합니다</span>
                  <span className="agree-btn-label-post">동의 완료</span>
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 서명 칸 — 손가락/마우스로 그리기 + 직인 이미지(선택) */
function SignatureStep({ onChange, initial }: { onChange: (dataUrl: string | null) => void; initial: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!!initial);
  const [sealPreview, setSealPreview] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#191F28';
    }
    if (initial) {
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initial;
    }
  }, [initial]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getPoint(e);
    if (!p) return;
    drawing.current = true;
    lastPoint.current = p;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const p = getPoint(e);
    if (!ctx || !p || !lastPoint.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    if (!hasDrawn) setHasDrawn(true);
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasDrawn(false);
      setSealPreview(null);
      onChange(null);
    }
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSealPreview(dataUrl);
      setHasDrawn(true);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={s.sheetBody}>
      <p className="qd-a-title mb-5 mt-2 text-[15px] leading-[1.6] text-[#4E5968]">
        모든 약관을 확인했어요. 신청을 마치려면 아래에 직접 서명하거나 병원 직인 이미지를 올려 주세요.
      </p>

      <div className="mb-2 flex items-center justify-between">
        <p className={s.label} style={{ margin: 0 }}>서명</p>
        <button type="button" onClick={handleClear} className="text-[13px] font-semibold text-[#6B7684]">다시 쓰기</button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: '100%',
            height: 180,
            backgroundColor: '#F7F8FA',
            border: '1.5px dashed #D1D6DB',
            borderRadius: 16,
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        />
        {!hasDrawn && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-[14px] text-[#B0B8C1]">이곳에 서명해 주세요</p>
          </div>
        )}
        {sealPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sealPreview} alt="직인" className="absolute right-2 top-2 h-16 w-16 rounded-[10px] border border-[#E5E8EB] bg-white object-contain" />
        )}
      </div>

      <div className="mt-6">
        <p className={s.label}>직인 이미지 <span className="font-normal text-[#8B95A1]">(선택)</span></p>
        <label className={cx(s.opt, sealPreview && s.on)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" stroke="#828E9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" stroke="#828E9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={s.optT} style={{ fontSize: 16 }}>{sealPreview ? '직인 이미지 바꾸기' : '직인·인감 이미지 올리기'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleSealUpload} />
        </label>
        {sealPreview && <p className={s.hint}>직인 이미지가 첨부됐어요.</p>}
      </div>

      <p className={s.note}>
        본 서명은 전자서명법 제3조에 따라 당사자의 동의 의사로 간주됩니다. 서명 또는 직인 이미지는 제출일로부터 3년간 보관되며, 탈퇴 시 즉시 파기됩니다.
      </p>
    </div>
  );
}
