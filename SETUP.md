# 키닥터 DB 연동 세팅 가이드

Stage 0 — Supabase 기반이 깔려있습니다. 아래 순서로 세팅하면 실제 DB에 붙습니다.

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard 에서 새 프로젝트 생성 (region: Seoul 권장)
2. `Settings → API`에서 다음 값 확인
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (절대 브라우저 노출 금지)

## 2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`에 위 3개 키와 `NEXT_PUBLIC_SITE_URL`(로컬은 `http://localhost:3000`, 배포는 실제 도메인)를 채워넣습니다.

## 3. 스키마 적용

Supabase 대시보드 `SQL Editor`를 열고 [`supabase/schema.sql`](./supabase/schema.sql) 전체 내용을 붙여넣어 실행합니다. 13개 엔티티 + 트리거 + RLS 정책이 한 번에 생성됩니다.

이후 같은 SQL Editor에서 [`supabase/migrations/0001_admin.sql`](./supabase/migrations/0001_admin.sql)도 실행해 주세요. `profiles.is_admin` 컬럼 + 관리자 정책이 추가됩니다.

본인을 관리자로 지정하려면:
```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'your@email.com');
```

병원 신청 승인은 SQL로:
```sql
update public.hospitals set status = 'approved' where id = '...';
```
또는 관리자 계정으로 로그인 후 `/api/admin/hospitals/<id>` PATCH 호출.

## 4. 시드 데이터 투입

```bash
npm run db:seed
```

현재 `src/lib/mock-data.ts`의 카테고리 · 병원 · 의사 · 상품 · 공지를 DB에 업서트합니다. 사용자 종속 데이터(리뷰/예약/게시글 등)는 실제 사용자가 가입한 뒤에 자연스럽게 쌓이므로 스킵합니다.

## 5. OAuth 연동 (Kakao / Apple)

### Kakao
1. https://developers.kakao.com 앱 등록 → REST API 키 확보
2. Supabase `Authentication → Providers → Kakao` 활성화 후 Client ID/Secret 입력
3. Redirect URI에 `https://<your-project-ref>.supabase.co/auth/v1/callback` 추가

### Apple
1. Apple Developer → Services ID 발급, Sign in with Apple 활성화
2. Supabase `Authentication → Providers → Apple`에 Services ID + Team ID + Key ID + Private Key 입력
3. Return URL에 `https://<your-project-ref>.supabase.co/auth/v1/callback` 추가

### 앱에서 로그인 트리거

클라이언트에서:
```tsx
import { useSession } from '@/lib/supabase/SessionProvider';
const { signInWithOAuth, signOut } = useSession();
// signInWithOAuth('kakao') | signInWithOAuth('apple')
```

`SessionProvider`가 로그인 성공 시 `profiles` 로우를 가져와 Zustand `useStore`에 자동 하이드레이트합니다. 기존 페이지 코드(`useStore().user`)는 수정 없이 계속 동작합니다.

## 6. Storage 버킷 (리뷰 사진 · 프로필 · 병원 서류)

대시보드 `Storage → New bucket`:
- `avatars` (public)
- `reviews` (public)
- `hospital-docs` (private)

업로드 유틸은 후속 Stage에서 추가됩니다. 현재는 `/api/upload`(Vercel Blob) 사용 중입니다.

## 7. 실시간 채팅

`supabase/schema.sql`에 `consultation_rooms`, `consultation_messages`, `live_messages` 테이블이 이미 있습니다. `Database → Replication`에서 이 세 테이블을 Publication에 추가해 주세요. Stage 4에서 해당 페이지 이관 시 `supabase.channel()`로 구독을 붙입니다.

---

## Stage 진행 상황

- [x] **Stage 0** 기반 — Supabase 클라이언트(`src/lib/supabase/*`), 스키마(`supabase/schema.sql`), seed(`scripts/seed.ts`), SessionProvider, proxy.ts
- [ ] **Stage 1** Auth — Kakao/Apple OAuth 버튼 실제 연결, 기존 로그인 모달 대체
- [ ] **Stage 2** 읽기 도메인 — 홈/병원목록/병원상세/상품/리뷰 페이지를 `src/lib/db/*`로 교체 (Server Components)
- [ ] **Stage 3** 쓰기 도메인 — 예약/리뷰 작성/찜/게시글/댓글을 Server Actions로 교체
- [ ] **Stage 4** 실시간 — 1:1 상담 채팅, 커뮤니티 라이브를 Supabase Realtime로
- [ ] **Stage 5** Storage — 이미지 업로드를 Supabase Storage로 통일
- [ ] **Stage 6** mock-data 제거 — 모든 페이지 교체 완료 후 `src/lib/mock-data.ts` 삭제

Stage 0은 env 키가 없으면 앱이 기존 mock 데이터로 그대로 동작하도록 만들어져 있습니다(SessionProvider가 env 부재 시 no-op). 키를 채우는 순간부터 실제 인증/DB가 활성화됩니다.
