# noxa-site-alert

Website change alerts for `https://noxa.fi/`.

Public bot: [@NOXA_AlertBot](https://t.me/NOXA_AlertBot)

[CI](https://github.com/Semak12345/noxa-site-alert/actions/workflows/ci.yml)  
[License: MIT](LICENSE)  
[Node >= 18](package.json)

## Overview

This project:

- watches `https://noxa.fi/`
- stores a baseline
- checks for changes on a timer
- sends Telegram alerts
- supports `/start` and `/stop`
- keeps local snapshots in `.data/`

It is small, simple, and VPS-friendly.

## Quick start

### 1. Clone

```bash
git clone https://github.com/Semak12345/noxa-site-alert.git
cd noxa-site-alert
```

### 2. Configure

```bash
cp .env.example .env
```

Required:

- `TELEGRAM_BOT_TOKEN`

Optional:

- `TELEGRAM_CHAT_ID`
- `TELEGRAM_THREAD_ID`
- `IGNORE_HTML_REGEX`
- `IGNORE_TEXT_REGEX`

### 3. Install

```bash
npm install
```

### 4. Save baseline

```bash
npm run init
```

### 5. Start watcher

```bash
npm start
```

### 6. Subscribe

Open [@NOXA_AlertBot](https://t.me/NOXA_AlertBot) and press `Start`.

Expected reply:

```text
✅ You are now on the NOXA alert list.
Website: https://noxa.fi/
If the NOXA website changes,
you will receive an instant alert here.

Send /stop to unsubscribe.
```

## Example change alert

```text
🚨 NOXA website update detected
News: Changes were detected on noxa.fi.
Website: https://noxa.fi/
Open site: https://noxa.fi/
Detected at: 2026-07-22T16:19:25.000Z
Title: Noxa
Mode: dom

Added:
+ Available now

Removed:
- Coming soon
```

## Commands

```bash
npm run doctor
npm run init
npm run check
npm run test-alert
npm start
```

- `doctor` — show resolved config
- `init` — create first baseline
- `check` — run one check
- `test-alert` — send test message
- `start` — run watcher loop

## Configuration

Core:

- `WATCH_URL`  
  default: `https://noxa.fi/`
- `WATCH_MODE`  
  values: `dom`, `text`, `html`
- `POLL_INTERVAL_MS`  
  default: `10000`
- `REQUEST_TIMEOUT_MS`  
  default: `15000`
- `STATE_DIR`  
  default: `.data`
- `ENV_DISCOVERY`  
  default: `true`

Telegram:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_THREAD_ID`
- `TELEGRAM_BROADCAST_SUBSCRIBERS`

Tuning:

- `SEND_STARTUP_PING`
- `IGNORE_HTML_REGEX`
- `IGNORE_TEXT_REGEX`

## Watch modes

`dom`

- good default
- tracks structure and content

`text`

- only visible text
- good for launch pages

`html`

- strict mode
- any raw HTML change triggers

## False positives

If the site changes small noisy parts on every request,
add ignore rules.

Examples:

```bash
IGNORE_TEXT_REGEX=Last updated:.*
```

```bash
IGNORE_TEXT_REGEX=Last updated:.*||Build #[0-9]+
```

```bash
IGNORE_HTML_REGEX=data-hydration=\"[^\"]+\"
```

Tips:

- start with `WATCH_MODE=text`
- add rules only when needed
- keep rules narrow
- run `npm run check` after changes

## State

Files are stored in `.data/`.

Example:

```text
.data/
  state.json
  subscribers.json
  snapshots/
    2026-07-22T12-00-00-000Z.html
    2026-07-22T12-00-00-000Z.txt
```

## Telegram setup

1. Create a bot with `@BotFather`
2. Put the token into `.env`
3. Run `npm run test-alert`
4. Press `Start` in Telegram
5. Wait for alerts

## Docker

Build:

```bash
docker build -t noxa-site-alert .
```

Run:

```bash
docker run --rm \
  --env-file .env \
  -v "$(pwd)/.data:/app/.data" \
  noxa-site-alert
```

Compose:

```bash
docker compose up -d
```

## VPS deploy

```bash
git clone https://github.com/Semak12345/noxa-site-alert.git
cd noxa-site-alert
cp .env.example .env
npm install
npm run init
npm start
```

For systemd install:

```bash
sudo bash scripts/install-vps.sh
sudo systemctl start noxa-site-alert
```

Logs:

```bash
sudo journalctl -u noxa-site-alert -f
```

## Monorepo env discovery

By default the project can load nearby `.env`
and `.env.local` files from parent folders.

To disable it:

```bash
ENV_DISCOVERY=false
```

## Use cases

- launch monitoring
- landing page monitoring
- private alert bot
- proof-of-change tracking

## Contributing

PRs are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
