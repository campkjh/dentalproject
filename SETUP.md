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

이후 같은 SQL Editor에서 [`supabase/migrations/`](./supabase/migrations) 폴더의 **모든 파일을 파일명 순서대로 하나씩** 실행해 주세요(`0001_admin.sql` → … → 마지막 번호까지, 같은 번호가 두 개인 `0009_*`도 둘 다). 빠뜨린 파일이 있으면 해당 기능의 API가 테이블·컬럼·트리거가 없어 실패합니다.
- `0001_admin.sql` — `profiles.is_admin` 컬럼 + 관리자 정책
- `0023_identity_verifications.sql` — 본인인증 결과(비공개 테이블)
- `0032_protect_profile_privileges.sql` — 고객이 자기 `is_admin`·`is_doctor`를 직접 바꾸지 못하게 막는 트리거

이미 운영 중인 DB에 새 마이그레이션이 추가되면 그 파일만 순서대로 실행합니다.

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

## 4. 데모 데이터 투입 (선택)

```bash
npm run db:seed
```

데모용 콘텐츠 한 번에 넣기:
- 병원 사장 4명 (실제 auth.users 가입 — 로그인 가능)
- 환자 22명 (실제 auth.users 가입 — 로그인 가능)
- 병원 4개 (각 사장이 owner로 등록, status=approved)
- 의료진 19명 + 영업시간 + 상품 6개 + 리뷰 22개 + 예약 11건 + 게시글 28개
- 모든 콘텐츠가 위 실제 사용자 계정에 연결됨 (mockup 아님)

**데모 계정 (비밀번호 모두 `Demo1234!`)**
- 병원 사장: `owner.h1@kidoctor.demo` ~ `owner.h4@kidoctor.demo`
- 환자(예약/쿠폰 보유): `u1@kidoctor.demo`
- 환자(리뷰 작성자): `u2@kidoctor.demo` ~ `u22@kidoctor.demo`

데모 데이터를 모두 지우고 빈 상태로 만들기:
```bash
npm run db:reset
```
(카테고리는 유지, `@kidoctor.demo` 사용자도 모두 삭제됩니다)

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

## 8. 본인인증(만 19세 이상) 켜기

휴대폰 본인인증은 포트원 V2 + NHN KCP(PASS·통신 3사·알뜰폰)로 붙어 있습니다. 인증을 마치면 서버가 포트원에 결과를 직접 다시 조회해 **만 19세 이상인지**, **같은 명의로 가입한 다른 계정이 있는지**(CI 해시)를 확인합니다. KCP 인증 창은 나이를 거르지 않으므로 나이 판정은 서버가 합니다.

`.env.local.example`의 'PortOne 본인인증' 4개 값이 모두 있고 `IDENTITY_VERIFICATION_REQUIRED=true`일 때만 인증을 요구합니다(로그인한 고객의 화면 전체와 예약·상담·글·댓글·후기 작성). 아래 순서를 끝내기 전에는 `false`로 두세요(값이 없어도 서비스는 인증 없이 그대로 동작).

1. **KCP 계약** — 포트원을 통해 NHN KCP 휴대폰 본인확인을 계약합니다. 신청 때 **CI 제공**을 꼭 요청하세요. KCP는 CI를 '가맹점 설정에 따라' 주므로, 빠지면 중복 가입 확인을 못 해 인증이 전부 실패합니다. 계약 메일에는 `pgs@portone.io`를 참조로 넣습니다.
2. **KCP 파트너관리자 설정** (계약 후 받은 MID로 로그인)
   - **가맹점 인증키** 발급 — 3번 포트원 채널 추가에 씁니다.
   - 부가서비스 > 휴대폰본인확인 > 연동방식 설정 → **'신규 연동방식(V2) 사용'**. 설정하지 않으면 인증 창에서 `CS24` 오류가 납니다(`/verify-identity`가 브라우저 콘솔에 PG 코드를 남깁니다).
   - **인증결과URL**: `checkout-service.prod.iamport.co` (포트원 안내값)
3. **포트원 채널 추가** — 포트원 콘솔 > 결제 연동 > 연동 정보 > 채널 관리에서 **실연동**으로 NHN KCP 채널을 추가하고 채널 속성을 **'본인인증'**으로 고릅니다. MID와 2번의 가맹점 인증키를 넣고 만들어진 채널 키(`channel-key-…`)를 복사합니다. 같은 콘솔의 식별코드·API Keys > V2 API에서 Store ID와 V2 Secret도 확인합니다. (테스트 채널로 끝난 인증은 기본으로 거부됩니다. 운영과 다른 DB를 쓰는 로컬·프리뷰에서만 `IDENTITY_ALLOW_TEST_CHANNEL=true`로 허용하세요.)
4. **Vercel 환경변수 + 재배포** — `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_IDV_CHANNEL_KEY`를 넣고 `IDENTITY_VERIFICATION_REQUIRED`는 아직 `false`로 둔 채 재배포합니다. `NEXT_PUBLIC_*`은 빌드 때 번들에 들어가므로 값을 넣거나 바꾸면 반드시 재배포해야 합니다. V2 Secret은 만료일이 있으니 만료일을 일정에 적어 두세요.
5. **DB 마이그레이션** — `0023_identity_verifications.sql`(인증 결과 테이블)과 `0032_protect_profile_privileges.sql`(의사·관리자 면제의 전제인 권한 컬럼 보호 트리거)이 적용돼 있어야 합니다. 운영 DB에는 0032가 이미 적용돼 있으니 0023만 확인하면 됩니다. 새 DB라면 위 '3. 스키마 적용'대로 migrations 전체를 순서대로 실행합니다.
6. **실기기 E2E** — `REQUIRED=false` 상태에서도 로그인 후 `/verify-identity?next=/mypage`처럼 `next`를 붙여 직접 열면 인증할 수 있습니다(완료 후 `next` 경로로 돌아가는지도 같이 확인). 아래 4개 환경 × 4개 시나리오를 모두 확인합니다.

   | 환경 | 성인 | 취소 | 중복 명의 | 다른 계정 링크 |
   | --- | --- | --- | --- | --- |
   | PC 브라우저 | ☐ | ☐ | ☐ | ☐ |
   | 모바일 브라우저 | ☐ | ☐ | ☐ | ☐ |
   | iOS 앱 | ☐ | ☐ | ☐ | ☐ |
   | Android 앱 | ☐ | ☐ | ☐ | ☐ |

   - **성인**: 만 19세 이상 명의로 인증 → '본인인증을 마쳤어요' 후 원래 화면(`next`)으로 돌아감. PASS 앱으로 넘어갔다 돌아오는 경우 포함.
   - **취소**: 인증 창 닫기 → 취소 안내 문구가 뜸 / 뒤로가기 → 첫 화면(휴대폰 본인인증 버튼)으로 돌아옴. 어느 경우든 '여는 중'에 멈추지 않고 다시 시도할 수 있음.
   - **중복 명의**: 이미 인증한 명의로 다른 계정에서 인증 → '이미 다른 계정으로 가입된 명의예요'.
   - **다른 계정 링크**: A 계정이 인증을 마치고 돌아온 주소(`?identityVerificationId=…`)를 B 계정·다른 기기에서 열기 → '본인인증을 다시 시작해 주세요', B에는 저장되지 않음.
   - 만 19세 미만은 실기기로 확인하기 어려우니 만 나이 계산을 단위 테스트(`tests/identity-shared.test.ts`)로 확인합니다. E2E로 생긴 `identity_verifications` 행은 끝나고 정리하세요(남겨 두면 테스터 명의가 테스트 계정에 묶여 본인 계정으로 인증할 때 '중복 명의'가 됩니다).
7. **켜기** — Vercel에서 `IDENTITY_VERIFICATION_REQUIRED=true`로 바꾸고 재배포합니다. 의사·관리자·승인된 병원 운영자 계정은 인증을 요구받지 않습니다. 문제가 생기면 `false`로 되돌리고 재배포하면 인증 없이 동작합니다.

---

## 출시 체크리스트 (실서비스 전환)

1. `npm run db:reset` — 데모 데이터 전부 삭제
2. Supabase 대시보드 → Authentication → Email Provider → **Confirm email = ON** 권장
3. 본인 관리자 계정 생성 후 SQL로 `is_admin = true` 지정 (위 SETUP 3번 참고)
4. 본인이나 입점 사장이 `/hospital/register`로 첫 병원 등록
5. 관리자 계정으로 `/admin/hospitals`에서 승인
6. `NEXT_PUBLIC_SITE_URL`을 실 도메인으로 교체 후 Vercel 배포
7. 본인인증(만 19세 이상) — 위 8번 순서대로, 실기기 E2E 후 `IDENTITY_VERIFICATION_REQUIRED=true`

## Stage 진행 상황

- [x] **Stage 0** 기반 — Supabase 클라이언트(`src/lib/supabase/*`), 스키마(`supabase/schema.sql`), seed(`scripts/seed.ts`), SessionProvider, proxy.ts
- [ ] **Stage 1** Auth — Kakao/Apple OAuth 버튼 실제 연결, 기존 로그인 모달 대체
- [ ] **Stage 2** 읽기 도메인 — 홈/병원목록/병원상세/상품/리뷰 페이지를 `src/lib/db/*`로 교체 (Server Components)
- [ ] **Stage 3** 쓰기 도메인 — 예약/리뷰 작성/찜/게시글/댓글을 Server Actions로 교체
- [ ] **Stage 4** 실시간 — 1:1 상담 채팅, 커뮤니티 라이브를 Supabase Realtime로
- [ ] **Stage 5** Storage — 이미지 업로드를 Supabase Storage로 통일
- [ ] **Stage 6** mock-data 제거 — 모든 페이지 교체 완료 후 `src/lib/mock-data.ts` 삭제

Stage 0은 env 키가 없으면 앱이 기존 mock 데이터로 그대로 동작하도록 만들어져 있습니다(SessionProvider가 env 부재 시 no-op). 키를 채우는 순간부터 실제 인증/DB가 활성화됩니다.
