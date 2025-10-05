# Deploy Storybook Separately (Recommended)

Deploy Storybook as a separate Vercel project for cleaner separation and better performance.

## Quick Setup (5 minutes)

### 1. Create New Vercel Project

1. Go to https://vercel.com/new
2. Select your repository (`realtime-chat`)
3. Name it: `realtime-chat-storybook` (or similar)
4. **Don't import yet** - configure settings first

### 2. Configure Build Settings

**Option A: Use Storybook Framework (Easiest)**

Vercel auto-detects Storybook! Just:

- **Framework Preset**: Select **"Storybook"** from the dropdown
- **Root Directory**: `react` (if in monorepo, otherwise leave blank)
- **Install Command**: `bun install` (override if needed)

That's it! Vercel handles the rest automatically.

**Option B: Manual Configuration**

If Storybook isn't auto-detected:

- **Framework Preset**: Other
- **Root Directory**: `react` (if monorepo) or leave blank
- **Build Command**: `bun run build-storybook`
- **Output Directory**: `storybook-static`
- **Install Command**: `bun install`

### 3. Deploy

Click "Deploy" and wait 2-3 minutes.

### 4. Access Your Storybook

Your Storybook will be at:
```
https://realtime-chat-storybook.vercel.app
```

### 5. (Optional) Add Custom Domain

1. Go to Project Settings → Domains
2. Add: `storybook.yourdomain.com`
3. Configure DNS (Vercel provides instructions)

Done! Now you have:
- Main app: `https://yourdomain.com`
- Storybook: `https://storybook.yourdomain.com`

## Benefits of Separate Deployment

✅ **Faster main app deploys** - No Storybook build overhead
✅ **Independent scaling** - Storybook has its own resources
✅ **Better security** - Easier to add auth/password protection
✅ **Cleaner architecture** - Separation of concerns
✅ **No routing conflicts** - Each app has its own domain
✅ **Enterprise standard** - How it's done in production

## Automatic Deployments

Both projects will automatically deploy when you push to git:
- Pushing to `main` → deploys both main app and Storybook
- Each maintains its own deployment history
- Preview deployments work for both

## Password Protection (Optional)

### Option 1: Vercel Password Protection
1. Go to Storybook project settings
2. Deployment Protection → Enable
3. Set password
4. Share with team

(Requires Vercel Pro or higher)

### Option 2: Using Chromatic
```bash
# One-time setup
bun add -D chromatic

# Deploy with auth
bunx chromatic --project-token=<your-token>
```

Chromatic provides:
- Free hosting for open source
- Built-in password protection
- Visual regression testing
- Component review workflows

Get token at: https://www.chromatic.com/

## Alternative: GitHub Pages

Free option for public Storybooks:

```bash
# Add to package.json
"deploy-storybook": "bun run build-storybook && npx gh-pages -d storybook-static"

# Deploy
bun run deploy-storybook
```

Access at: `https://yourusername.github.io/realtime-chat/`

## Development Workflow

```bash
# Local development
bun run storybook

# Build and test locally
bun run build-storybook
bunx serve storybook-static

# Deploy (automatic on git push)
git push
```

## Comparison: Combined vs Separate

| Feature | Combined (Same Domain) | Separate (Subdomain) |
|---------|----------------------|---------------------|
| Setup | Complex | Simple |
| Deploy Speed | Slower | Faster |
| Maintenance | More complex | Easier |
| Security | Same as main app | Independent |
| Routing | Can conflict | Clean |
| Enterprise Ready | ❌ | ✅ |
| **Recommendation** | Development only | **Production** |

## Cost

- **Vercel Free Tier**: 
  - ✅ 2 projects included
  - ✅ Unlimited deployments
  - ✅ Perfect for Storybook

- **Chromatic Free**:
  - ✅ 5,000 snapshots/month
  - ✅ Unlimited team members
  - ✅ Password protection

## Next Steps

1. ✅ Create separate Vercel project for Storybook
2. ✅ Configure build settings as shown above
3. ✅ Deploy and test
4. (Optional) Add custom domain
5. (Optional) Enable password protection
6. Share Storybook URL with your team!

---

**Your main app stays fast and Storybook has its own home!**
