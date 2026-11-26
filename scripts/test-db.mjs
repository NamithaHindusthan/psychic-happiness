/**
 * Tests the SQL migrations (invite-only sign-up, roles, Row Level Security) against
 * a real in-memory Postgres (PGlite). Supabase's `auth` schema and roles are mocked
 * the same way Supabase provides them.
 *
 * Run: npm run test:db
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite();

let passed = 0;
let failed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'assertion failed');
}

/** Run SQL as a given Supabase-style actor. */
async function as(actor, fn) {
  await db.exec('reset role');
  if (actor === 'anon') {
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec('set role anon');
  } else if (actor) {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [actor]);
    await db.exec('set role authenticated');
  } else {
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  }
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

async function rejects(promise, pattern) {
  try {
    await promise;
  } catch (e) {
    if (pattern && !pattern.test(e.message)) {
      throw new Error(`rejected with unexpected message: ${e.message}`);
    }
    return;
  }
  throw new Error('expected the statement to be rejected, but it succeeded');
}

// ---------- Mock the parts of Supabase the migration depends on ----------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    banned_until timestamptz
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Supabase grants everything on new public objects to its API roles by default;
  -- the migration must tighten this, so reproduce the default before running it.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);

const migrationsDir = process.env.MIGRATIONS_DIR ?? join(root, 'supabase', 'migrations');
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  console.log(`applied ${file}`);
}

const signUp = (email, name) =>
  db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, JSON.stringify(name ? { full_name: name } : {})],
  );

console.log('\nInvite-only sign-up');

await check('sign-up without an invite is rejected', async () => {
  await rejects(signUp('stranger@example.com', 'Stranger'), /not_invited/);
  const { rows } = await db.query(`select count(*)::int as n from auth.users`);
  assert(rows[0].n === 0, 'user row must be rolled back');
});

await db.exec(`insert into public.invites (email, role) values ('  Owner@Example.com ', 'admin')`);

await check('invite email is trimmed and lower-cased', async () => {
  const { rows } = await db.query(`select email from public.invites`);
  assert(rows[0].email === 'owner@example.com', rows[0].email);
});

let adminId;
await check('invited sign-up (different letter case) creates an admin profile', async () => {
  const { rows } = await signUp('OWNER@example.com', '  Olivia Owner ');
  adminId = rows[0].id;
  const p = (await db.query(`select * from public.profiles where id = $1`, [adminId])).rows[0];
  assert(p, 'profile missing');
  assert(p.role === 'admin', `role was ${p.role}`);
  assert(p.full_name === 'Olivia Owner', `name was "${p.full_name}"`);
  assert(p.email === 'owner@example.com', p.email);
  assert(p.is_active === true, 'should be active');
});

await check('invite is marked accepted', async () => {
  const { rows } = await db.query(`select accepted_at from public.invites`);
  assert(rows[0].accepted_at !== null, 'accepted_at not set');
});

await check('name falls back to the email prefix when none is given', async () => {
  await db.exec(`insert into public.invites (email) values ('fallback@example.com')`);
  const { rows } = await signUp('fallback@example.com', null);
  const p = (await db.query(`select full_name, role from public.profiles where id = $1`, [rows[0].id])).rows[0];
  assert(p.full_name === 'fallback' && p.role === 'member', JSON.stringify(p));
});

console.log('\nAdmin invites (RLS)');

await check('duplicate invites for the same email (any case) are rejected', async () => {
  await as(adminId, () =>
    rejects(db.exec(`insert into public.invites (email) values ('OWNER@example.com')`), /duplicate|unique/i),
  );
});

await check('admin can create an invite; invited_by is filled in automatically', async () => {
  await as(adminId, () => db.exec(`insert into public.invites (email, role) values ('mia@example.com', 'member')`));
  const { rows } = await db.query(`select invited_by from public.invites where email = 'mia@example.com'`);
  assert(rows[0].invited_by === adminId, 'invited_by should be the admin');
});

await check('admin cannot forge invited_by or accepted_at', async () => {
  await as(adminId, () =>
    rejects(
      db.exec(`insert into public.invites (email, accepted_at) values ('x@example.com', now())`),
      /permission denied/i,
    ),
  );
  await as(adminId, () =>
    rejects(
      db.exec(`insert into public.invites (email, invited_by) values ('y@example.com', gen_random_uuid())`),
      /permission denied/i,
    ),
  );
});

let miaId;
await check('invited member signs up with the member role', async () => {
  const { rows } = await signUp('mia@example.com', 'Mia Member');
  miaId = rows[0].id;
  const p = (await db.query(`select role from public.profiles where id = $1`, [miaId])).rows[0];
  assert(p.role === 'member', p.role);
});

await check('member cannot read, create or delete invites', async () => {
  await as(miaId, async () => {
    const { rows } = await db.query(`select * from public.invites`);
    assert(rows.length === 0, `member saw ${rows.length} invites`);
    await rejects(db.exec(`insert into public.invites (email) values ('z@example.com')`), /row-level security|permission/i);
    const del = await db.query(`delete from public.invites returning id`);
    assert(del.rows.length === 0, 'member deleted invites');
  });
});

await check('admin can see invites and cancel a pending one, but not an accepted one', async () => {
  await db.exec(`insert into public.invites (email) values ('pending@example.com')`);
  await as(adminId, async () => {
    const all = await db.query(`select email, accepted_at from public.invites`);
    assert(all.rows.length >= 4, `admin saw ${all.rows.length}`);
    const del = await db.query(`delete from public.invites where email = 'pending@example.com' returning id`);
    assert(del.rows.length === 1, 'pending invite should be deletable');
    const delAccepted = await db.query(`delete from public.invites where email = 'mia@example.com' returning id`);
    assert(delAccepted.rows.length === 0, 'accepted invite must not be deletable');
  });
});

console.log('\nProfiles (RLS + column privileges)');

await check('anonymous visitors cannot read profiles or invites', async () => {
  await as('anon', async () => {
    await rejects(db.query(`select * from public.profiles`), /permission denied/i);
    await rejects(db.query(`select * from public.invites`), /permission denied/i);
  });
});

await check('members can see the whole team', async () => {
  await as(miaId, async () => {
    const { rows } = await db.query(`select id from public.profiles`);
    assert(rows.length === 3, `saw ${rows.length} profiles`);
  });
});

await check('member can update their own name', async () => {
  await as(miaId, async () => {
    const r = await db.query(`update public.profiles set full_name = 'Mia M.' where id = $1 returning full_name`, [miaId]);
    assert(r.rows[0]?.full_name === 'Mia M.', 'name not updated');
  });
});

await check('member cannot promote themselves or reactivate themselves', async () => {
  await as(miaId, async () => {
    await rejects(db.query(`update public.profiles set role = 'admin' where id = $1`, [miaId]), /permission denied/i);
    await rejects(db.query(`update public.profiles set is_active = true where id = $1`, [miaId]), /permission denied/i);
    await rejects(db.query(`update public.profiles set email = 'evil@example.com' where id = $1`, [miaId]), /permission denied/i);
  });
});

await check("member cannot edit someone else's profile", async () => {
  await as(miaId, async () => {
    const r = await db.query(`update public.profiles set full_name = 'Hacked' where id = $1 returning id`, [adminId]);
    assert(r.rows.length === 0, 'updated another user');
  });
});

await check('nobody can insert or delete profiles directly', async () => {
  await as(adminId, async () => {
    await rejects(
      db.query(`insert into public.profiles (id, email) values (gen_random_uuid(), 'a@b.co')`),
      /permission denied/i,
    );
    await rejects(db.query(`delete from public.profiles where id = $1`, [miaId]), /permission denied/i);
  });
});

console.log('\nAdmin functions');

await check('members cannot call admin functions', async () => {
  await as(miaId, async () => {
    await rejects(db.query(`select public.admin_set_role($1, 'admin')`, [adminId]), /not admin/i);
    await rejects(db.query(`select public.admin_set_member_access($1, false)`, [adminId]), /not admin/i);
  });
});

await check('anonymous visitors cannot call admin functions', async () => {
  await as('anon', () =>
    rejects(db.query(`select public.admin_set_role($1, 'admin')`, [miaId]), /permission denied/i),
  );
});

await check('admin cannot change their own role or access', async () => {
  await as(adminId, async () => {
    await rejects(db.query(`select public.admin_set_role($1, 'member')`, [adminId]), /own role/i);
    await rejects(db.query(`select public.admin_set_member_access($1, false)`, [adminId]), /own access/i);
  });
});

await check('admin can promote and demote another member', async () => {
  await as(adminId, async () => {
    await db.query(`select public.admin_set_role($1, 'admin')`, [miaId]);
  });
  let r = await db.query(`select role from public.profiles where id = $1`, [miaId]);
  assert(r.rows[0].role === 'admin', 'not promoted');
  await as(adminId, () => db.query(`select public.admin_set_role($1, 'member')`, [miaId]));
  r = await db.query(`select role from public.profiles where id = $1`, [miaId]);
  assert(r.rows[0].role === 'member', 'not demoted');
});

await check('admin function reports unknown users', async () => {
  await as(adminId, () =>
    rejects(db.query(`select public.admin_set_role(gen_random_uuid(), 'member')`), /not found/i),
  );
});

await check('removing access deactivates, bans sign-in and hides the team', async () => {
  await as(adminId, () => db.query(`select public.admin_set_member_access($1, false)`, [miaId]));
  const p = (await db.query(`select is_active from public.profiles where id = $1`, [miaId])).rows[0];
  assert(p.is_active === false, 'still active');
  const u = (await db.query(`select banned_until > now() as banned from auth.users where id = $1`, [miaId])).rows[0];
  assert(u.banned === true, 'not banned');

  await as(miaId, async () => {
    const own = await db.query(`select id, is_active from public.profiles`);
    assert(own.rows.length === 1 && own.rows[0].id === miaId, `removed user saw ${own.rows.length} profiles`);
    assert(own.rows[0].is_active === false, 'removed user should see is_active=false');
    const upd = await db.query(`update public.profiles set full_name = 'still here' where id = $1 returning id`, [miaId]);
    assert(upd.rows.length === 0, 'removed user could still edit their profile');
    await rejects(db.query(`select public.admin_set_role($1, 'admin')`, [miaId]), /not admin/i);
  });
});

await check('a removed ADMIN loses admin powers immediately', async () => {
  await as(adminId, () => db.query(`select public.admin_set_role($1, 'admin')`, [miaId]));
  // Mia is deactivated, so even as admin she must be locked out.
  await as(miaId, async () => {
    await rejects(db.exec(`insert into public.invites (email) values ('late@example.com')`), /row-level security/i);
  });
  await as(adminId, () => db.query(`select public.admin_set_role($1, 'member')`, [miaId]));
});

await check('reactivating restores access and clears the ban', async () => {
  await as(adminId, () => db.query(`select public.admin_set_member_access($1, true)`, [miaId]));
  const u = (await db.query(`select banned_until from auth.users where id = $1`, [miaId])).rows[0];
  assert(u.banned_until === null, 'ban not cleared');
  await as(miaId, async () => {
    const { rows } = await db.query(`select id from public.profiles`);
    assert(rows.length === 3, `saw ${rows.length}`);
  });
});

await check('helper functions are not callable by anonymous visitors', async () => {
  await as('anon', async () => {
    await rejects(db.query(`select public.is_admin()`), /permission denied/i);
    await rejects(db.query(`select public.handle_new_user()`), /permission denied/i);
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log(`Failed: ${failures.join('; ')}`);
  process.exit(1);
}
