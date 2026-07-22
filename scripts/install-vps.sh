#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/noxa-site-alert}"
SERVICE_NAME="${SERVICE_NAME:-noxa-site-alert}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but not installed."
  echo "Install Node.js 18+ first, then rerun this script."
  exit 1
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/.data"

if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "Created $APP_DIR/.env from template. Fill TELEGRAM_BOT_TOKEN before starting."
fi

install -m 0644 "$APP_DIR/deploy/systemd/$SERVICE_NAME.service" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo ""
echo "Installed $SERVICE_NAME."
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env"
echo "  2. Run: systemctl start $SERVICE_NAME"
echo "  3. Run: systemctl status $SERVICE_NAME"
