export type AppRole = 'admin' | 'member';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

export const PROFILE_COLUMNS = 'id,email,full_name,avatar_url,role,is_active,created_at';
