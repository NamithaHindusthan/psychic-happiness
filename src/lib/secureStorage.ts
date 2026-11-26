import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter for supabase-js backed by the Android Keystore (expo-secure-store).
 * Keys are sanitised because SecureStore only allows [A-Za-z0-9._-].
 * Failures never throw: a failed read behaves like "not signed in".
 */
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(safeKey(key));
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(safeKey(key), value);
    } catch {
      // Ignore: the session will simply not persist across launches.
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(safeKey(key));
    } catch {
      // Ignore.
    }
  },
};
