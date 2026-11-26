import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Banner, Body, Button, LinkText, Screen, TextField, Title } from '@/components/ui';
import { requestPasswordReset } from '@/features/auth/api';
import { normalizeEmail, validateEmail } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setFormError(null);
    const problem = validateEmail(email);
    setError(problem);
    if (problem) return;
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    router.push({ pathname: '/reset-password', params: { email: normalizeEmail(email) } });
  };

  return (
    <Screen>
      <Title>Reset your password</Title>
      <Body>Enter your email and we will send you a code to choose a new password.</Body>

      {formError ? <Banner kind="error">{formError}</Banner> : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        textContentType="emailAddress"
        placeholder="you@example.com"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />
      <Button title="Send code" onPress={() => void onSubmit()} loading={loading} />
      <LinkText title="Back to sign in" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
