/** Pure validation helpers. Each returns an error message, or null when the value is valid. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN_LENGTH = 8;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return 'Enter your email address.';
  if (email.length > 254 || !EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Enter a password.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > 72) return 'Use 72 characters or fewer.';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

/** For the login screen only: do not enforce strength rules on existing passwords. */
export function validateLoginPassword(value: string): string | null {
  return value ? null : 'Enter your password.';
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Re-enter your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export function validateFullName(value: string): string | null {
  const name = value.trim();
  if (name.length < 2) return 'Enter your name (at least 2 characters).';
  if (name.length > 60) return 'Use 60 characters or fewer.';
  return null;
}

export function normalizeOtp(value: string): string {
  return value.replace(/\D/g, '');
}

/** Supabase email codes are numeric; length is configurable (6 by default, up to 10). */
export function validateOtp(value: string): string | null {
  const code = normalizeOtp(value);
  if (!code) return 'Enter the code from your email.';
  if (code.length < 6 || code.length > 10) return 'The code has 6 to 10 digits.';
  return null;
}

export function firstError(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null;
}
