import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

// '@' 없는 아이디(mydocadmin)는 어드민 로그인 판과 같은 규칙으로 이메일을 만든다(src/components/admin/AdminGate.tsx ADMIN_ID_DOMAIN)
const ADMIN_ID_DOMAIN = 'my-doc.co.kr';
const rawId = process.argv[2]?.trim().toLowerCase();
const email = rawId && !rawId.includes('@') ? `${rawId}@${ADMIN_ID_DOMAIN}` : rawId;
const password = process.argv[3];
const name = process.argv[4] ?? '관리자';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <아이디 또는 email> <password> [name]');
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
  // 이미 있는 계정이면 비밀번호를 새로 정한다(비밀번호는 저장소·DB 어디에서도 읽을 수 없어서 잊으면 이걸로 다시 정한다)
  const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (pwError) {
    console.error('password update failed:', pwError.message);
    process.exit(1);
  }
  console.log('user already existed, password reset + promoting to admin:', userId);
}

const { error: profileError } = await admin
  .from('profiles')
  .upsert({ id: userId, name, is_admin: true }, { onConflict: 'id' });

if (profileError) {
  console.error('profile upsert failed:', profileError.message);
  process.exit(1);
}

console.log('OK', { id: userId, email });
