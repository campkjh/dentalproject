'use client';

import { useStore } from '@/store';

export default function Modal() {
  const { modal, hideModal } = useStore();

  if (!modal) return null;

  const isSingle = modal.singleButton === true;
  const confirmLabel = modal.confirmText ?? (isSingle ? '확인' : '네');
  const cancelLabel = modal.cancelText ?? '아니요';
  const hasMessage = modal.message && modal.message.trim().length > 0;

  const handleConfirm = () => {
    modal.onConfirm?.();
    hideModal();
  };

  const handleCancel = () => {
    modal.onCancel?.();
    hideModal();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 modal-overlay-enter"
      onClick={handleCancel}
      role="presentation"
    >
      <div
        className="modal-content-enter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        style={{
          width: 340,
          minHeight: 160,
          borderRadius: 24,
          backgroundColor: '#FFFFFF',
          paddingTop: 18,
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 18px 60px rgba(15, 23, 42, 0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Text area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 12px 14px',
            marginTop: -4,
          }}
        >
          <h3
            id="app-modal-title"
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#2B313D',
              textAlign: 'left',
              lineHeight: '26px',
              fontFamily: 'inherit',
              margin: 0,
            }}
          >
            {modal.title}
          </h3>
          {hasMessage && (
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: '#51535C',
                textAlign: 'left',
                lineHeight: '20px',
                fontFamily: 'inherit',
                margin: 0,
              }}
            >
              {modal.message}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#8037FF',
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'inherit',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
          {!isSingle && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#F2F3F5',
                color: '#51535C',
                fontSize: 18,
                fontWeight: 600,
                fontFamily: 'inherit',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
