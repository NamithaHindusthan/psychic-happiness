import { authErrorMessage, classifyAuthError, type AuthErrorKind } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { normalizeEmail, normalizeOtp } from '@/lib/validation';

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string; kind: AuthErrorKind };

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (error: Parameters<typeof authErrorMessage>[0]): Result<never> => ({
  ok: false,
  message: authErrorMessage(error),
  kind: classifyAuthError(error),
});

/** Never let a thrown network error escape as a crash. */
async function guard<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch (e) {
    return fail(e as Error);
  }
}

export type SignUpOutcome = 'needs_verification' | 'signed_in';

export function signUp(email: string, password: string, fullName: string): Promise<Result<SignUpOutcome>> {
  return guard(async () => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return fail(error);
    // With email confirmation on, Supabase answers an already-registered address with a
    // fake "success" that has no identities, to avoid revealing which emails exist.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return fail({ code: 'user_already_exists' });
    }
    return ok<SignUpOutcome>(data.session ? 'signed_in' : 'needs_verification');
  });
}

export function signIn(email: string, password: string): Promise<Result> {
  return guard(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    return error ? fail(error) : ok(undefined);
  });
}

export function verifySignupCode(email: string, code: string): Promise<Result> {
  return guard(async () => {
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: normalizeOtp(code),
      type: 'signup',
    });
    return error ? fail(error) : ok(undefined);
  });
}

export function resendSignupCode(email: string): Promise<Result> {
  return guard(async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: normalizeEmail(email) });
    return error ? fail(error) : ok(undefined);
  });
}

export function requestPasswordReset(email: string): Promise<Result> {
  return guard(async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    return error ? fail(error) : ok(undefined);
  });
}

export function verifyRecoveryCode(email: string, code: string): Promise<Result> {
  return guard(async () => {
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: normalizeOtp(code),
      type: 'recovery',
    });
    return error ? fail(error) : ok(undefined);
  });
}

export function updatePassword(newPassword: string): Promise<Result> {
  return guard(async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? fail(error) : ok(undefined);
  });
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local session is cleared by supabase-js even if the network call fails.
  }
}
