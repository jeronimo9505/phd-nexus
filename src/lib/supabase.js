import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificación de seguridad para evitar errores en el build de Vercel
if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing. This is expected during some build phases if env vars are not yet injected.');
}

export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey)
    : null;
