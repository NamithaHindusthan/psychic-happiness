import * as SecureStore from 'expo-secure-store';

import { secureStorage } from '@/lib/secureStorage';

describe('secureStorage', () => {
  it('round-trips and removes values', async () => {
    await secureStorage.setItem('sb-abc-auth-token', '{"a":1}');
    expect(await secureStorage.getItem('sb-abc-auth-token')).toBe('{"a":1}');
    await secureStorage.removeItem('sb-abc-auth-token');
    expect(await secureStorage.getItem('sb-abc-auth-token')).toBeNull();
  });

  it('sanitises keys to what SecureStore allows', async () => {
    await secureStorage.setItem('sb:weird key/with#chars', 'v');
    expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith('sb_weird_key_with_chars', 'v');
  });

  it('never throws when the keystore fails', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keystore'));
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keystore'));
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keystore'));
    await expect(secureStorage.getItem('k')).resolves.toBeNull();
    await expect(secureStorage.setItem('k', 'v')).resolves.toBeUndefined();
    await expect(secureStorage.removeItem('k')).resolves.toBeUndefined();
  });
});
