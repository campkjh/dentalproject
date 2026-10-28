'use client';

import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from './app-ui.module.css';
import { DetailPanelBackContext } from './detail-panel-context';

interface TopBarProps {
  title?: string;
  titleNode?: React.ReactNode;
  showBack?: boolean;
  rightContent?: React.ReactNode;
  transparent?: boolean;
}

export default function TopBar({ title, titleNode, showBack = true, rightContent, transparent = false }: TopBarProps) {
  const router = useRouter();
  const closePanel = useContext(DetailPanelBackContext);

  return (
    <header className={`${styles.topbar} ${closePanel ? styles.panelTopbar : ''} ${transparent ? styles.transparent : ''}`}>
      <div className={styles.topbarMain}>
        {showBack && (
          <button type="button" onClick={() => {
            if (closePanel) closePanel();
            else router.back();
          }} className={styles.iconButton} aria-label="뒤로 가기" title="뒤로 가기">
            <ChevronLeft size={24} />
          </button>
        )}
        {titleNode
          ? titleNode
          : title && <h1>{title}</h1>}
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </header>
  );
}
