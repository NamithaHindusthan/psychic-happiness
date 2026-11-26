import Constants from 'expo-constants';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Banner, Body, Button, Card, Pill, Screen, TextField, Title } from '@/components/ui';
import { useUpdateMyName } from '@/features/people/api';
import { validateFullName } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProfileScreen() {
  const { profile, setProfile, signOut, isAdmin } = useAuth();
  const { colors } = useTheme();
  const update = useUpdateMyName();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return null;

  const onSave = () => {
    setSaved(false);
    const problem = validateFullName(name);
    setError(problem);
    if (problem) return;
    update.mutate(
      { id: profile.id, fullName: name },
      {
        onSuccess: (next) => {
          setProfile(next);
          setSaved(true);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Screen>
      <Title>Profile</Title>
      <Body>Signed in as {profile.email}</Body>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Role</Text>
          <Pill label={isAdmin ? 'Admin' : 'Member'} tone="accent" />
        </View>
      </Card>

      {saved ? <Banner kind="success">Name saved.</Banner> : null}
      <TextField
        label="Full name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setSaved(false);
        }}
        error={error}
        autoCapitalize="words"
        autoComplete="name"
      />
      <Button
        title="Save name"
        onPress={onSave}
        loading={update.isPending}
        disabled={name.trim() === profile.full_name}
      />

      <View style={{ height: 24 }} />
      <Button
        title="Sign out"
        variant="secondary"
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void signOut();
        }}
      />
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 12 }}>
        TaskNest {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}
