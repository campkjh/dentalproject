-- 상품 이미지를 여러 장 — 썸네일(image_urls)·상세페이지(detail_image_urls)를 순서대로 담는다.
-- 예전 칸 image_url·detail_image_url 은 첫 장으로 계속 채워서(카드·옛 화면) 그대로 쓴다.
alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists detail_image_urls text[] not null default '{}';

-- 이미 있던 상품은 한 장짜리 목록으로 옮겨 둔다
update public.products set image_urls = array[image_url]
  where coalesce(array_length(image_urls, 1), 0) = 0 and image_url is not null and image_url <> '';
update public.products set detail_image_urls = array[detail_image_url]
  where coalesce(array_length(detail_image_urls, 1), 0) = 0 and detail_image_url is not null and detail_image_url <> '';
