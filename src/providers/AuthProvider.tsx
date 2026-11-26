import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { signOut as apiSignOut } from '@/features/auth/api';
import { PROFILE_COLUMNS, type Profile } from '@/features/auth/types';
import { supabase } from '@/lib/supabase';

export type Notice = { kind: 'error' | 'success'; text: string };

type Status = 'loading' | 'signedOut' | 'signedIn' | 'error';

type AuthValue = {
  status: Status;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** True from the moment a password-reset code is verified until the new password is saved. */
  recovering: boolean;
  /** One-time message for the login screen (e.g. "your access was removed"). */
  notice: Notice | null;
  showNotice: (notice: Notice) => void;
  clearNotice: () => void;
  beginRecovery: () => void;
  endRecovery: () => void;
  reloadProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const REMOVED_MESSAGE = 'Your access has been removed. Contact an admin if this is a mistake.';

type ProfileResult =
  | { kind: 'ok'; profile: Profile }
  | { kind: 'removed' }
  | { kind: 'missing' }
  | { kind: 'error' };

async function fetchProfile(userId: string): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) return { kind: 'error' };
    if (!data) return { kind: 'missing' };
    const profile = data as Profile;
    return profile.is_active ? { kind: 'ok', profile } : { kind: 'removed' };
  } catch {
    return { kind: 'error' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [loadedProfile, setProfile] = useState<Profile | null>(null);
  // Which user the last profile-load failure (network) belonged to, if any.
  const [errorForUser, setErrorForUser] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const userId = session?.user.id ?? null;
  const latestUser = useRef<string | null>(null);

  useEffect(() => {
    latestUser.current = userId;
  }, [userId]);

  // A stored profile only counts while it belongs to the signed-in user.
  const profile = userId && loadedProfile?.id === userId ? loadedProfile : null;

  // 1) Restore the saved session, then follow sign-in / sign-out / token refresh.
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setSessionLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setSessionLoaded(true);
      });
    // Do not call other Supabase methods inside this callback; just record state.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoaded(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleResult = useCallback(async (forUser: string, result: ProfileResult) => {
    if (latestUser.current !== forUser) return; // signed out or switched user meanwhile
    if (result.kind === 'ok') {
      setProfile(result.profile);
      setErrorForUser(null);
      return;
    }
    if (result.kind === 'error') {
      setErrorForUser(forUser);
      return;
    }
    // Removed or missing profile: no access. Sign out and explain why.
    setNotice({
      kind: 'error',
      text: result.kind === 'removed' ? REMOVED_MESSAGE : 'We could not find your account. Contact an admin.',
    });
    setProfile(null);
    await apiSignOut();
  }, []);

  // 2) Load the profile (and therefore role / access) for the signed-in user.
  useEffect(() => {
    if (!sessionLoaded || !userId) return;
    let active = true;
    void fetchProfile(userId).then((result) => {
      if (active) void handleResult(userId, result);
    });
    return () => {
      active = false;
    };
  }, [sessionLoaded, userId, handleResult]);

  // 3) Re-check access whenever the app returns to the foreground, so a removed
  //    person is signed out soon after they next open the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const id = latestUser.current;
      if (state !== 'active' || !id) return;
      void fetchProfile(id).then((result) => {
        // A failed background check (offline) must not disturb a working session.
        if (result.kind !== 'error') void handleResult(id, result);
      });
    });
    return () => sub.remove();
  }, [handleResult]);

  const reloadProfile = useCallback(async () => {
    const id = latestUser.current;
    if (!id) return;
    setErrorForUser(null);
    await handleResult(id, await fetchProfile(id));
  }, [handleResult]);

  const signOut = useCallback(async () => {
    setRecovering(false);
    await apiSignOut();
  }, []);

  const status: Status = !sessionLoaded
    ? 'loading'
    : !session
      ? 'signedOut'
      : profile
        ? 'signedIn'
        : errorForUser === userId
          ? 'error'
          : 'loading';

  const value = useMemo<AuthValue>(
    () => ({
      status,
      session,
      profile,
      isAdmin: profile?.role === 'admin',
      recovering,
      notice,
      showNotice: setNotice,
      clearNotice: () => setNotice(null),
      beginRecovery: () => setRecovering(true),
      endRecovery: () => setRecovering(false),
      reloadProfile,
      setProfile,
      signOut,
    }),
    [status, session, profile, recovering, notice, reloadProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
