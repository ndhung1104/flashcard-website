import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from './env.js';

const baseOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export function createAnonClient() {
  const env = getServerEnv();
  return createClient(env.supabaseUrl, env.supabaseAnonKey, baseOptions);
}

export function createUserClient(accessToken: string) {
  const env = getServerEnv();
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...baseOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

