const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL o ADMIN_PASSWORD');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success:', data.user.id);
  }
}

createUser();
