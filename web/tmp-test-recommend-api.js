require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'text@mail.com',
    password: '123456',
  });

  if (error) {
    console.error('login error:', error);
    process.exit(1);
  }

  console.log('logged in, user:', data.user.id);
  console.log('access_token:', data.session.access_token.slice(0, 30) + '...');

  // Get pet id
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('profile_id', data.user.id)
    .limit(1);
  const petId = pets?.[0]?.id;
  console.log('petId:', petId);

  // Call recommend API
  const res = await fetch('http://localhost:3000/api/ai/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      Cookie: `sb-gooydkocbowchxoahhlg-auth-token=${encodeURIComponent(JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: data.user }))}`,
    },
    body: JSON.stringify({ petId, query: '肠胃敏感' }),
  });

  console.log('api status:', res.status);
  const result = await res.json();
  console.log('breakdown:', JSON.stringify(result.breakdown, null, 2));
}

main();
