# Capitol Trades Tracker - Setup Guide

## Overview
This system tracks politician stock trades in real-time, sends Discord alerts, and displays a dashboard on GitHub Pages.

**Components:**
- **Backend**: Node.js script that fetches trades nightly via GitHub Actions
- **Frontend**: React dashboard hosted on GitHub Pages
- **Data**: JSON file stored in repo, auto-updated nightly

---

## Step 1: Get API Keys

### Politician Trade Tracker API
1. Go to https://www.politiciantradetracker.us/
2. Sign up (free tier available)
3. Get your API key from the dashboard

### Finnhub (Stock Prices)
1. Go to https://finnhub.io/
2. Sign up (free tier)
3. Get your API key

### Discord Webhook (Optional but Recommended)
1. Create a private Discord server (or use existing)
2. Right-click channel → Edit Channel → Integrations → Webhooks → New Webhook
3. Copy the webhook URL

---

## Step 2: Create GitHub Repository

1. Create a new GitHub repo: `capitol-trades-tracker`
2. Clone it locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/capitol-trades-tracker.git
   cd capitol-trades-tracker
   ```

3. Copy these files to the repo:
   - `politician-trades-backend.js` (backend script)
   - `PoliticianTrackerDashboard.jsx` (React component)
   - `package.json` (see below)

---

## Step 3: Set Up Backend

Create `package.json`:
```json
{
  "name": "politician-trades-tracker",
  "version": "1.0.0",
  "description": "Track politician stock trades",
  "main": "politician-trades-backend.js",
  "scripts": {
    "sync": "node politician-trades-backend.js",
    "dev": "node politician-trades-backend.js"
  },
  "dependencies": {}
}
```

Create `.github/workflows/sync-trades.yml` (use the workflow file provided).

Create a seed `trades-data.json`:
```json
{
  "trades": [],
  "lastUpdated": null,
  "policyCount": 0
}
```

---

## Step 4: Configure GitHub Secrets

1. Go to repo Settings → Secrets and variables → Actions
2. Add these secrets:
   - `PTT_API_KEY`: Your Politician Trade Tracker API key
   - `FINNHUB_KEY`: Your Finnhub API key
   - `DISCORD_WEBHOOK`: Your Discord webhook URL (if using alerts)

The backend script reads these via `process.env`

---

## Step 5: Set Up Frontend (GitHub Pages)

### Option A: Create React App
```bash
npx create-react-app frontend
cd frontend
npm install lucide-react
```

Replace `src/App.js` with the React component code.

Then deploy:
```bash
npm run build
# Commit build/ to GitHub Pages branch
```

### Option B: Simple HTML + Bundled React
Create `docs/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Capitol Trades Tracker</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
  <div id="root"></div>
  <script src="app.js"></script>
</body>
</html>
```

Then enable GitHub Pages:
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / Folder: `docs`

---

## Step 6: Test the Backend Manually

```bash
export PTT_API_KEY="your_key"
export FINNHUB_KEY="your_key"
export DISCORD_WEBHOOK="your_webhook"

node politician-trades-backend.js
```

Check that:
- `trades-data.json` was created/updated
- Discord message posted (if webhook configured)

---

## Step 7: Configure the Backend Script

Edit `politician-trades-backend.js` and update the `WATCHED_POLITICIANS` array:

```javascript
const WATCHED_POLITICIANS = [
  'Nancy Pelosi',
  'Mitch McConnell',
  'Your Rep Name',
  // Add 5-10 politicians to track
];
```

---

## Step 8: Test GitHub Actions

1. Push your code to GitHub
2. Go to Actions tab
3. Manually trigger "Sync Politician Trades Nightly" workflow
4. Watch it run (check logs for errors)

The workflow will:
- Run the backend script
- Fetch trades from API
- Post Discord alerts
- Commit `trades-data.json` with updates

---

## Step 9: Set Up the Dashboard

The React dashboard reads from `trades-data.json`. Make sure the path is correct:

```javascript
const response = await fetch('./trades-data.json');
```

If hosted on GitHub Pages, this path should work automatically.

---

## File Structure

```
capitol-trades-tracker/
├── politician-trades-backend.js    # Main sync script
├── trades-data.json                # Data (auto-updated)
├── package.json
├── .github/
│   └── workflows/
│       └── sync-trades.yml         # GitHub Actions workflow
├── docs/
│   ├── index.html                  # Dashboard (GitHub Pages)
│   ├── app.js                      # React component (bundled)
│   └── trades-data.json            # Symlink or copy of main file
└── README.md
```

---

## Customization

### Change Sync Schedule
Edit `.github/workflows/sync-trades.yml`:
```yaml
- cron: '0 2 * * *'  # Change the time (2 AM UTC)
```

### Change Tracked Politicians
Edit `WATCHED_POLITICIANS` in `politician-trades-backend.js`

### Adjust Portfolio % Calculation
Modify `calculatePortfolioPercent()` in the backend script

### Change Discord Alert Format
Edit `sendDiscordAlert()` function

---

## Troubleshooting

**"API key not found"**
- Check GitHub Secrets are set correctly
- Verify secret names match `process.env` variables

**"Failed to fetch trades"**
- Check PTT API is online and key is valid
- Check network in GitHub Actions logs

**Dashboard not updating**
- Verify workflow ran successfully
- Check `trades-data.json` was committed
- Hard refresh browser (Ctrl+Shift+R)

**Discord alerts not sending**
- Test webhook URL manually with curl
- Check Discord webhook exists and is active
- Verify `DISCORD_WEBHOOK` secret is set

---

## Next Steps

1. Add email notifications
2. Calculate actual trade performance (entry/exit)
3. Filter by committee membership
4. Add portfolio composition visualization
5. Deploy as standalone app (AWS Lambda, Vercel)

---

## Legal Note

This tool is for educational purposes. Ensure you comply with all applicable laws and SEC regulations regarding trading algorithms and market information.
