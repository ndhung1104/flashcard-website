function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getServerEnv() {
  return {
    supabaseUrl: getRequiredEnv('SUPABASE_URL'),
    supabaseAnonKey: getRequiredEnv('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}
