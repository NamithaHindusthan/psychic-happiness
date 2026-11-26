import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PROFILE_COLUMNS, type AppRole, type Profile } from '@/features/auth/types';
import { dataErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/validation';

export type Invite = {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  accepted_at: string | null;
};

const MEMBERS_KEY = ['members'] as const;
const INVITES_KEY = ['invites'] as const;

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(dataErrorMessage(error));
  return data as T;
}

export function useMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: async () => {
      const rows = await unwrap<Profile[]>(
        supabase.from('profiles').select(PROFILE_COLUMNS).order('full_name', { ascending: true }),
      );
      return rows ?? [];
    },
  });
}

export function useInvites(enabled: boolean) {
  return useQuery({
    queryKey: INVITES_KEY,
    enabled,
    queryFn: async () => {
      const rows = await unwrap<Invite[]>(
        supabase
          .from('invites')
          .select('id,email,role,created_at,accepted_at')
          .is('accepted_at', null)
          .order('created_at', { ascending: false }),
      );
      return rows ?? [];
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: AppRole }) => {
      const { error } = await supabase
        .from('invites')
        .insert({ email: normalizeEmail(input.email), role: input.role });
      if (error) {
        if (error.code === '23505') throw new Error('That email has already been invited.');
        throw new Error(dataErrorMessage(error));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await unwrap(supabase.from('invites').delete().eq('id', id).select('id'));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INVITES_KEY }),
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; role: AppRole }) => {
      const { error } = await supabase.rpc('admin_set_role', { target: input.id, new_role: input.role });
      if (error) throw new Error(dataErrorMessage(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useSetAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const { error } = await supabase.rpc('admin_set_member_access', {
        target: input.id,
        make_active: input.active,
      });
      if (error) throw new Error(dataErrorMessage(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useUpdateMyName() {
  return useMutation({
    mutationFn: async (input: { id: string; fullName: string }) => {
      const rows = await unwrap<Profile[]>(
        supabase
          .from('profiles')
          .update({ full_name: input.fullName.trim() })
          .eq('id', input.id)
          .select(PROFILE_COLUMNS),
      );
      const updated = rows?.[0];
      if (!updated) throw new Error('Could not save your name. Please try again.');
      return updated;
    },
  });
}
