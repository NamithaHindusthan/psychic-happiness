import { useState } from 'react';
import { Alert, RefreshControl, Text, View } from 'react-native';

import { Banner, Body, Button, Card, Pill, Screen, TextField, Title } from '@/components/ui';
import type { AppRole, Profile } from '@/features/auth/types';
import {
  useCancelInvite,
  useInviteMember,
  useInvites,
  useMembers,
  useSetAccess,
  useSetRole,
} from '@/features/people/api';
import { validateEmail } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function PeopleScreen() {
  const { colors } = useTheme();
  const { profile: me, isAdmin } = useAuth();
  const members = useMembers();
  const invites = useInvites(isAdmin);
  const invite = useInviteMember();
  const cancel = useCancelInvite();
  const setRole = useSetRole();
  const setAccess = useSetAccess();

  const [email, setEmail] = useState('');
  const [role, setRoleChoice] = useState<AppRole>('member');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  if (!isAdmin) {
    return (
      <Screen>
        <Title>People</Title>
        <Body>Only admins can manage people.</Body>
      </Screen>
    );
  }

  const refreshing = members.isRefetching || invites.isRefetching;
  const refresh = () => {
    void members.refetch();
    void invites.refetch();
  };

  const onInvite = () => {
    setMessage(null);
    const problem = validateEmail(email);
    setEmailError(problem);
    if (problem) return;
    invite.mutate(
      { email, role },
      {
        onSuccess: () => {
          setMessage({
            kind: 'success',
            text: `${email.trim().toLowerCase()} can now create an account in the app.`,
          });
          setEmail('');
        },
        onError: (e) => setMessage({ kind: 'error', text: e.message }),
      },
    );
  };

  const fail = (e: Error) => setMessage({ kind: 'error', text: e.message });

  const confirmAccess = (person: Profile, makeActive: boolean) => {
    Alert.alert(
      makeActive ? 'Restore access?' : 'Remove access?',
      makeActive
        ? `${person.full_name || person.email} will be able to sign in again.`
        : `${person.full_name || person.email} will be signed out and unable to use TaskNest. Their past work stays on record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: makeActive ? 'Restore' : 'Remove',
          style: makeActive ? 'default' : 'destructive',
          onPress: () => {
            setMessage(null);
            setAccess.mutate({ id: person.id, active: makeActive }, { onError: fail });
          },
        },
      ],
    );
  };

  const toggleRole = (person: Profile) => {
    const next: AppRole = person.role === 'admin' ? 'member' : 'admin';
    Alert.alert(
      next === 'admin' ? 'Make admin?' : 'Make member?',
      next === 'admin'
        ? `${person.full_name || person.email} will be able to invite and remove people.`
        : `${person.full_name || person.email} will no longer be able to manage people.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setMessage(null);
            setRole.mutate({ id: person.id, role: next }, { onError: fail });
          },
        },
      ],
    );
  };

  const confirmCancelInvite = (id: string, inviteEmail: string) => {
    Alert.alert('Cancel invite?', `${inviteEmail} will no longer be able to create an account.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel invite',
        style: 'destructive',
        onPress: () => cancel.mutate(id, { onError: fail }),
      },
    ]);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <Title>People</Title>
      <Body>Invite teammates and manage who has access.</Body>

      {message ? <Banner kind={message.kind}>{message.text}</Banner> : null}

      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Invite someone</Text>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="teammate@example.com"
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Member" variant={role === 'member' ? 'primary' : 'secondary'} onPress={() => setRoleChoice('member')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Admin" variant={role === 'admin' ? 'primary' : 'secondary'} onPress={() => setRoleChoice('admin')} />
          </View>
        </View>
        <Button title="Send invite" onPress={onInvite} loading={invite.isPending} />
      </Card>

      {invites.data && invites.data.length > 0 ? (
        <>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginVertical: 8 }}>
            Waiting to join ({invites.data.length})
          </Text>
          {invites.data.map((inv) => (
            <Card key={inv.id}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{inv.email}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Pill label={inv.role === 'admin' ? 'Admin' : 'Member'} />
                <Button title="Cancel invite" variant="secondary" onPress={() => confirmCancelInvite(inv.id, inv.email)} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginVertical: 8 }}>
        Team{members.data ? ` (${members.data.length})` : ''}
      </Text>
      {members.isError ? <Banner kind="error">Could not load the team. Pull down to retry.</Banner> : null}
      {members.data?.map((person) => {
        const isMe = person.id === me?.id;
        return (
          <Card key={person.id}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
              {person.full_name || person.email}
              {isMe ? ' (you)' : ''}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 2 }}>{person.email}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pill label={person.role === 'admin' ? 'Admin' : 'Member'} tone="accent" />
              {!person.is_active ? <Pill label="Access removed" tone="danger" /> : null}
            </View>
            {!isMe ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {person.is_active ? (
                  <View style={{ flex: 1 }}>
                    <Button
                      title={person.role === 'admin' ? 'Make member' : 'Make admin'}
                      variant="secondary"
                      onPress={() => toggleRole(person)}
                    />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Button
                    title={person.is_active ? 'Remove access' : 'Restore access'}
                    variant={person.is_active ? 'danger' : 'secondary'}
                    onPress={() => confirmAccess(person, !person.is_active)}
                  />
                </View>
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
