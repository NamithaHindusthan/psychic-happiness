import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Banner, Body, Button, LinkText, Screen, TextField, Title } from '@/components/ui';
import { signUp } from '@/features/auth/api';
import {
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
} from '@/lib/validation';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setFormError(null);
    const next = {
      name: validateFullName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    const result = await signUp(email, password, name);
    setLoading(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    if (result.data === 'needs_verification') {
      router.replace({ pathname: '/verify-email', params: { email: normalizeEmail(email) } });
    }
    // 'signed_in' (email confirmation turned off): the navigator switches by itself.
  };

  return (
    <Screen>
      <Title>Create your account</Title>
      <Body>TaskNest is invite-only. Use the email address an admin invited.</Body>

      {formError ? <Banner kind="error">{formError}</Banner> : null}

      <TextField
        label="Full name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        placeholder="Your name"
      />
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
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 8 characters, letters and numbers"
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Repeat your password"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />

      <Button title="Create account" onPress={() => void onSubmit()} loading={loading} />
      <LinkText title="Already have an account? Sign in" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
