import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner, Brand, Button, LinkText, Screen, TextField } from '@/components/ui';
import { resendSignupCode, signIn } from '@/features/auth/api';
import { normalizeEmail, validateEmail, validateLoginPassword } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { notice, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    clearNotice();
    setFormError(null);
    setNeedsVerification(false);
    const next = { email: validateEmail(email), password: validateLoginPassword(password) };
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      setNeedsVerification(result.kind === 'email_not_confirmed');
    }
    // On success the navigator switches to the app by itself.
  };

  const goVerify = async () => {
    setLoading(true);
    await resendSignupCode(email); // best effort; the screen has its own resend button
    setLoading(false);
    router.push({ pathname: '/verify-email', params: { email: normalizeEmail(email) } });
  };

  return (
    <Screen>
      <Brand subtitle="Plan, assign and review work together." />

      {notice ? <Banner kind={notice.kind}>{notice.text}</Banner> : null}
      {formError ? <Banner kind="error">{formError}</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        textContentType="emailAddress"
        placeholder="you@example.com"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        placeholder="Your password"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />

      <Button title="Sign in" onPress={() => void onSubmit()} loading={loading} />
      {needsVerification ? (
        <Button title="Enter verification code" variant="secondary" onPress={() => void goVerify()} disabled={loading} />
      ) : null}

      <View style={{ marginTop: 8 }}>
        <LinkText title="Forgot password?" onPress={() => router.push({ pathname: '/forgot-password', params: { email: normalizeEmail(email) } })} />
        <LinkText title="New here? Create an account" onPress={() => router.push('/sign-up')} />
      </View>
    </Screen>
  );
}
