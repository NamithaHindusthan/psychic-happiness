import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Banner, Body, Button, LinkText, Screen, TextField, Title } from '@/components/ui';
import { requestPasswordReset, updatePassword, verifyRecoveryCode } from '@/features/auth/api';
import { normalizeOtp, validateConfirmPassword, validateOtp, validatePassword } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Two steps on one screen:
 *   1. enter the emailed code  -> a temporary session is created
 *   2. choose a new password   -> then we sign out and ask for a fresh sign-in
 * While this is in progress `recovering` keeps the navigator from jumping into the app.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { beginRecovery, endRecovery, showNotice, signOut } = useAuth();

  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    setFormError(null);
    setInfo(null);
    const problem = validateOtp(code);
    setErrors({ code: problem });
    if (problem) return;
    setLoading(true);
    beginRecovery();
    const result = await verifyRecoveryCode(email, code);
    setLoading(false);
    if (!result.ok) {
      endRecovery();
      setFormError(result.message);
      return;
    }
    setStep('password');
  };

  const onSave = async () => {
    setFormError(null);
    const next = {
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setLoading(true);
    const result = await updatePassword(password);
    if (!result.ok) {
      setLoading(false);
      setFormError(result.message);
      return;
    }
    await signOut(); // also ends recovery
    setLoading(false);
    showNotice({ kind: 'success', text: 'Password updated. Sign in with your new password.' });
    router.replace('/login');
  };

  const onResend = async () => {
    setFormError(null);
    const result = await requestPasswordReset(email);
    if (result.ok) setInfo('If that email has an account, a new code is on its way.');
    else setFormError(result.message);
  };

  const onCancel = async () => {
    if (step === 'password') await signOut();
    else endRecovery();
    router.replace('/login');
  };

  if (step === 'code') {
    return (
      <Screen>
        <Title>Enter your code</Title>
        <Body>If {email || 'that email'} has an account, we sent it a code. Enter it below.</Body>

        {formError ? <Banner kind="error">{formError}</Banner> : null}
        {info ? <Banner kind="success">{info}</Banner> : null}

        <TextField
          label="Code from your email"
          value={code}
          onChangeText={(v) => setCode(normalizeOtp(v).slice(0, 10))}
          error={errors.code}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="123456"
          maxLength={10}
          returnKeyType="go"
          onSubmitEditing={() => void onVerify()}
        />
        <Button title="Continue" onPress={() => void onVerify()} loading={loading} />
        <LinkText title="Send a new code" onPress={() => void onResend()} />
        <LinkText title="Back to sign in" onPress={() => void onCancel()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Choose a new password</Title>
      <Body>Pick something you have not used before. At least 8 characters with letters and numbers.</Body>

      {formError ? <Banner kind="error">{formError}</Banner> : null}

      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void onSave()}
      />
      <Button title="Save new password" onPress={() => void onSave()} loading={loading} />
      <LinkText title="Cancel" onPress={() => void onCancel()} />
    </Screen>
  );
}
