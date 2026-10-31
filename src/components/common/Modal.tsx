'use client';

// 알림창·확인창 — 프리티풀 모달 결(261031): 위에 토스 컬러 아이콘이 톡 튀어나오고 · 제목 20 굵게 · 설명 15 회색 ·
// 버튼 56 · 모서리 17 · 17 굵게. 아이콘은 제목으로 고른다(실패·취소=빨강 · 확인 필요=노랑 · 완료=파랑 체크 · 그 밖=파랑 안내).
import { useStore } from '@/store';
import CommunityModal from '@/components/community/CommunityModal';
import styles from './app-ui.module.css';

function alertIcon(title: string) {
  if (/실패|못했|못 했|오류|에러|거부|없어요|만료/.test(title)) return '/icons/color/warning-red.svg';
  if (/취소|삭제|나가|탈퇴|정말|확인해/.test(title)) return '/icons/color/exclamation-yellow.svg';
  if (/됐|되었|완료|했어요|했습니다|성공/.test(title)) return '/icons/color/check-circle.svg';
  return '/icons/color/info-blue.svg';
}

export default function Modal() {
  const modal = useStore(s => s.modal);
  const hide = useStore(s => s.hideModal);
  if (!modal) return null;
  const cancel = () => { modal.onCancel?.(); hide(); };
  return <CommunityModal label={modal.title} variant="alert" onClose={cancel}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={alertIcon(modal.title)} alt="" width={44} height={44} className={styles.alertIcon} />
    <h2 className={styles.alertTitle}>{modal.title}</h2>
    {modal.message && <p className={styles.alertMessage}>{modal.message}</p>}
    <div className={styles.alertActions}>
      {!modal.singleButton && <button type="button" className={styles.alertSecondary} onClick={cancel}>{modal.cancelText || '취소'}</button>}
      <button type="button" className={styles.alertPrimary} onClick={() => { modal.onConfirm?.(); hide(); }}>{modal.confirmText || '확인'}</button>
    </div>
  </CommunityModal>;
}
