// 기존 병원들의 주소를 geocoding 해서 lat/lng 1회 백필.
// 실행: node scripts/backfill-hospital-coords.mjs  (.env.local 에 키 필요)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const naverId = process.env.NAVER_MAP_CLIENT_ID ?? process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const naverSecret = process.env.NAVER_MAP_CLIENT_SECRET;

if (!url || !key) {
  console.error('Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) 누락');
  process.exit(1);
}
if (!naverId || !naverSecret) {
  console.error('NAVER 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID / NAVER_MAP_CLIENT_SECRET) 누락');
  process.exit(1);
}

const sb = createClient(url, key);

async function geocode(query) {
  const res = await fetch(
    `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`,
    { headers: { 'x-ncp-apigw-api-key-id': naverId, 'x-ncp-apigw-api-key': naverSecret } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const a = data?.addresses?.[0];
  if (!a) return null;
  const lng = Number(a.x);
  const lat = Number(a.y);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

const { data: rows, error } = await sb.from('hospitals').select('id, name, address, lat, lng');
if (error) {
  console.error(error);
  process.exit(1);
}

let updated = 0;
let skipped = 0;
let failed = 0;
for (const h of rows ?? []) {
  if (h.lat != null && h.lng != null) {
    skipped++;
    continue;
  }
  if (!h.address) {
    failed++;
    console.log(`- ${h.name}: 주소 없음`);
    continue;
  }
  const c = await geocode(h.address);
  if (!c) {
    failed++;
    console.log(`- ${h.name}: geocode 실패 (${h.address})`);
    continue;
  }
  const { error: upErr } = await sb.from('hospitals').update({ lat: c.lat, lng: c.lng }).eq('id', h.id);
  if (upErr) {
    failed++;
    console.log(`- ${h.name}: 저장 실패`, upErr.message);
    continue;
  }
  updated++;
  console.log(`✓ ${h.name}: ${c.lat}, ${c.lng}`);
  await new Promise((r) => setTimeout(r, 120));
}

console.log(`\n완료 — 업데이트 ${updated}, 건너뜀 ${skipped}, 실패 ${failed}`);
