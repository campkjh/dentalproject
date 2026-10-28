'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Eye, Flame, MessageCircle, PenLine, RefreshCw, Search, X } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
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
import styles from './community.module.css';

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
  const [searchOpen, setSearchOpen] = useState(params.has('q'));
  const [sort, setSort] = useState('latest');
  const [compose, setCompose] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [likes, setLikes] = useState<{ userId: string; ids: Set<string> }>({ userId: '', ids: new Set() });
  const likedIds = likes.userId === user?.id ? likes.ids : new Set<string>();
  const [indicator, setIndicator] = useState({ left: 16, width: 56 });
  const categoryRail = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchInput = useRef<HTMLInputElement>(null);
  const activeBoard = isDoctor ? board : 'question';
  const availableBoards = isDoctor ? communityBoards : communityBoards.slice(0, 1);
  const searchTerm = query.trim().toLocaleLowerCase();
  const popular = useMemo(() => getWeeklyPopularPosts(posts), [posts]);
  const visible = useMemo(() => posts.filter(post => {
    if (post.boardType !== activeBoard || (mine && post.authorId !== user?.id)) return false;
    if (category !== '전체' && !post.tags.includes(category)) return false;
    return !searchTerm || [post.title, post.content, post.isAnonymous ? '' : post.authorName, ...post.tags].join(' ').toLocaleLowerCase().includes(searchTerm);
  }).sort((a, b) => sort === 'popular' ? b.viewCount - a.viewCount : sort === 'comments' ? b.commentCount - a.commentCount : new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()), [posts, activeBoard, mine, user?.id, category, searchTerm, sort]);

  if (previousQuery !== params.get('q')) {
    setPreviousQuery(params.get('q')); setQuery(params.get('q') || ''); setSearchOpen(params.has('q'));
  }
  useLayoutEffect(() => {
    const rail = categoryRail.current;
    const update = () => { const target = buttons.current[category]; if (target?.offsetWidth) setIndicator({ left: target.offsetLeft, width: target.offsetWidth }); };
    update();
    const observer = new ResizeObserver(update);
    if (rail) observer.observe(rail);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [category, activeBoard]);
  const postIds = posts.map(p => p.id).join(',');
  useEffect(() => {
    if (!user?.id || !postIds || !hasSupabaseEnv()) return;
    let cancelled = false;
    createClient().from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds.split(','))
      .then(({ data }) => { if (!cancelled) setLikes({ userId: user.id, ids: new Set((data ?? []).map(row => row.post_id)) }); });
    return () => { cancelled = true; };
  }, [postIds, user?.id]);
  useEffect(() => {
    if (!selected) return;
    const keyboard = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setSelected(null); };
    const resize = () => { if (!window.matchMedia('(min-width: 1200px)').matches) { setSelected(null); router.push(`${basePath}/${selected}`); } };
    window.addEventListener('keydown', keyboard); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('keydown', keyboard); window.removeEventListener('resize', resize); };
  }, [selected, router, basePath]);

  function selectCategory(next: string) {
    if (compose && next !== category && !window.confirm('카테고리를 바꾸고 작성 중인 내용을 닫을까요?')) return;
    setCompose(false);
    setCategory(next);
    const target = buttons.current[next]; const rail = categoryRail.current;
    if (rail && target) rail.scrollTo({ left: Math.max(0, target.offsetLeft - (rail.clientWidth - target.offsetWidth) / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function open(post: Post) {
    if (window.matchMedia('(min-width: 1200px)').matches) setSelected(post.id);
    else router.push(`${basePath}/${post.id}`);
  }
  function closeSearch() { setQuery(''); setSearchOpen(false); if (params.has('q')) router.replace(basePath, { scroll: false }); }
  function write() {
    if (!user) { window.dispatchEvent(new CustomEvent('dental:login')); return; }
    setCompose(true);
  }
  function changeBoard(next: Post['boardType']) { if (compose && !window.confirm('게시판을 바꾸고 작성 중인 내용을 닫을까요?')) return; setCompose(false); setBoard(next); setCategory('전체'); }
  const categoryList = <>
    <h2 className={styles.sidebarTitle}>커뮤니티</h2>
    {availableBoards.length > 1 && <>{availableBoards.map(item => <button key={item.value} type="button" aria-current={activeBoard === item.value} onClick={() => changeBoard(item.value)}><img src={item.icon} alt="" /><span>{item.label}</span></button>)}<div className={styles.sidebarDivider} /></>}
    {communityCategories.map(cat => <button type="button" key={cat} aria-current={category === cat} onClick={() => { selectCategory(cat); setDrawer(false); }}>{cat}</button>)}
    <div className={styles.sidebarDivider} />
    <button type="button" aria-current={mine} onClick={() => { if (!user) window.dispatchEvent(new CustomEvent('dental:login')); else { setMine(!mine); setDrawer(false); } }}><PenLine size={19} />내가 쓴 글</button>
    <Link className={styles.liveLink} href="/community/live"><MessageCircle size={19} />실시간 질문</Link>
  </>;

  return <div className={styles.page}>
    <PullToRefresh onRefresh={refresh} disabled={Boolean(compose || drawer || commentPost || loading)} />
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <button type="button" className={styles.mobileTitle} onClick={() => setDrawer(true)} aria-label="커뮤니티 카테고리 고르기" aria-expanded={drawer}>{mine ? '내가 쓴 글' : category === '전체' ? '커뮤니티' : category}<ChevronDown size={20} color="#8b95a1" /></button>
        <div className={`${styles.searchBox} ${styles.desktopSearch}`}><Search size={19} /><input aria-label="커뮤니티 검색" placeholder="무엇을 검색하시나요?" value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={17} /></button>}</div>
        <button type="button" className={styles.searchToggle} aria-label={searchOpen ? '검색 닫기' : '검색 열기'} title="검색" aria-expanded={searchOpen} onClick={() => { if (searchOpen) closeSearch(); else { setSearchOpen(true); searchInput.current?.focus({ preventScroll: true }); } }}>{searchOpen ? <X size={20} /> : <Search size={20} />}</button>
      </div>
      <div className={styles.searchReveal} data-open={searchOpen} aria-hidden={!searchOpen}><div><div className={styles.searchBox}><Search size={18} /><input ref={searchInput} aria-label="커뮤니티 글 검색" tabIndex={searchOpen ? 0 : -1} type="search" placeholder="커뮤니티 검색" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') closeSearch(); if (e.key === 'Enter') e.currentTarget.blur(); }} />{query && <button type="button" tabIndex={searchOpen ? 0 : -1} aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={17} /></button>}</div></div></div>
    </header>
    <div className={`${styles.layout} ${selected ? styles.withPanel : ''}`}>
      <aside className={styles.sidebar} aria-label="커뮤니티 카테고리">{categoryList}</aside>
      <main className={styles.feed}>
        <div className={styles.inlineComposer} data-open={compose}>
          <div className={styles.composerFold} data-open={compose}><div><button type="button" className={styles.composeBar} onClick={write}><Avatar src={user?.profileImage} seed={user?.id} size={38} /><span>오늘 어떤 이야기를 나눌까요?</span><strong>글쓰기</strong></button></div></div>
          <div className={styles.composerUnfold} data-open={compose}><div inert={!compose}><CommunityComposer key={`${activeBoard}-${category}-${user?.id || ''}`} initialBoard={activeBoard} initialCategory={category} inline active={compose} onClose={() => setCompose(false)} onPosted={() => { setCompose(false); setMine(false); setCategory('전체'); setQuery(''); refresh(); }} /></div></div>
        </div>
        {!mine && !searchTerm && activeBoard === 'question' && category === '전체' && popular.length > 0 && <PopularPosts posts={popular} onOpen={open} />}
        <div className={styles.sectionHeader}><h1>{mine ? '내가 쓴 글' : searchTerm ? '검색 결과' : activeBoard === 'question' ? '의사에게 질문' : activeBoard === 'free' ? '자유익명게시판' : '과별게시판'}</h1><select aria-label="게시글 정렬" value={sort} onChange={e => setSort(e.target.value)}><option value="latest">최신순</option><option value="popular">인기순</option><option value="comments">댓글순</option></select></div>
        <div className={styles.categoryRail} ref={categoryRail} role="tablist" aria-label="진료 카테고리"><span className={styles.categoryIndicator} aria-hidden="true" style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }} />{communityCategories.map(cat => <button key={cat} ref={el => { buttons.current[cat] = el; }} type="button" role="tab" aria-selected={category === cat} onClick={() => selectCategory(cat)}>{cat}</button>)}</div>
        {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={refresh}>다시 시도</button></div>}
        <div aria-busy={loading} aria-label="커뮤니티 게시글">{loading && posts.length === 0 ? <CommunitySkeleton /> : visible.length ? visible.map(post => <CommunityPostCard key={post.id} post={post} basePath={basePath} initialLiked={likedIds.has(post.id)} onOpen={open} onComments={post => setCommentPost(post.id)} onCategory={cat => communityCategories.includes(cat) && selectCategory(cat)} onDeleted={() => { if (selected === post.id) setSelected(null); }} />) : !error && <div className={styles.empty}><MessageCircle size={32} /><p>{searchTerm ? '검색 결과가 없어요.' : mine ? '아직 작성한 글이 없어요.' : '아직 게시글이 없어요.'}</p><button type="button" onClick={searchTerm ? closeSearch : write}>{searchTerm ? '전체 글 보기' : '첫 이야기 남기기'}</button></div>}</div>
        {visible.length > 0 && <div className={styles.empty} style={{ minHeight: 100 }}><button type="button" onClick={refresh}><RefreshCw size={14} className="inline mr-1.5" />새 글 불러오기</button></div>}
      </main>
      {selected && <aside className={styles.panel} aria-label="게시글 상세 패널"><CommunityDetail key={selected} postId={selected} basePath={basePath} onClose={() => setSelected(null)} /></aside>}
    </div>
    {drawer && <CommunityModal label="커뮤니티 카테고리" variant="drawer" onClose={() => setDrawer(false)}><header className={styles.sheetHeader}><span /><h2>카테고리</h2><button type="button" className={styles.iconButton} aria-label="닫기" onClick={() => setDrawer(false)}><X size={20} /></button></header><nav className={styles.drawerList}>{categoryList}</nav></CommunityModal>}
    {commentPost && <CommunityModal label="게시글 댓글" onClose={() => setCommentPost(null)}><CommunityDetail key={commentPost} postId={commentPost} commentsOnly onClose={() => setCommentPost(null)} /></CommunityModal>}
  </div>;
}

function PopularPosts({ posts, onOpen }: { posts: Post[]; onOpen: (post: Post) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  return <section className={styles.popular} aria-label="주간 인기글"><div className={styles.sectionHeader}><h2><Flame size={18} color="#ed8c4b" fill="#fff1df" />주간 인기글</h2></div>
    <div ref={rail} className={styles.popularRail} onScroll={() => { const element = rail.current; if (element?.firstElementChild) setActive(Math.min(posts.length - 1, Math.round(element.scrollLeft / ((element.firstElementChild as HTMLElement).offsetWidth + 12)))); }}>
      {posts.map((post, i) => <button type="button" key={post.id} className={styles.popularCard} onClick={() => onOpen(post)}><div className={styles.popularTop}><span className={styles.popularRank}>{i + 1}</span>{post.tags[0] || '의사에게 질문'}</div><h3>{post.title}</h3><p>{post.content}</p><div className={styles.popularMeta}><span><Eye size={13} />{post.viewCount.toLocaleString()}</span><span><MessageCircle size={13} />{post.commentCount}</span><span className="ml-auto">{post.answerCount || 1}명 답변</span></div></button>)}
    </div><div className={styles.dots}>{posts.map((post, i) => <button type="button" key={post.id} aria-label={`인기글 ${i + 1}`} aria-current={active === i} onClick={() => { const element = rail.current; const item = element?.children[i] as HTMLElement | undefined; if (element && item) element.scrollTo({ left: item.offsetLeft - (element.firstElementChild as HTMLElement).offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }} />)}</div>
  </section>;
}
