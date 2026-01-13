
import { createClient } from '@supabase/supabase-js';

const containerUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const containerKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(containerUrl, containerKey);
