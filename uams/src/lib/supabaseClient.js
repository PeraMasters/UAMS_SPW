import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear message in development instead of cryptic [object Object]
  // This will not crash the app but will help diagnose configuration issues.
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars missing. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in a .env file.'
  );
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '') 

export default supabase;
