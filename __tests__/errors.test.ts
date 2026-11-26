import { authErrorMessage, classifyAuthError, dataErrorMessage } from '@/lib/errors';

describe('classifyAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'invalid_credentials'],
    [{ message: 'Invalid login credentials' }, 'invalid_credentials'],
    [{ code: 'email_not_confirmed', message: 'Email not confirmed' }, 'email_not_confirmed'],
    [{ message: 'Database error saving new user' }, 'not_invited'],
    [{ message: 'not_invited: this email has not been invited' }, 'not_invited'],
    [{ code: 'user_already_exists' }, 'already_registered'],
    [{ message: 'User already registered' }, 'already_registered'],
    [{ code: 'weak_password' }, 'weak_password'],
    [{ code: 'otp_expired', message: 'Token has expired or is invalid' }, 'bad_code'],
    [{ status: 429, message: 'x' }, 'rate_limited'],
    [{ code: 'over_email_send_rate_limit' }, 'rate_limited'],
    [{ message: 'Error sending confirmation email' }, 'email_send_failed'],
    [{ message: 'Email address not authorized' }, 'email_send_failed'],
    [{ name: 'AuthRetryableFetchError', message: 'x' }, 'network'],
    [{ message: 'Network request failed' }, 'network'],
    [{ code: 'user_banned' }, 'banned'],
    [{ message: 'something odd' }, 'unknown'],
  ])('%j -> %s', (error, kind) => {
    expect(classifyAuthError(error)).toBe(kind);
  });

  it('handles null / undefined safely', () => {
    expect(classifyAuthError(null)).toBe('unknown');
    expect(authErrorMessage(undefined)).toMatch(/went wrong/);
  });

  it('gives actionable, non-technical messages', () => {
    expect(authErrorMessage({ message: 'Database error saving new user' })).toMatch(/invited/);
    expect(authErrorMessage({ code: 'invalid_credentials' })).toMatch(/email or password/);
  });
});

describe('dataErrorMessage', () => {
  it('maps permission and duplicate errors', () => {
    expect(dataErrorMessage({ code: '42501', message: 'permission denied' })).toMatch(/permission/);
    expect(dataErrorMessage({ code: '23505', message: 'dup' })).toMatch(/already exists/);
    expect(dataErrorMessage({ message: 'You cannot change your own role.' })).toMatch(/own role/);
    expect(dataErrorMessage({ message: 'not admin' })).toMatch(/Only admins/);
    expect(dataErrorMessage({ message: 'Failed to fetch' })).toMatch(/connection/);
  });
});
