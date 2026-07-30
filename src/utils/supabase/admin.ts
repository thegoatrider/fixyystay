import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("WARNING: Missing Supabase configuration (URL or Key). Returning mock admin client.");
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null }),
            single: () => Promise.resolve({ data: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: null }),
          single: () => Promise.resolve({ data: null }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null }),
          }),
        }),
        upsert: () => Promise.resolve({ error: null }),
      }),
    } as any;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
