# 예약·결제·후기 수정 인계 (2026-11-05)

## 코드 보관 상태

- 웹: `fix/release-booking-reviews-hospital`, PR https://github.com/campkjh/dentalproject/pull/41
- iOS: `fix/payment-provider-safe-area`, PR https://github.com/campkjh/DentalApp_iOS/pull/10
- 이번 작업에서 Android 네이티브 소스 변경은 없음. 공통 웹 변경은 웹 PR에 포함됨.
- main 병합, 운영 DB 마이그레이션, 새 웹 운영 배포 및 새 iOS 빌드 설치는 아직 진행하지 않음.

## 검증

- Node 테스트 83개, TypeScript, 최종 운영 빌드 통과.
- 로컬 PostgreSQL 16에서 실제 마이그레이션과 포인트 차감·취소 반환·동시 사용·중복 지급 방지·결제 전 알림 차단 검증.
- 검증용 데이터로 모바일 브라우저의 지역 검색, 포인트 사용 상한, 30분 예약 슬롯, 사진 확대, 상품 옵션 입력 확인.
- 실제 iOS·Android에서 새 변경의 최종 검증은 남아 있음.

## 토스 운영 접근 정책 (콘솔에서 별도 적용 완료)

- 사용자가 본인 인증 및 정책 변경을 승인한 뒤 운영 MID `mydoce9zmm`의 결제 시크릿 키 한 개만 변경함.
- 기존: `tp-ip-whitelist-380`의 특정 IP 10개 허용.
- 변경: `mydoc-korea-server`의 대한민국 국가 허용. 운영 웹 배포 리전은 서울 `icn1`임.
- 콘솔에서 새 정책 연결 키 1개, 기존 IP 정책 연결 키 0개 및 등록 완료 표시 확인.
- 다른 상점 키는 변경하지 않음. 인증키 원문은 이 문서나 저장소에 보관하지 않음.
- 실제 카드·계좌이체 결제의 재시도 결과는 아직 확인하지 못함. 정책 저장만으로 결제 성공을 보장하지 않음.

## 승인 후 운영 반영 순서

1. `supabase/migrations/0027_booking_points_paid_reviews.sql` 적용.
2. 웹 PR #41 main 병합 및 운영 배포 READY 확인.
3. `supabase/migrations/0028_customer_booking_server_writes.sql` 적용. 새 API 배포 전에 먼저 적용하지 말 것.
4. iOS PR #10 병합과 새 빌드 설치 후 결제 화면 안전영역 확인. 스토어 공개 배포는 별도.
5. 실제 기기에서 카드·계좌이체 결제, 포인트·쿠폰 반환, 알림 시점, 지도 목적지 핀 확인.

후기 초안은 사용자 선택에 따라 외부 AI 전송 없이 로컬 정형 문구만 개선한 상태임.
