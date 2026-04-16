/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Demo data reset — wipes all rows from data tables AND deletes the demo
 * auth.users (everything ending in @kidoctor.demo). Public categories remain.
 *
 * Run before re-seeding or before going live to remove all demo content:
 *   npm run db:reset
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing env keys');
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function clearTable(table: string) {
  const { error } = await admin.from(table).delete().not('id', 'is', null);
  if (error && !/violates foreign key/.test(error.message)) {
    console.warn(`! ${table}: ${error.message}`);
  } else {
    console.log(`✓ cleared ${table}`);
  }
}

async function main() {
  console.log(`→ Wiping ${url}\n`);

  const order = [
    'consultation_messages',
    'consultation_rooms',
    'live_messages',
    'comment_likes',
    'post_likes',
    'comments',
    'posts',
    'reviews',
    'reservations',
    'recently_viewed',
    'wishlists',
    'recent_searches',
    'interested_categories',
    'coupons',
    'point_history',
    'notifications',
    'product_options',
    'products',
    'doctors',
    'operating_hours',
    'hospitals',
    'announcements',
  ];

  for (const t of order) await clearTable(t);

  // Delete demo auth users
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const demoUsers = (list?.users ?? []).filter((u) => u.email?.endsWith('@kidoctor.demo'));
  for (const u of demoUsers) {
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log(`✓ deleted ${demoUsers.length} @kidoctor.demo users`);

  console.log('\n✔ done — DB is clean (categories preserved). Run npm run db:seed to repopulate.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
