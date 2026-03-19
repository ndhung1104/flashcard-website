import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const baseOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export function createAnonClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, baseOptions);
}

export function createUserClient(accessToken: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...baseOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
