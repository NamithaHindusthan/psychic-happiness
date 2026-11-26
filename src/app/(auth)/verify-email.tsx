import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Banner, Body, Button, LinkText, Screen, TextField, Title } from '@/components/ui';
import { resendSignupCode, verifySignupCode } from '@/features/auth/api';
import { normalizeOtp, validateOtp } from '@/lib/validation';

const RESEND_SECONDS = 30;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const onVerify = async () => {
    setInfo(null);
    const problem = validateOtp(code);
    setError(problem);
    if (problem) return;
    setLoading(true);
    const result = await verifySignupCode(email, code);
    setLoading(false);
    if (!result.ok) setError(result.message);
    // On success a session exists and the navigator switches to the app by itself.
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    const result = await resendSignupCode(email);
    if (result.ok) {
      setInfo('A new code is on its way.');
      setCooldown(RESEND_SECONDS);
    } else {
      setError(result.message);
    }
  };

  return (
    <Screen>
      <Title>Check your email</Title>
      <Body>
        We sent a verification code to {email || 'your email'}. Enter it below to finish creating your account.
      </Body>

      {error ? <Banner kind="error">{error}</Banner> : null}
      {info ? <Banner kind="success">{info}</Banner> : null}

      <TextField
        label="Verification code"
        value={code}
        onChangeText={(v) => setCode(normalizeOtp(v).slice(0, 10))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        placeholder="123456"
        maxLength={10}
        returnKeyType="go"
        onSubmitEditing={() => void onVerify()}
      />
      <Button title="Verify and continue" onPress={() => void onVerify()} loading={loading} />
      <LinkText
        title={cooldown > 0 ? `Send a new code (${cooldown}s)` : 'Send a new code'}
        onPress={() => {
          if (cooldown <= 0) void onResend();
        }}
      />
      <LinkText title="Back to sign in" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
