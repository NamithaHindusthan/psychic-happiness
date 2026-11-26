import { Text, View } from 'react-native';

import { Body, Card, Pill, Screen, Title } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function HomeScreen() {
  const { profile, isAdmin } = useAuth();
  const { colors } = useTheme();
  const firstName = profile?.full_name.split(' ')[0] || 'there';

  return (
    <Screen>
      <Title>Hello, {firstName}</Title>
      <Body>You are signed in and your account is active.</Body>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Your workspace</Text>
          <Pill label={isAdmin ? 'Admin' : 'Member'} tone="accent" />
        </View>
        <Text style={{ color: colors.textMuted, marginTop: 8, lineHeight: 20 }}>
          Accounts and invites are working. Projects, tasks, attachments and reviews arrive in the next stages.
        </Text>
      </Card>

      {isAdmin ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Invite your team</Text>
          <Text style={{ color: colors.textMuted, marginTop: 8, lineHeight: 20 }}>
            Open the People tab, add each person&apos;s email, then ask them to install TaskNest and tap Create account with
            that email.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
