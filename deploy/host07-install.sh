#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/ffd-dashboard-api}"
REPO_URL="${REPO_URL:-https://github.com/ProdjexTrevor/FFD-DASHBOARD.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3001}"

echo "==> First Dealer Direct Dashboard API installer"
echo "    Target directory: $APP_DIR"
echo "    Port: $PORT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed. Install Node 20+ first."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed."
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> Pulling latest code..."
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull origin "$BRANCH"
fi

cd "$APP_DIR"
npm install --omit=dev

if [ ! -f ".env" ]; then
  echo "==> Creating .env from template..."
  cp .env.example .env
  sed -i 's/^DB_HOST=.*/DB_HOST=127.0.0.1/' .env
  sed -i "s/^PORT=.*/PORT=$PORT/" .env
  echo ""
  echo "IMPORTANT: Edit $APP_DIR/.env and set DB_PASSWORD before continuing."
  echo "Then re-run: bash deploy/host07-install.sh"
  exit 0
fi

if grep -q '^DB_PASSWORD=$' .env || grep -q 'YOUR_PASSWORD' .env; then
  echo "ERROR: Set DB_PASSWORD in $APP_DIR/.env first."
  exit 1
fi

echo "==> Testing database connection..."
npm run db:test

if command -v pm2 >/dev/null 2>&1; then
  echo "==> Starting API with PM2..."
  pm2 delete ffd-dashboard-api >/dev/null 2>&1 || true
  pm2 start ecosystem.config.cjs
  pm2 save
  echo "==> PM2 status:"
  pm2 status ffd-dashboard-api
else
  echo "WARNING: PM2 not found. Starting API in background with nohup..."
  nohup npm run start:api > "$APP_DIR/api.log" 2>&1 &
  echo $! > "$APP_DIR/api.pid"
fi

sleep 2
echo "==> Local health check:"
curl -s "http://127.0.0.1:$PORT/health" || true
echo ""
curl -s "http://127.0.0.1:$PORT/health/db" || true
echo ""

cat <<EOF

API is running on port $PORT.

Next steps:
1. Create a public subdomain (example: ffd-api.prodjex.com) pointing to this server.
2. Add an Apache/nginx reverse proxy to http://127.0.0.1:$PORT
   See deploy/nginx-ffd-api.conf.example or deploy/apache-ffd-api-proxy.conf
3. Verify public URL:
   curl https://ffd-api.prodjex.com/health
   curl -u admin:Admin123! https://ffd-api.prodjex.com/api/auth/whoami
4. In Vercel project settings, add:
   API_PROXY_URL = https://ffd-api.prodjex.com
5. Redeploy the Vercel frontend.

EOF
