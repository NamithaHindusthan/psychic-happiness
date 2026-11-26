jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import * as api from '@/features/auth/api';

const mockAuthApi = supabase.auth as unknown as {
  signUp: jest.Mock;
  signInWithPassword: jest.Mock;
  verifyOtp: jest.Mock;
  resend: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  updateUser: jest.Mock;
  signOut: jest.Mock;
};

beforeEach(() => jest.clearAllMocks());

describe('signUp', () => {
  it('sends a normalised email and the trimmed name', async () => {
    mockAuthApi.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    const r = await api.signUp('  New@User.COM ', 'secret123', ' Nia ');
    expect(mockAuthApi.signUp).toHaveBeenCalledWith({
      email: 'new@user.com',
      password: 'secret123',
      options: { data: { full_name: 'Nia' } },
    });
    expect(r).toEqual({ ok: true, data: 'needs_verification' });
  });

  it('reports an existing account hidden behind a fake success', async () => {
    mockAuthApi.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    const r = await api.signUp('a@b.co', 'secret123', 'A B');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('already_registered');
  });

  it('turns the invite-check database error into a clear message', async () => {
    mockAuthApi.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Database error saving new user', status: 500 } });
    const r = await api.signUp('x@y.co', 'secret123', 'X Y');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe('not_invited');
      expect(r.message).toMatch(/invited/);
    }
  });

  it('returns signed_in when a session comes back directly', async () => {
    mockAuthApi.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: { access_token: 't' } }, error: null });
    expect(await api.signUp('a@b.co', 'secret123', 'A B')).toEqual({ ok: true, data: 'signed_in' });
  });

  it('never throws on network failure', async () => {
    mockAuthApi.signUp.mockRejectedValue(new TypeError('Network request failed'));
    const r = await api.signUp('a@b.co', 'secret123', 'A B');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('network');
  });
});

describe('signIn', () => {
  it('maps wrong credentials and unverified email', async () => {
    mockAuthApi.signInWithPassword.mockResolvedValueOnce({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
    const a = await api.signIn('a@b.co', 'x');
    expect(!a.ok && a.kind).toBe('invalid_credentials');
    mockAuthApi.signInWithPassword.mockResolvedValueOnce({ error: { code: 'email_not_confirmed', message: 'Email not confirmed' } });
    const b = await api.signIn('a@b.co', 'x');
    expect(!b.ok && b.kind).toBe('email_not_confirmed');
  });
  it('succeeds', async () => {
    mockAuthApi.signInWithPassword.mockResolvedValue({ error: null });
    expect((await api.signIn(' A@B.co ', 'pw')).ok).toBe(true);
    expect(mockAuthApi.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'pw' });
  });
});

describe('codes and password reset', () => {
  it('verifies signup and recovery codes with the right type and digits only', async () => {
    mockAuthApi.verifyOtp.mockResolvedValue({ error: null });
    await api.verifySignupCode('A@B.co', '123 456');
    expect(mockAuthApi.verifyOtp).toHaveBeenLastCalledWith({ email: 'a@b.co', token: '123456', type: 'signup' });
    await api.verifyRecoveryCode('A@B.co', '654321');
    expect(mockAuthApi.verifyOtp).toHaveBeenLastCalledWith({ email: 'a@b.co', token: '654321', type: 'recovery' });
  });
  it('reports a wrong code', async () => {
    mockAuthApi.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired', message: 'Token has expired or is invalid' } });
    const r = await api.verifyRecoveryCode('a@b.co', '000000');
    expect(!r.ok && r.kind).toBe('bad_code');
  });
  it('requests a reset and updates the password', async () => {
    mockAuthApi.resetPasswordForEmail.mockResolvedValue({ error: null });
    mockAuthApi.updateUser.mockResolvedValue({ error: null });
    expect((await api.requestPasswordReset(' A@B.co')).ok).toBe(true);
    expect(mockAuthApi.resetPasswordForEmail).toHaveBeenCalledWith('a@b.co');
    expect((await api.updatePassword('newpass123')).ok).toBe(true);
    expect(mockAuthApi.updateUser).toHaveBeenCalledWith({ password: 'newpass123' });
  });
  it('signOut swallows errors', async () => {
    mockAuthApi.signOut.mockRejectedValue(new Error('offline'));
    await expect(api.signOut()).resolves.toBeUndefined();
  });
});
