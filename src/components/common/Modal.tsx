'use client';

import { useStore } from '@/store';
import CommunityModal from '@/components/community/CommunityModal';
import styles from './app-ui.module.css';

export default function Modal() {
  const modal = useStore(s => s.modal);
  const hide = useStore(s => s.hideModal);
  if (!modal) return null;
  const cancel = () => { modal.onCancel?.(); hide(); };
  return <CommunityModal label={modal.title} variant="alert" onClose={cancel}>
    <h2 className={styles.alertTitle}>{modal.title}</h2>
    {modal.message && <p className={styles.alertMessage}>{modal.message}</p>}
    <div className={styles.alertActions}>
      {!modal.singleButton && <button type="button" className={styles.secondaryButton} onClick={cancel}>{modal.cancelText || '취소'}</button>}
      <button type="button" className={styles.primaryButton} onClick={() => { modal.onConfirm?.(); hide(); }}>{modal.confirmText || '확인'}</button>
    </div>
  </CommunityModal>;
}
