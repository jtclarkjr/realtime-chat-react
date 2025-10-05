# Deploy Storybook in 2 Minutes

## Step-by-Step

### 1. Go to Vercel
Open: https://vercel.com/new

### 2. Import Your Repository
Click "Import" under your `realtime-chat` repository

### 3. Configure Project
- **Project Name**: `realtime-chat-storybook` (or whatever you prefer)
- **Framework Preset**: Select **"Storybook"** from dropdown ← Vercel has native support!
- **Root Directory**: 
  - If monorepo with `/react` folder → Enter `react`
  - If repo root has `package.json` → Leave blank
- **Build & Development Settings**: Click "Override"
  - **Install Command**: `bun install`
  - Everything else auto-configured by Vercel!

### 4. Deploy
Click "Deploy" button → Wait 2-3 minutes

### 5. Done!
Access your Storybook at:
```
https://realtime-chat-storybook.vercel.app
```

## That's It!

Your Storybook is now:
- ✅ Deployed at its own URL
- ✅ Auto-deploys on git push
- ✅ Has preview deployments for PRs
- ✅ Independent from main app

## Optional: Add Custom Domain

1. Go to project → Settings → Domains
2. Add `storybook.yourdomain.com`
3. Follow DNS instructions
4. Access at `https://storybook.yourdomain.com`

## Verification

After deployment, you should see all 8 component stories:
- Button (10 variants)
- Input (multiple states)
- Textarea
- Select (with groups)
- Avatar
- Spinner
- Dialog
- Popover

---

**Need more details?** See `STORYBOOK_SEPARATE_DEPLOYMENT.md`

**Having issues?** See `STORYBOOK_TROUBLESHOOTING.md`
