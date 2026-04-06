'use client';

import { useStore } from '@/store';

export default function Modal() {
  const { modal, hideModal } = useStore();

  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 modal-overlay-enter" onClick={hideModal}>
      <div
        className="modal-content-enter"
        style={{
          width: 340,
          height: 160,
          borderRadius: 24,
          backgroundColor: '#FFFFFF',
          paddingTop: 18,
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Text area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0, marginTop: -4 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: '#2B313D', textAlign: 'left', lineHeight: '26px' }}>
            {modal.title}
          </h3>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#51535C', textAlign: 'left', lineHeight: '20px' }}>
            {modal.message}
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { modal.onConfirm(); hideModal(); }}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#8037FF',
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            네
          </button>
          <button
            onClick={hideModal}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#F2F3F5',
              color: '#51535C',
              fontSize: 18,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            아니요
          </button>
        </div>
      </div>
    </div>
  );
}
