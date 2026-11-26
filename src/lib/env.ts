/**
 * Public runtime configuration. EXPO_PUBLIC_* values are inlined at bundle time,
 * so they must be present when the APK is built (see docs/SETUP.md).
 * Both values are public by design: never put a service_role / secret key here.
 */
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const key = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

export function isValidSupabaseUrl(value: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)\/?$/i.test(value);
}

export const env = {
  supabaseUrl: url.replace(/\/$/, ''),
  supabaseKey: key,
};

export const missingConfig: string[] = [
  ...(isValidSupabaseUrl(url) ? [] : ['EXPO_PUBLIC_SUPABASE_URL']),
  ...(key.length > 20 ? [] : ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']),
];

export const isConfigured = missingConfig.length === 0;
