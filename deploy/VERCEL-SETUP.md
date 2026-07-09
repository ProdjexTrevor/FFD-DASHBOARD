# Vercel + host07 API setup

The dashboard frontend on Vercel cannot talk to MariaDB directly. You need:

1. **Express API running on host07** (same server as the database)
2. **`API_PROXY_URL` set in Vercel** pointing to that public API URL

Until both are done, login shows:

> Dashboard API is not connected. Deploy the Express API on host07 and set API_PROXY_URL in Vercel to that URL.

## Quick setup

### A. On host07 (SSH)

```bash
ssh your-user@host07.prodjex.com
bash -c "$(curl -fsSL https://raw.githubusercontent.com/ProdjexTrevor/FFD-DASHBOARD/main/deploy/host07-install.sh)"
```

Or manually:

```bash
git clone https://github.com/ProdjexTrevor/FFD-DASHBOARD.git ~/ffd-dashboard-api
cd ~/ffd-dashboard-api
npm install
cp .env.example .env
nano .env   # set DB_HOST=127.0.0.1 and DB_PASSWORD
npm run db:test
pm2 start ecosystem.config.cjs
pm2 save
```

### B. Public URL (Prodjex / cPanel)

Create subdomain **`ffd-api.prodjex.com`** and proxy to `http://127.0.0.1:3001`.

Use one of:
- `deploy/nginx-ffd-api.conf.example`
- `deploy/apache-ffd-api-proxy.conf`

Verify:

```bash
curl https://ffd-api.prodjex.com/health
curl https://ffd-api.prodjex.com/health/db
curl -u admin:Admin123! https://ffd-api.prodjex.com/api/auth/whoami
```

### C. In Vercel dashboard

Project → **Settings** → **Environment Variables** → Add:

| Name | Value | Environments |
|------|-------|--------------|
| `API_PROXY_URL` | `https://ffd-api.prodjex.com` | Production, Preview, Development |

Then **Deployments** → **Redeploy** the latest build.

### D. Test login

Open `https://ffd-dashboard-xi.vercel.app` and sign in with:

- Username: `admin`
- Password: `Admin123!`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Dashboard API is not connected" | `API_PROXY_URL` missing in Vercel — add it and redeploy |
| 503 after setting proxy URL | API not running on host07, or subdomain proxy misconfigured |
| 401 Invalid password | Reset with `npm run db:create-user -- admin "YourPass" "Admin"` on host07 |
| `/health/db` fails on host07 | Wrong `DB_PASSWORD` in server `.env` — use `DB_HOST=127.0.0.1` |

## Local development (no Vercel needed)

```powershell
npm run dev
```

Open http://localhost:5173 — API runs locally on port 3001.
