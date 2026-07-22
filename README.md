# noxa-site-alert

Open-source change detection for `https://noxa.fi/` with Telegram alerts, stored snapshots, simple diffs, Docker support, and zero runtime dependencies beyond Node.js.

It ships preconfigured for `noxa.fi`, but you can point it at any site and use it as a lightweight launch monitor, landing page watcher, or “tell me the second this page changes” bot.

## Why this exists

Some sites matter precisely when they are still quiet.

`noxa-site-alert` is built for that moment:

- watch a page every few seconds
- establish a clean baseline
- detect meaningful changes
- alert Telegram instantly
- preserve snapshots so you can verify what changed

The current `noxa.fi` page is a simple “Coming Soon” site, which makes it a perfect candidate for high-signal change monitoring.

## Features

- preconfigured for `https://noxa.fi/`
- Telegram alerts on content change
- self-service Telegram subscriptions via `/start`
- local snapshots of HTML and extracted text
- hash-based monitoring with three modes: `dom`, `text`, `html`
- startup ping and fetch error alerts
- automatic `.env` discovery from nearby folders
- no external npm dependencies
- Docker and `docker-compose` ready
- production-friendly `systemd` unit for tiny VPS deploys

## Quick start

### 1. Copy env

```bash
cp .env.example .env
```

Fill in:

- `TELEGRAM_BOT_TOKEN`

Optional:

- `TELEGRAM_CHAT_ID` if you want a fixed admin/group destination in addition to subscribers
- `TELEGRAM_THREAD_ID` if you post into a forum topic

### 2. Create a baseline

```bash
npm run init
```

This fetches the current page, stores a snapshot, and saves the first known hash without sending an alert.

### 3. Start watching

```bash
npm start
```

Default polling interval is `10000ms`.

## Commands

```bash
npm run doctor
npm run init
npm run check
npm run test-alert
npm start
```

What they do:

- `doctor` — prints resolved config and discovered env files
- `init` — saves the first baseline
- `check` — performs one fetch-and-compare cycle
- `test-alert` — sends a Telegram test message
- `start` — runs the continuous watcher loop

## How subscriptions work

This project can run in broadcast mode.

If a user opens your bot and presses `Start` or sends `/start`, the watcher will pick that up through Telegram Bot API polling and add them to the subscriber list.

From that point:

- they receive change alerts
- they receive outage/recovery alerts
- they can send `/stop` to unsubscribe

Subscriber state is stored locally in:

```text
.data/subscribers.json
```

That means you can share the bot publicly and let people opt in themselves.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WATCH_URL` | `https://noxa.fi/` | Site to monitor |
| `WATCH_MODE` | `dom` | `dom`, `text`, or `html` |
| `POLL_INTERVAL_MS` | `10000` | Polling interval |
| `REQUEST_TIMEOUT_MS` | `15000` | Fetch timeout |
| `SEND_STARTUP_PING` | `false` | Send a Telegram “watcher started” message |
| `STATE_DIR` | `.data` | Snapshot and state directory |
| `ENV_DISCOVERY` | `true` | Auto-load `.env` / `.env.local` from nearby folders |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token |
| `TELEGRAM_CHAT_ID` | — | Optional fixed chat/channel/group id |
| `TELEGRAM_THREAD_ID` | — | Optional Telegram forum topic id |
| `TELEGRAM_BROADCAST_SUBSCRIBERS` | `true` | Broadcast to everyone who sent `/start` |

## Watch modes

`WATCH_MODE=dom`

- good default
- hashes normalized HTML
- catches layout/content changes while ignoring some noisy markup

`WATCH_MODE=text`

- best if you only care about visible text changes

`WATCH_MODE=html`

- strictest mode
- any raw HTML change triggers

## Snapshots

State is stored in:

```text
.data/
  state.json
  snapshots/
    2026-07-22T12-00-00-000Z.html
    2026-07-22T12-00-00-000Z.txt
```

That gives you:

- the active hash
- last successful check time
- latest snapshot paths
- stored HTML
- extracted text used for diffs

## Telegram setup

1. Create a bot with `@BotFather`
2. Add the bot to your group or channel
3. Send at least one message in the destination chat
4. If you want self-service subscriptions, users can simply press `Start`
5. If you also want one fixed destination, get the `chat_id` and set `TELEGRAM_CHAT_ID`

Then test:

```bash
npm run test-alert
```

## Shared workspace env discovery

This project can auto-load `.env` and `.env.local` not only from its own folder, but also from parent folders and common sibling app folders like `frontend/`.

That is useful if you keep monitoring tools inside a bigger monorepo and want them to inherit shared environment settings without extra copy-paste.

If you want strict local-only config, disable it:

```bash
ENV_DISCOVERY=false
```

## Docker

### Build

```bash
docker build -t noxa-site-alert .
```

### Run

```bash
docker run --rm \
  --env-file .env \
  -v "$(pwd)/.data:/app/.data" \
  noxa-site-alert
```

### Or use compose

```bash
docker compose up -d
```

## Deployment ideas

You can run this almost anywhere:

- a tiny VPS with `systemd`
- Railway
- Fly.io
- Render
- a spare Raspberry Pi
- any Docker host

If you want the fastest practical alerts, keep the polling interval low and deploy it close to the internet edge you trust.

## VPS deploy in 3 minutes

This repo is intentionally easy to self-host on a small Linux box.

```bash
git clone https://github.com/yourname/noxa-site-alert.git
cd noxa-site-alert
cp .env.example .env
```

Put in your Telegram bot token, then:

```bash
sudo mkdir -p /opt/noxa-site-alert
sudo rsync -a --delete ./ /opt/noxa-site-alert/
cd /opt/noxa-site-alert
sudo bash scripts/install-vps.sh
sudo systemctl start noxa-site-alert
sudo systemctl status noxa-site-alert
```

Useful ops:

- `journalctl -u noxa-site-alert -f`
- `systemctl restart noxa-site-alert`
- `systemctl stop noxa-site-alert`

## Example systemd service

```ini
[Unit]
Description=noxa-site-alert
After=network.target

[Service]
WorkingDirectory=/opt/noxa-site-alert
ExecStart=/usr/bin/node /opt/noxa-site-alert/src/index.js watch
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Project structure

```text
noxa-site-alert/
  deploy/
    systemd/
      noxa-site-alert.service
  scripts/
    install-vps.sh
  src/
    config.js
    diff.js
    env.js
    fetch-site.js
    hash.js
    index.js
    state.js
    telegram.js
  .env.example
  Dockerfile
  docker-compose.yml
  LICENSE
  README.md
```

## Roadmap ideas

- selector-based monitoring for a specific DOM block
- screenshot capture on change
- webhook, Discord, and Slack notifiers
- deduping for noisy SPAs
- historical dashboard for change history
- optional webhook mode instead of `getUpdates`

## Contributing

PRs are welcome. If you improve detection quality, add new notifiers, or make the project easier to run for non-technical users, that is very much in scope.

## Disclaimer

This tool is intentionally simple and transparent. It is meant for operational awareness, not legal evidence or guaranteed uptime monitoring.
