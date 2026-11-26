# TaskNest setup (phone only, free)

Everything below can be done in your phone's browser. Tip: on Supabase and GitHub, if a page looks cramped, use the browser menu → **Desktop site**.

Do the steps in order. Total time: about 25 minutes the first time.

---

## 1. Supabase (database + logins)

You already created the project. Now configure it.

### 1a. Create the tables and security rules
1. In your Supabase project, open **SQL Editor → New query**.
2. Open `supabase/migrations/001_auth_profiles.sql` from this repo on GitHub, tap **Copy raw file**, paste it into the editor and tap **Run**. You should see "Success. No rows returned".

### 1b. Make yourself the first admin
1. Open `supabase/first_admin.sql` on GitHub, copy it, and paste into a **New query**.
2. Replace `you@example.com` with **your real email** (keep the quotes) and tap **Run**.

### 1c. Make the emails send a code (important)
The app asks people to type a 6-digit code instead of tapping an email link.
1. **Authentication → Emails** (called *Email Templates* in some versions).
2. Open **Confirm sign up**. Replace the body with:
   ```html
   <h2>Welcome to TaskNest</h2>
   <p>Your verification code is:</p>
   <h1>{{ .Token }}</h1>
   <p>Enter it in the app to finish creating your account.</p>
   ```
   Save.
3. Open **Reset password**. Replace the body with:
   ```html
   <h2>Reset your TaskNest password</h2>
   <p>Your code is:</p>
   <h1>{{ .Token }}</h1>
   <p>If you did not ask for this, ignore this email.</p>
   ```
   Save.

### 1d. Auth settings
Open **Authentication → Sign In / Providers → Email** and check:
- **Enable email provider**: on
- **Confirm email**: **on**
- Minimum password length: 8

Leave "Allow new users to sign up" **on**. The database already rejects anyone who has not been invited, so sign-ups from strangers fail.

### 1e. Send emails to everyone (free Gmail option)
Supabase's built-in email only reaches your own team and allows 2 emails per hour. That is not enough, so connect a sender:
1. Use a Gmail account (a new one just for TaskNest is best). Turn on **2-Step Verification** in its Google account security settings.
2. Go to myaccount.google.com/apppasswords, create an app password named `tasknest`, and copy the 16 letters.
3. In Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP** and enter:
   - Sender email: your Gmail address
   - Sender name: `TaskNest`
   - Host: `smtp.gmail.com`
   - Port: `465`
   - Username: your Gmail address
   - Password: the 16-letter app password
4. Save. Then open **Authentication → Rate Limits** and raise "emails per hour" to about 30.

Gmail allows roughly 500 emails a day, which is far more than you need.

### 1f. Copy your keys
**Project Settings → API**: copy the **Project URL** and the **anon / publishable key**. You already sent these to me. They are safe inside the app. Never use the `service_role` or `secret` key anywhere.

---

## 2. GitHub (builds the APK for free)

1. Open your repo → **Settings → Secrets and variables → Actions → New repository secret**. Add:

   | Name | Value |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | your Project URL |
   | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your anon / publishable key |

2. (Recommended, can be done later) Add a permanent signing key so future builds install as updates over older ones. Without it each build uses a one-off key and you would need to uninstall before installing a newer build. See section 5.

---

## 3. Build the APK

1. Repo → **Actions** tab → **Build Android APK** → **Run workflow** → **Run workflow**.
2. Wait about 10–15 minutes. A green tick means it worked. A red cross means tap the run, open the failing step and send me the message.
3. Go to the repo's main page → **Releases** (right side or under the code tab) → the newest **TaskNest build N** → tap **TaskNest.apk** to download.

---

## 4. Install on your phone and share it

1. Open the downloaded `TaskNest.apk`.
2. Android will say "For your security, your phone isn't allowed to install unknown apps from this source." Tap **Settings**, switch on **Allow from this source**, go back and tap **Install**. (The source is whichever app you opened the file from: Chrome, Files, WhatsApp…)
3. If Play Protect warns about an unrecognised app, tap **More details → Install anyway**. This appears because the app is not from the Play Store.

**Sharing with your team:** the repo is private, so they cannot download from GitHub. Download the APK once and send the file by WhatsApp, Telegram, email or Google Drive. They install it the same way. Then **invite each person** in the app (People tab) *before* they tap **Create account**.

---

## 5. Permanent signing key (optional, recommended once you are happy)

Ask me and I will generate the key and give you three values to paste as GitHub secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`. Keep a copy of them somewhere safe; if lost, updates will no longer install over old builds.

---

## 6. Free-plan limits to know

- Supabase pauses a free project after about 7 days without activity. Daily use prevents this. If it pauses, open the dashboard and tap **Restore project**.
- Free storage is 1 GB and database 500 MB. Plenty for a small team.
- GitHub Actions gives 2,000 free build minutes a month for private repos. Each build is about 15 minutes.

---

## Stage 1 test checklist (about 5 minutes)

1. Open the app. You see the TaskNest sign-in screen in plum and rose.
2. Tap **Create account** with the **same email** you put in `first_admin.sql`. Fill in name and password.
3. Check your email for a code, enter it. You land on Home and see an **Admin** badge, plus a **People** tab.
4. **Sign out** (Profile tab), then **Sign in** again. Close the app completely and reopen it: you should still be signed in.
5. Try signing in with a wrong password: you see a clear error.
6. **Forgot password**: request a code, enter it, set a new password, sign in with it.
7. People tab → invite a second email → on another phone (or after sign-out) create an account with it. It should work. Try an email you did **not** invite: it should say it has not been invited.
8. As admin, **Remove access** for that person. They should be signed out the next time they open the app, and cannot sign in again.
