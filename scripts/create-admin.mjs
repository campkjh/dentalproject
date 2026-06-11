import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? '관리자';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [name]');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
});

let userId = created?.user?.id;

if (createError) {
  if (!String(createError.message).toLowerCase().includes('already')) {
    console.error('createUser failed:', createError.message);
    process.exit(1);
  }
  // fetch existing user id
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  userId = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!userId) {
    console.error('user exists but id not found');
    process.exit(1);
  }
  console.log('user already existed, promoting to admin:', userId);
}

const { error: profileError } = await admin
  .from('profiles')
  .upsert({ id: userId, name, is_admin: true }, { onConflict: 'id' });

if (profileError) {
  console.error('profile upsert failed:', profileError.message);
  process.exit(1);
}

console.log('OK', { id: userId, email, password });
