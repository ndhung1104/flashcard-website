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
    googleDriveClientId: process.env.GOOGLE_DRIVE_CLIENT_ID ?? '',
    googleDriveClientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? '',
    googleDriveRefreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? '',
    driveSyncCronKey: process.env.DRIVE_SYNC_CRON_KEY ?? '',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  };
}
