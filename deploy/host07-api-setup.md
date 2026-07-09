# Deploy the Dashboard API on host07

Vercel only hosts the React frontend. The Express API must run on **host07** (same server as MariaDB) because Vercel cannot reach the database.

## 1. SSH into host07

```bash
ssh your-user@host07.prodjex.com
```

## 2. Clone or pull the repo

```bash
cd /var/www   # or your preferred path
git clone https://github.com/ProdjexTrevor/FFD-DASHBOARD.git
cd FFD-DASHBOARD
npm install
```

## 3. Create `.env` on the server

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=firstdealer_app
DB_PASSWORD=your_password_here
DB_NAME=firstdealer_app
PORT=3001
NODE_ENV=production
DASHBOARD_AUTH_DISABLED=false
```

Use `127.0.0.1` for `DB_HOST` when the API runs on the same server as MariaDB.

## 4. Start the API with PM2

```bash
npm run start:api
# or for a persistent process:
pm2 start ecosystem.config.cjs
pm2 save
```

## 5. Expose via nginx (example subdomain)

Copy `deploy/nginx-ffd-api.conf.example` and point a subdomain (e.g. `ffd-api.prodjex.com`) to port 3001.

Verify:

```bash
curl https://ffd-api.prodjex.com/health
curl https://ffd-api.prodjex.com/health/db
curl -u admin:Admin123! https://ffd-api.prodjex.com/api/auth/whoami
```

## 6. Configure Vercel

In the Vercel project → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `API_PROXY_URL` | `https://ffd-api.prodjex.com` |

Redeploy Vercel after saving.

## Credentials

Dashboard login users live in the `dashboard_creds` table (not in git).

Default test user: `admin` / `Admin123!`

Create or reset:

```bash
npm run db:create-user -- admin "YourPassword" "Dashboard Admin"
```
