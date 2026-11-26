import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { Banner, Body, Brand, Button, Screen, Title } from '@/components/ui';
import { missingConfig } from '@/lib/env';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

/** Shown instead of a crash when the build has no Supabase settings. */
export function ConfigErrorScreen() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <Screen>
      <Brand />
      <Title>Setup incomplete</Title>
      <Body>
        This build of TaskNest is missing its connection settings, so it cannot reach the server. The person who built
        the app needs to add them and build again (see docs/SETUP.md).
      </Body>
      <Banner kind="error">Missing: {missingConfig.join(', ')}</Banner>
    </Screen>
  );
}

/** Shown when the account is fine but the profile could not be loaded (usually no internet). */
export function ProfileErrorScreen() {
  const { reloadProfile, signOut } = useAuth();
  return (
    <Screen>
      <Brand />
      <Title>Cannot reach TaskNest</Title>
      <Body>Check your internet connection, then try again. You are still signed in.</Body>
      <Button title="Try again" onPress={() => void reloadProfile()} />
      <View style={{ height: 8 }} />
      <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

export function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
