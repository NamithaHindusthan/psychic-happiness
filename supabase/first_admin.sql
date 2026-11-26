-- =====================================================================
-- Run ONCE, right after 001_auth_profiles.sql and BEFORE you sign up in the app.
--
-- 1. Replace you@example.com below with YOUR real email address
--    (keep the single quotes).
-- 2. Paste into Supabase dashboard -> SQL Editor -> New query -> Run.
-- 3. Open the app and use "Create account" with that same email.
--    You will be an admin and can invite everyone else from inside the app.
-- =====================================================================
insert into public.invites (email, role)
values ('you@example.com', 'admin');
