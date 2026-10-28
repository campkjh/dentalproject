'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PullToRefresh from '@/components/common/PullToRefresh';
import { useStore } from '@/store';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { communityBoards, communityCategories, getWeeklyPopularPosts } from '@/lib/community';
import type { Post } from '@/types';
import CommunityPostCard from './CommunityPostCard';
import CommunityModal from './CommunityModal';
import CommunityComposer from './CommunityComposer';
import CommunityDetail, { CommunitySkeleton } from './CommunityDetail';
import { useCommunityPosts } from './useCommunityPosts';
import { categoryIcons, CloseIcon, CommentFillIcon, EyeFillIcon, HeartFillIcon, SearchIcon, SortArrowsIcon } from './StadyIcons';
import styles from './community.module.css';

const SORTS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'comments', label: '댓글순' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];
const PANEL_QUERY = '(min-width: 1024px)';
const SCROLL_KEY = 'community-scroll';

interface RailItem { key: string; label: string; icon: string; on: boolean; onSelect: () => void }

export default function CommunityFeed({ partner = false }: { partner?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const { posts, loading, error, refresh } = useCommunityPosts();
  const isDoctor = useStore(s => s.isDoctor);
  const user = useStore(s => s.user);
  const basePath = partner ? '/partner/community' : '/community';
  const [board, setBoard] = useState<Post['boardType']>('question');
  const [mine, setMine] = useState(false);
  const [category, setCategory] = useState(() => communityCategories.includes(params.get('category') || '') ? params.get('category')! : '전체');
  const [query, setQuery] = useState(params.get('q') || '');
  const [previousQuery, setPreviousQuery] = useState(params.get('q'));
  // 검색창은 펼치는 중·접히는 중에도 DOM 에 남아 있어야 전환이 보인다: mounted = 그려 둠, on = 펼친 모양
  const [searchMounted, setSearchMounted] = useState(params.has('q'));
  const [searchOn, setSearchOn] = useState(params.has('q'));
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<SortKey>('latest');
  const [sortOpen, setSortOpen] = useState(false);
  const [compose, setCompose] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [renderCount, setRenderCount] = useState(20);
  const renderMore = useRef<HTMLDivElement>(null);
  const scrollRestored = useRef(false);
  const [likes, setLikes] = useState<{ userId: string; ids: Set<string> }>({ userId: '', ids: new Set() });
  const likedIds = likes.userId === user?.id ? likes.ids : new Set<string>();
  const activeBoard = isDoctor ? board : 'question';
  const searchTerm = query.trim().toLocaleLowerCase();
  const popular = useMemo(() => getWeeklyPopularPosts(posts), [posts]);
  const visible = useMemo(() => posts.filter(post => {
    if (post.boardType !== activeBoard || (mine && post.authorId !== user?.id)) return false;
    if (category !== '전체' && !post.tags.includes(category)) return false;
    return !searchTerm || [post.title, post.content, post.isAnonymous ? '' : post.authorName, ...post.tags].join(' ').toLocaleLowerCase().includes(searchTerm);
  }).sort((a, b) => sort === 'popular' ? b.viewCount - a.viewCount : sort === 'comments' ? b.commentCount - a.commentCount : new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()), [posts, activeBoard, mine, user?.id, category, searchTerm, sort]);
  const showWeeklyTabs = category === '전체' && !searchTerm && activeBoard === 'question';

  // 전체 헤더 검색(?q=)이 바뀌면 이 화면 검색어도 따라간다
  if (previousQuery !== params.get('q')) {
    setPreviousQuery(params.get('q')); setQuery(params.get('q') || '');
    if (params.has('q')) { setSearchMounted(true); setSearchOn(true); }
  }
  // 필터가 바뀌면 처음 20개부터 다시 그린다
  const filterKey = `${activeBoard}|${category}|${searchTerm}|${mine}|${sort}`;
  const [previousFilter, setPreviousFilter] = useState(filterKey);
  if (previousFilter !== filterKey) { setPreviousFilter(filterKey); setRenderCount(20); }

  const postIds = posts.map(p => p.id).join(',');
  useEffect(() => {
    if (!user?.id || !postIds || !hasSupabaseEnv()) return;
    let cancelled = false;
    createClient().from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds.split(','))
      .then(({ data }) => { if (!cancelled) setLikes({ userId: user.id, ids: new Set((data ?? []).map(row => row.post_id)) }); });
    return () => { cancelled = true; };
  }, [postIds, user?.id]);
  // 스크롤을 내리면 상단바 뒤로 흰 그라데이션
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // 목록 끝 감시점이 보이기 800px 전부터 20개씩 더 그린다
  useEffect(() => {
    const element = renderMore.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setRenderCount(c => c + 20); }, { rootMargin: '800px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  });
  // 상세에서 돌아오면 저장해 둔 스크롤 자리로 복원(목록을 다 그려 높이를 확보한 뒤)
  useEffect(() => {
    if (scrollRestored.current || loading || posts.length === 0) return;
    scrollRestored.current = true;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(SCROLL_KEY); sessionStorage.removeItem(SCROLL_KEY); } catch { /* 저장소 막힘 */ }
    const y = saved ? parseInt(saved, 10) : 0;
    if (!y || Number.isNaN(y)) return;
    setRenderCount(500);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })));
  }, [loading, posts.length]);
  // 넓은 화면 패널: Esc 로 닫고, 창이 좁아지면 닫는다
  useEffect(() => {
    if (!selected) return;
    const keyboard = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setSelected(null); };
    const mq = window.matchMedia(PANEL_QUERY);
    const change = () => { if (!mq.matches) setSelected(null); };
    window.addEventListener('keydown', keyboard); mq.addEventListener('change', change);
    return () => { window.removeEventListener('keydown', keyboard); mq.removeEventListener('change', change); };
  }, [selected]);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  function openSearch() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearchMounted(true);
    // 접힌 모양으로 한 프레임 그린 뒤 펼쳐야 clip-path 전환이 돈다
    requestAnimationFrame(() => requestAnimationFrame(() => { setSearchOn(true); searchInput.current?.focus({ preventScroll: true }); }));
  }
  function closeSearch() {
    setSearchOn(false);
    searchInput.current?.blur();
    searchTimer.current = setTimeout(() => { setSearchMounted(false); setQuery(''); }, 520);
    if (params.has('q')) router.replace(basePath, { scroll: false });
  }
  function selectCategory(next: string) {
    setMine(false);
    setCategory(next);
  }
  function changeBoard(next: Post['boardType']) { setBoard(next); setCategory('전체'); setMine(false); }
  const open = useCallback((post: Post | string) => {
    const id = typeof post === 'string' ? post : post.id;
    if (window.matchMedia(PANEL_QUERY).matches) { setSelected(id); return; }
    try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* 저장소 막힘 */ }
    router.push(`${basePath}/${id}`);
  }, [router, basePath]);
  function write() {
    if (!user) { window.dispatchEvent(new CustomEvent('dental:login')); return; }
    setCompose(true);
  }
  function toggleMine() {
    if (!user) { window.dispatchEvent(new CustomEvent('dental:login')); return; }
    setMine(v => !v);
  }

  // 탭 레일 항목: (의사) 게시판 3개 → 칸막이 → 진료 카테고리
  const boardItems: RailItem[] = isDoctor ? communityBoards.map(item => ({ key: `b-${item.value}`, label: item.label.replace('게시판', ''), icon: item.icon, on: activeBoard === item.value, onSelect: () => changeBoard(item.value) })) : [];
  const categoryItems: RailItem[] = communityCategories.map(cat => ({ key: cat, label: cat, icon: categoryIcons[cat] || categoryIcons['전체'], on: category === cat, onSelect: () => selectCategory(cat) }));

  const searchField = (id: string) => <label className={styles.searchInline} htmlFor={id}>
    <SearchIcon size={19} />
    <input id={id} value={query} onChange={e => setQuery(e.target.value)} placeholder="무엇을 검색하실건가요?" aria-label="커뮤니티 검색" />
    {query && <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기"><CloseIcon /></button>}
  </label>;

  return <div className={styles.page}>
    <PullToRefresh onRefresh={refresh} disabled={Boolean(compose || commentPost || selected || loading)} />
    <header className={`${styles.topbar} pc:hidden`} data-scrolled={scrolled} data-searching={searchOn}>
      <div className={styles.topbarInner}>
        <div className={styles.titleWrap}><h1 className={styles.title}>커뮤니티</h1></div>
        {/* 모바일: 제목 대신 카테고리 탭이 헤더 한 줄 */}
        <div className={styles.mobileFilters}><TabRail boards={boardItems} items={categoryItems} /></div>
        {searchField('community-search-tablet')}
        <button type="button" className={styles.searchButton} onClick={() => searchOn ? closeSearch() : openSearch()} aria-label="커뮤니티 검색" title="검색"><SearchIcon /></button>
        {/* 검색 버튼 자리에서 헤더 전체로 쭉 펼쳐지는 회색 알약. 탭은 옆으로 비켜 사라진다 */}
        {searchMounted && <div className={styles.csb} data-open={searchOn} role="search">
          <div className={styles.csbPill}>
            <span className={styles.csbIcon}><SearchIcon size={20} /></span>
            <input ref={searchInput} className={styles.csbInput} type="search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') closeSearch(); if (e.key === 'Enter') e.currentTarget.blur(); }}
              placeholder={category !== '전체' ? `${category}에서 검색` : '커뮤니티 검색'} enterKeyHint="search" aria-label="커뮤니티 검색" tabIndex={searchOn ? 0 : -1} />
            {query && <button type="button" className={styles.csbClear} onClick={() => { setQuery(''); searchInput.current?.focus(); }} aria-label="검색어 지우기"><CloseIcon size={14} stroke={2.8} /></button>}
            <button type="button" className={styles.csbCancel} onClick={closeSearch} tabIndex={searchOn ? 0 : -1}>취소</button>
          </div>
        </div>}
      </div>
    </header>

    <div className={styles.layout}>
      <aside className={styles.filterPanel} aria-label="커뮤니티 카테고리"><TabRail boards={boardItems} items={categoryItems} stacked /></aside>
      <main className={styles.feed}>
        <div className={styles.pcTitle}><h1>커뮤니티</h1>{searchField('community-search-pc')}</div>
        {error && <div className={styles.message} role="alert"><span>{error}</span><button type="button" onClick={refresh}>다시 시도</button></div>}

        {showWeeklyTabs && <section className={styles.weekly} aria-label="주간 인기글">
          <h2 className={styles.weeklyTitle} role="tablist" aria-label="게시글 보기">
            <button type="button" role="tab" aria-selected={!mine} className={styles.wpTab} onClick={() => setMine(false)}>주간 인기글</button>
            <button type="button" role="tab" aria-selected={mine} className={styles.wpTab} onClick={toggleMine}>내가 쓴 글</button>
            <Link className={styles.wpLink} href="/community/live">실시간 질문 ›</Link>
          </h2>
          {!mine && popular.length > 0 && <WeeklyCards posts={popular} onOpen={open} />}
        </section>}

        <div className={styles.listHead}>
          {searchTerm ? <p>검색 결과<span>{visible.length}</span></p> : !showWeeklyTabs && mine ? <p>내가 쓴 글</p> : <span />}
          <div className={styles.sortWrap}>
            <button type="button" className={styles.sortButton} aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen(v => !v)}>{SORTS.find(x => x.key === sort)?.label}<SortArrowsIcon /></button>
            {sortOpen && <>
              <div className={styles.sortBackdrop} onClick={() => setSortOpen(false)} />
              <div className={styles.sortMenu} role="listbox">{SORTS.map(x => <button key={x.key} type="button" role="option" aria-selected={sort === x.key} className={styles.sortItem} onClick={() => { setSortOpen(false); setSort(x.key); }}>{x.label}</button>)}</div>
            </>}
          </div>
        </div>

        <div className={styles.postList} aria-busy={loading} aria-label="커뮤니티 게시글">
          {loading && posts.length === 0 ? <CommunitySkeleton count={2} />
            : visible.length ? visible.slice(0, renderCount).map(post => <CommunityPostCard key={post.id} post={post} basePath={basePath} initialLiked={likedIds.has(post.id)} onOpen={open} onComments={p => setCommentPost(p.id)} onCategory={cat => communityCategories.includes(cat) && selectCategory(cat)} onDeleted={() => { if (selected === post.id) setSelected(null); }} />)
            : !error && <div className={styles.emptyPanel}>
              <p>{searchTerm ? '검색 결과가 없어요.' : mine ? '내가 쓴 글이 아직 없어요.' : '아직 게시글이 없습니다.'}</p>
              <button type="button" onClick={searchTerm ? closeSearch : write}>{searchTerm ? '전체 글 보기' : '첫 이야기 남기기'}</button>
            </div>}
          {!loading && visible.length > renderCount && <div ref={renderMore} style={{ height: 1 }} aria-hidden="true" />}
        </div>
        {visible.length > 0 && visible.length <= renderCount && <div className={styles.moreLoad}><button type="button" onClick={refresh}>새 글 불러오기</button></div>}
      </main>
    </div>

    <div className={styles.writeDock}><button type="button" className={styles.writeButton} onClick={write}>게시글 +</button></div>

    {/* 넓은 화면 전용 상세 패널 — 목록을 그대로 둔 채 오른쪽을 덮는다 */}
    {selected && <>
      <div className={styles.panelScrim} onClick={() => setSelected(null)} aria-hidden="true" />
      <aside className={styles.panel} role="dialog" aria-label="게시글 상세" aria-modal="false">
        <div className={styles.panelBody}><CommunityDetail key={selected} postId={selected} basePath={basePath} onClose={() => setSelected(null)} /></div>
      </aside>
    </>}
    {compose && <CommunityComposer sheet key={`${activeBoard}-${category}-${user?.id || ''}`} initialBoard={activeBoard} initialCategory={category} onClose={() => setCompose(false)} onPosted={() => { setCompose(false); setMine(false); setCategory('전체'); setQuery(''); refresh(); }} />}
    {commentPost && <CommunityModal label="게시글 댓글" onClose={() => setCommentPost(null)}><CommunityDetail key={commentPost} postId={commentPost} basePath={basePath} commentsOnly onClose={() => setCommentPost(null)} /></CommunityModal>}
  </div>;
}

// 스타디 탭 레일 — 가로로 더 볼 게 남았을 때만 오른쪽을 흐린다(끝까지 밀면 걷음)
function TabRail({ boards, items, stacked = false }: { boards: RailItem[]; items: RailItem[]; stacked?: boolean }) {
  const rail = useRef<HTMLElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  const activeKey = items.find(item => item.on)?.key;
  useEffect(() => {
    const element = rail.current;
    if (!element || stacked) return;
    const update = () => setAtEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 2);
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { element.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [stacked, items.length, boards.length]);
  // 고른 탭이 화면 밖이면 가운데로 끌어온다
  useEffect(() => {
    const element = rail.current;
    const target = element?.querySelector<HTMLElement>(`[data-key="${activeKey}"]`);
    if (!element || !target || stacked) return;
    const left = target.offsetLeft - (element.clientWidth - target.offsetWidth) / 2;
    element.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' as ScrollBehavior : 'smooth' });
  }, [activeKey, stacked]);
  const button = (item: RailItem) => <button key={item.key} data-key={item.key} type="button" className={styles.tabItem} aria-current={item.on || undefined} onClick={item.onSelect}>
    <span className={styles.tabIco}><img src={item.icon} alt="" width={24} height={24} /></span>
    <span className={styles.tabLabel}>{item.label}</span>
  </button>;
  return <nav ref={rail} className={styles.tabrail} data-stacked={stacked || undefined} data-end={atEnd || undefined} aria-label="커뮤니티 카테고리">
    {boards.map(button)}
    {boards.length > 0 && <span className={styles.tabDivider} aria-hidden="true" />}
    {items.map(button)}
  </nav>;
}

// 주간 인기글 가로 카드 줄 — 3.2초마다 다음 카드로(끝에 닿으면 방향을 뒤집는 핑퐁), 손이 닿으면 4.5초 쉰다.
// 비활성 카드는 축소 대신 흐리게(스타디).
const WeeklyCards = memo(function WeeklyCards({ posts, onOpen }: { posts: Post[]; onOpen: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const touchedAt = useRef(0);
  const visibleRef = useRef(true);
  const animating = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);

  const nearest = useCallback(() => {
    const element = track.current;
    if (!element) return 0;
    const pad = parseFloat(getComputedStyle(element).paddingLeft) || 0;
    const x = element.scrollLeft + pad;
    let best = 0; let min = Infinity;
    Array.from(element.children).forEach((child, i) => { const d = Math.abs((child as HTMLElement).offsetLeft - x); if (d < min) { min = d; best = i; } });
    return best;
  }, []);
  function onScroll() {
    if (animating.current || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => { frame.current = null; const next = nearest(); setActive(cur => cur === next ? cur : next); });
  }
  function onTouch() {
    touchedAt.current = Date.now();
    if (animating.current && track.current) track.current.scrollTo({ left: track.current.scrollLeft, behavior: 'instant' as ScrollBehavior });
    animating.current = false;
    if (track.current) track.current.style.scrollSnapType = '';
  }
  useEffect(() => {
    const element = track.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (posts.length <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let dir: 1 | -1 = 1;
    const id = setInterval(() => {
      const element = track.current;
      if (!element || document.hidden || !visibleRef.current || animating.current || Date.now() - touchedAt.current < 4500) return;
      const pad = parseFloat(getComputedStyle(element).paddingLeft) || 0;
      const max = Math.max(0, element.scrollWidth - element.clientWidth);
      const left = element.scrollLeft;
      if (dir === 1 && left >= max - 4) dir = -1; else if (dir === -1 && left <= 4) dir = 1;
      const children = Array.from(element.children) as HTMLElement[];
      const index = Math.max(0, Math.min(children.length - 1, nearest() + dir));
      const target = Math.max(0, Math.min(max, children[index].offsetLeft - pad));
      if (Math.abs(target - left) < 4) return;
      // 도는 동안만 스냅을 꺼서 끼어들지 않게 하고, 목표 카드를 먼저 밝힌다
      animating.current = true;
      setActive(index);
      element.style.scrollSnapType = 'none';
      element.scrollTo({ left: target, behavior: 'smooth' });
      settleTimer.current = setTimeout(() => { animating.current = false; element.style.scrollSnapType = ''; const next = nearest(); setActive(cur => cur === next ? cur : next); }, 1000);
    }, 3200);
    return () => { clearInterval(id); if (settleTimer.current) clearTimeout(settleTimer.current); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [posts.length, nearest]);

  return <>
    <div className={styles.weeklyViewport}>
      <div ref={track} className={styles.weeklyTrack} onScroll={onScroll} onPointerDown={onTouch} onTouchStart={onTouch} onWheel={onTouch}>
        {posts.map((post, index) => <button key={post.id} type="button" className={styles.weeklyCard} onClick={() => onOpen(post.id)} style={{ opacity: index === active ? 1 : .55 }}>
          <img className={styles.weeklyMedal} src={`/icons/stady/medal-${Math.min(index + 1, 5)}.svg`} alt={`${index + 1}위`} width={44} height={44} />
          <span className={styles.weeklyTop}>{post.tags[0] || '의사에게 질문'}</span>
          <span className={styles.weeklyCardTitle}>{post.title}</span>
          {post.content !== post.title && <span className={styles.weeklyCardContent}>{post.content}</span>}
          <span className={styles.weeklyMetrics}>
            <span><HeartFillIcon /> {post.likeCount.toLocaleString()}</span>
            <span><CommentFillIcon /> {post.commentCount.toLocaleString()}</span>
            <span><EyeFillIcon /> {post.viewCount.toLocaleString()}</span>
          </span>
        </button>)}
      </div>
      <div className={`${styles.weeklyFade} ${styles.weeklyFadeL}`} aria-hidden="true" />
      <div className={`${styles.weeklyFade} ${styles.weeklyFadeR}`} aria-hidden="true" />
    </div>
    {posts.length > 1 && <div className={styles.weeklyDots} aria-hidden="true">{posts.map((post, index) => <span key={post.id} className={styles.weeklyDot} data-active={index === active || undefined} />)}</div>}
  </>;
});
