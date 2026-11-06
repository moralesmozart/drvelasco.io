# drvelasco

A lightweight kanban workflow tool: a public form creates cards, the team moves them through configurable phases, and PDF templates turn a card into a document.

**Stack:** Vite, React and TypeScript · Tailwind · dnd-kit · Framer Motion · Supabase · GitHub Pages

Without Supabase variables, the app runs in **demo mode** with fictional data stored in your browser.

## Setup

### Supabase
1. In the **SQL Editor**, run `supabase/migrations/0001_init.sql`. Optionally run `supabase/seed.sql` afterwards for an example pipe.
2. Under **Authentication → Users**, add a user, then grant it access:
   ```sql
   insert into app_admins(user_id) select id from auth.users where email = 'YOUR-EMAIL';
   ```
3. Under **Authentication → Providers → Email**, turn off "Allow new users to sign up".

### GitHub
1. Under **Settings → Secrets and variables → Actions → Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Under **Settings → Pages**, set the source to **GitHub Actions**.

A daily workflow (`keepalive.yml`) keeps the Supabase free tier from pausing.

## Local development
```bash
cp .env.example .env.local
npm install
npm run dev
```
