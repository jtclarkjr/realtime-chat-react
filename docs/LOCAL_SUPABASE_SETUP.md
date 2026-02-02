# Local Supabase Setup Guide

This guide shows you how to run Supabase locally instead of using the hosted
cloud version. Local development is useful for:

- **Faster development** - No network latency
- **Offline development** - Work without internet
- **Cost savings** - No usage charges during development
- **Database experimentation** - Test schema changes safely
- **Email/password auth** - Simple local authentication without OAuth setup

## Prerequisites

- **Docker Desktop** - Required for running Supabase containers
- **Homebrew** (macOS/Linux) or direct download for Supabase CLI
- **Node.js 22+**
- **Bun package manager**

## Step 1: Install Supabase CLI

### macOS/Linux (Homebrew)

```bash
brew install supabase/tap/supabase
```

### Windows (Scoop)

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Verify Installation

```bash
supabase --version
```

## Step 2: Start Local Supabase

Navigate to your project directory and start Supabase:

```bash
cd realtime-chat/react
supabase start
```

**First run will take 2-5 minutes** as it downloads Docker images (~2GB).

After successful startup, you'll see output like this:

```
╭──────────────────────────────────────╮
│ 🔧 Development Tools                 │
├─────────┬────────────────────────────┤
│ Studio  │ http://127.0.0.1:54323     │
│ Mailpit │ http://127.0.0.1:54324     │
│ MCP     │ http://127.0.0.1:54321/mcp │
╰─────────┴────────────────────────────╯

╭──────────────────────────────────────────────────────╮
│ 🌐 APIs                                              │
├────────────────┬─────────────────────────────────────┤
│ Project URL    │ http://127.0.0.1:54321              │
│ REST           │ http://127.0.0.1:54321/rest/v1      │
│ GraphQL        │ http://127.0.0.1:54321/graphql/v1   │
│ Edge Functions │ http://127.0.0.1:54321/functions/v1 │
╰────────────────┴─────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────╮
│ ⛁ Database                                                    │
├─────┬─────────────────────────────────────────────────────────┤
│ URL │ postgresql://postgres:postgres@127.0.0.1:54322/postgres │
╰─────┴─────────────────────────────────────────────────────────╯
```

**Important URLs:**

- **Supabase Studio**: http://127.0.0.1:54323 (Database GUI)
- **API**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Mailpit** (Email testing): http://127.0.0.1:54324

## Step 3: Apply Database Migrations

The project includes SQL schema files that need to be applied to your local
database.

### Apply Rooms Schema

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f database/rooms_schema.sql
```

### Apply Messages Schema

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f database/schema.sql
```

You should see output confirming tables, indexes, and policies were created:

```
CREATE TABLE
CREATE INDEX
CREATE POLICY
...
```

### Verify Tables Were Created

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\dt public.*"
```

You should see:

```
          List of relations
 Schema |   Name   | Type  |  Owner
--------+----------+-------+----------
 public | messages | table | postgres
 public | rooms    | table | postgres
```

## Step 4: Enable Anonymous Authentication

Anonymous authentication allows users to browse as guests with read-only access
before signing up. This must be enabled in your Supabase configuration.

### For Local Supabase

The anonymous auth setting is configured in `supabase/config.toml` (created when
you run `supabase init`).

1. **Locate the config file**:

   ```bash
   cat supabase/config.toml | grep -A 2 "enable_anonymous_sign_ins"
   ```

2. **Enable anonymous sign-ins**: Edit `supabase/config.toml` and find the
   `[auth]` section:

   ```toml
   [auth]
   enabled = true
   site_url = "http://127.0.0.1:3000"
   # ... other settings ...

   # Allow/disallow anonymous sign-ins to your project.
   enable_anonymous_sign_ins = true  # Set this to true
   ```

3. **Restart Supabase** to apply changes:
   ```bash
   supabase stop
   supabase start
   ```

### For Hosted Supabase

If using hosted Supabase (production):

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Scroll down to **Anonymous**
5. Toggle it **ON**
6. Click **Save**

### Verify Anonymous Auth is Enabled

After restarting, verify the setting:

```bash
cat supabase/config.toml | grep "enable_anonymous_sign_ins"
```

Should show:

```toml
enable_anonymous_sign_ins = true
```

### Rate Limiting (Optional)

You can configure rate limits for anonymous sign-ins in the same config file:

```toml
[auth.rate_limit]
# Number of anonymous sign-ins that can be made per hour per IP address
anonymous_users = 30
```

## Step 5: Configure Environment Variables

Update your `.env.local` (or create `.env.development.local`) with local
Supabase credentials:

```bash
# Supabase Configuration - Local Development
# IMPORTANT: Use JWT format keys (starting with eyJ...), NOT v2 API keys (sb_publishable_...)
# Get these keys from `supabase status` after starting Supabase locally
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_supabase_anon_jwt_key
SUPABASE_SERVICE_ROLE_KEY=your_local_supabase_service_role_jwt_key

# Enable email/password auth for local development only
NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true

# Redis Configuration (keep as-is)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback

# AI Assistant Configuration (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AI_USER_ID=your_ai_user_id_here

# Local Development
ENV=dev
```

### Important Notes:

- **JWT Keys**: After running `supabase start`, get your keys from the output.
  Look for the anon and service*role keys in JWT format (starting with
  `eyJ...`). **DO NOT** use the v2 format keys (starting with
  `sb_publishable*...`).
- **Email Auth Flag**: Set `NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true` to enable
  email/password login (local only)
- **Production**: Use different keys from your hosted Supabase project

## Step 5: Start the Application

1. **Clear Next.js cache** (important after env changes):

```bash
rm -rf .next
```

2. **Start Redis**:

```bash
bun run docker:up
```

3. **Start the development server**:

```bash
bun dev
```

4. **Open the app**: http://localhost:3000

You should see the login page with email/password fields (because
`NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true`).

## Step 6: Create a Test User

### Option 1: Via UI (Recommended)

1. Go to http://localhost:3000/login
2. Enter an email and password
3. Click "Sign up with Email"
4. For local dev, check Mailpit at http://127.0.0.1:54324 for the confirmation
   email
5. Click the confirmation link
6. Sign in with your email and password

### Option 2: Via Supabase Studio

1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to **Authentication** → **Users**
3. Click **Add user**
4. Enter email and password
5. Check "Auto Confirm User"
6. Click **Create**

### Option 3: Via SQL

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres << 'EOF'
-- Create a test user (password will be 'password123')
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"email_verified": true}'::jsonb,
  '',
  ''
);
EOF
```

## Local vs Hosted Supabase

| Feature            | Local Supabase           | Hosted Supabase                         |
| ------------------ | ------------------------ | --------------------------------------- |
| **Setup**          | Requires Docker & CLI    | Just create project                     |
| **Authentication** | Email/password (simple)  | OAuth providers (GitHub, Discord, etc.) |
| **Database**       | PostgreSQL in Docker     | Managed PostgreSQL                      |
| **Cost**           | Free (local resources)   | Free tier, then paid                    |
| **Email**          | Mailpit (no real emails) | Real email delivery                     |
| **Backups**        | Manual                   | Automatic                               |
| **Scaling**        | Local machine limits     | Cloud-scale                             |
| **Offline**        | Works offline            | Requires internet                       |

## Common Commands

### Check Supabase Status

```bash
supabase status
```

### Stop Supabase

```bash
supabase stop
```

### Restart Supabase

```bash
supabase stop
supabase start
```

### View Logs

```bash
# All services
docker logs -f supabase_db_react

# Auth service
docker logs -f supabase_auth_react

# Realtime service
docker logs -f supabase_realtime_react
```

### Reset Database

**Warning**: This deletes all data!

```bash
supabase db reset
# Then reapply your migrations
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f database/rooms_schema.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f database/schema.sql
```

## Troubleshooting

### Issue: "Port already in use"

**Solution**: Stop existing Supabase instance or change ports

```bash
supabase stop
supabase start
```

### Issue: JWT error "invalid signature"

**Problem**: Mismatch between environment keys and Supabase instance

**Solution**:

1. Verify you're using the local JWT keys (see Step 4)
2. Restart your dev server:
   ```bash
   rm -rf .next
   bun dev
   ```

### Issue: RLS policy error "new row violates row-level security policy"

**Problem**: Service role key not configured correctly

**Solution**:

1. Check that `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` matches the key
   from Step 4
2. Restart the dev server
3. Check server console logs for `[Service Client] Initializing with: ...` -
   should show `eyJhbGciOiJIUzI1NiI...`

### Issue: Tables don't exist

**Solution**: Reapply migrations

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f database/rooms_schema.sql
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f database/schema.sql
```

### Issue: Docker container fails to start

**Solution**:

1. Check Docker is running
2. Check available disk space
3. Reset Docker:
   ```bash
   supabase stop
   docker system prune -a
   supabase start
   ```

## Switching Between Local and Hosted

You can maintain separate environment files:

**`.env.local`** (hosted Supabase):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_hosted_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_hosted_service_key
NEXT_PUBLIC_ENABLE_EMAIL_AUTH=false  # OAuth only
```

**`.env.development.local`** (local Supabase):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_ENABLE_EMAIL_AUTH=true  # Email auth for local
```

Next.js loads `.env.development.local` in development, which takes precedence
over `.env.local`.

## Additional Resources

- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **Local Development Guide**:
  https://supabase.com/docs/guides/cli/local-development
- **Supabase Studio**: http://127.0.0.1:54323 (local GUI)
- **Mailpit**: http://127.0.0.1:54324 (test emails)

## Next Steps

After setting up local Supabase:

1. **Create the AI user** (if using AI features):

   ```bash
   curl -X POST http://localhost:3000/api/setup/ai-user
   ```

2. **Explore Supabase Studio**: http://127.0.0.1:54323
   - View tables and data
   - Test SQL queries
   - Manage users
   - Monitor real-time subscriptions

3. **Test email auth**: Sign up and check Mailpit for confirmation emails

4. **Start building**: All features work the same as hosted Supabase!
