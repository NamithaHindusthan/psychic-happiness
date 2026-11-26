/**
 * Turns raw Supabase / network errors into messages a person can act on.
 * Matching is done on the stable `code` first and on message text second.
 */
export type ErrorLike = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'not_invited'
  | 'already_registered'
  | 'weak_password'
  | 'bad_code'
  | 'rate_limited'
  | 'email_send_failed'
  | 'network'
  | 'banned'
  | 'unknown';

export function classifyAuthError(error: ErrorLike): AuthErrorKind {
  if (!error) return 'unknown';
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'invalid_credentials';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'email_not_confirmed';
  }
  if (code === 'user_banned' || message.includes('user is banned') || message.includes('banned')) {
    return 'banned';
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'already_registered';
  }
  if (code === 'weak_password' || message.includes('password should be') || message.includes('weak password')) {
    return 'weak_password';
  }
  if (
    code === 'otp_expired' ||
    code === 'otp_disabled' ||
    message.includes('token has expired') ||
    message.includes('invalid or has expired') ||
    message.includes('otp')
  ) {
    return 'bad_code';
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    error.status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('for security purposes')
  ) {
    return 'rate_limited';
  }
  if (message.includes('error sending') || message.includes('email address not authorized')) {
    return 'email_send_failed';
  }
  // The invite check in the database trigger surfaces as a generic database error at sign-up.
  if (
    message.includes('not_invited') ||
    message.includes('database error saving new user') ||
    message.includes('database error creating new user')
  ) {
    return 'not_invited';
  }
  if (
    error.name === 'AuthRetryableFetchError' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('timeout')
  ) {
    return 'network';
  }
  return 'unknown';
}

const MESSAGES: Record<AuthErrorKind, string> = {
  invalid_credentials: 'That email or password is not right. Please try again.',
  email_not_confirmed: 'Your email is not verified yet. Enter the code we emailed you.',
  not_invited:
    'This email has not been invited. Ask an admin to invite you, then try again.',
  already_registered: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'That password is too weak. Use at least 8 characters with letters and numbers.',
  bad_code: 'That code is wrong or has expired. Check it, or request a new code.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  email_send_failed:
    'We could not send the email. Ask the admin to check the email (SMTP) settings.',
  network: 'No connection. Check your internet and try again.',
  banned: 'Your access has been removed. Contact an admin if this is a mistake.',
  unknown: 'Something went wrong. Please try again.',
};

export function authErrorMessage(error: ErrorLike): string {
  return MESSAGES[classifyAuthError(error)];
}

/** For non-auth calls (database / RPC). */
export function dataErrorMessage(error: ErrorLike): string {
  if (!error) return MESSAGES.unknown;
  const message = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';
  if (message.includes('network request failed') || message.includes('failed to fetch')) {
    return MESSAGES.network;
  }
  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'You do not have permission to do that.';
  }
  if (code === '23505') return 'That already exists.';
  if (message.includes('last admin')) return 'You cannot remove or demote the last admin.';
  if (message.includes('own role') || message.includes('yourself')) {
    return 'You cannot change your own role or access.';
  }
  if (message.includes('not admin')) return 'Only admins can do that.';
  return MESSAGES.unknown;
}
