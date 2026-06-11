-- Submitted documents from registration (license, biz reg, etc.)
-- Stored as JSONB map: { "의사 면허증": "https://...", "사업자등록증": "https://...", ... }
alter table public.hospitals
  add column if not exists submitted_documents jsonb;

-- Long-form product description (rich text / HTML safe)
alter table public.products
  add column if not exists description text;
