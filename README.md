# noxa-site-alert

[![CI](https://github.com/Semak12345/noxa-site-alert/actions/workflows/ci.yml/badge.svg)](https://github.com/Semak12345/noxa-site-alert/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-7c3aed.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-0f172a.svg)](package.json)
[![Telegram](https://img.shields.io/badge/alerts-Telegram-2563eb.svg)](https://telegram.org/)
[![Live Bot](https://img.shields.io/badge/live%20bot-@NOXA__AlertBot-229ED9.svg)](https://t.me/NOXA_AlertBot)

Open-source website change detection for `https://noxa.fi/`.

It watches the page, stores a baseline, detects real changes, and sends Telegram alerts.

Live public bot: https://t.me/NOXA_AlertBot

![noxa-site-alert hero](assets/hero.svg)

## Features

- preconfigured for `https://noxa.fi/`
- instant Telegram alerts on content change
- self-service subscriptions through `/start`
- local HTML and text snapshots for auditability
- three watch modes: `dom`, `text`, `html`
- fetch error and recovery alerts
- optional regex-based noise filtering for false positives
- automatic `.env` discovery for monorepos
- Docker and `docker-compose` support
- tiny-VPS-friendly `systemd` deploy path
- zero third-party runtime dependencies

## Flow

![noxa-site-alert flow](assets/flow.svg)

1. Fetch the target page
2. Normalize noisy markup
3. Compare hashes against the stored baseline
4. Broadcast a Telegram alert and save snapshots if something changed

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

Set at minimum:

- `TELEGRAM_BOT_TOKEN`

Optional:

- `TELEGRAM_CHAT_ID` for one fixed admin/group destination
- `TELEGRAM_THREAD_ID` for a Telegram forum topic
- `IGNORE_HTML_REGEX` or `IGNORE_TEXT_REGEX` if the page has noisy changing fragments

### 3. Create the first baseline

```bash
npm install
npm run init
```

This stores the current version of the page without sending an alert.

### 4. Start the watcher

```bash
npm start
```

Default polling interval is `10000ms`.

### 5. Subscribe in Telegram

Open the live bot and press `Start`:

https://t.me/NOXA_AlertBot

You will get:

- a confirmation that you are on the alert list
- change alerts for `noxa.fi`
- outage and recovery alerts
- `/stop` support to unsubscribe

## Example alert

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

- `doctor` — prints resolved config and discovered env files
- `init` — saves the initial baseline
- `check` — runs a single fetch-and-compare cycle
- `test-alert` — sends a Telegram test message
- `start` — starts the continuous watcher loop

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WATCH_URL` | `https://noxa.fi/` | Site to monitor |
| `WATCH_MODE` | `dom` | `dom`, `text`, or `html` |
| `POLL_INTERVAL_MS` | `10000` | Polling interval |
| `REQUEST_TIMEOUT_MS` | `15000` | Fetch timeout |
| `SEND_STARTUP_PING` | `false` | Send a startup Telegram message |
| `STATE_DIR` | `.data` | Snapshot and state directory |
| `ENV_DISCOVERY` | `true` | Auto-load nearby `.env` / `.env.local` files |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token |
| `TELEGRAM_CHAT_ID` | — | Optional fixed chat, group, or channel id |
| `TELEGRAM_THREAD_ID` | — | Optional Telegram forum topic id |
| `TELEGRAM_BROADCAST_SUBSCRIBERS` | `true` | Broadcast to everyone who pressed `/start` |
| `IGNORE_HTML_REGEX` | — | Regex rules to remove noisy HTML fragments before hashing |
| `IGNORE_TEXT_REGEX` | — | Regex rules to remove noisy text fragments before hashing |

## Watch modes

`WATCH_MODE=dom`

- best default for most sites
- hashes normalized HTML
- catches structure and content changes while ignoring scripts/styles/comments

`WATCH_MODE=text`

- best if you only care about visible text changes
- good for “coming soon → live” transitions

`WATCH_MODE=html`

- strictest mode
- any raw HTML change will trigger

## False positives and tuning

Some pages change small noisy fragments on every request: timestamps, rotating counters, hydration ids, or build markers.

Use the ignore rules when that happens.

Single rule:

```bash
IGNORE_TEXT_REGEX=Last updated: .* 
```

Multiple rules:

```bash
IGNORE_TEXT_REGEX=Last updated: .*||Build #[0-9]+
IGNORE_HTML_REGEX=data-hydration="[^"]+"||nonce="[^"]+"
```

Slash-delimited regex is also supported:

```bash
IGNORE_TEXT_REGEX=/last updated:.*/gi
```

Practical advice:

- start with `WATCH_MODE=text` if you only care about visible copy
- add ignore rules only after you observe noise
- keep rules narrow so you do not hide real changes
- run `npm run check` after each tuning change

## State and snapshots

State is stored in:

```text
.data/
  state.json
  subscribers.json
  snapshots/
    2026-07-22T12-00-00-000Z.html
    2026-07-22T12-00-00-000Z.txt
```

This gives you:

- the active baseline hash
- last successful check time
- latest snapshot paths
- the raw HTML snapshot
- extracted text used for diffing
- the Telegram subscriber list

## Telegram setup

1. Create a bot with `@BotFather`
2. Put the token into `.env`
3. Run `npm run test-alert`
4. If you want a fixed admin or group destination, add `TELEGRAM_CHAT_ID`
5. If you want public opt-in alerts, let users press `Start`
6. When a user presses `Start`, the bot confirms the subscription in English

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

Or use compose:

```bash
docker compose up -d
```

## VPS deploy in 3 minutes

```bash
git clone https://github.com/Semak12345/noxa-site-alert.git
cd noxa-site-alert
cp .env.example .env
```

Fill in your bot token, then:

```bash
sudo mkdir -p /opt/noxa-site-alert
sudo rsync -a --delete ./ /opt/noxa-site-alert/
cd /opt/noxa-site-alert
sudo bash scripts/install-vps.sh
sudo systemctl start noxa-site-alert
sudo systemctl status noxa-site-alert
```

Useful commands after deploy:

```bash
sudo systemctl restart noxa-site-alert
sudo journalctl -u noxa-site-alert -f
```

## Monorepo-friendly env discovery

If this watcher lives inside a larger workspace, it can auto-load nearby `.env` and `.env.local` files from parent folders and common sibling app folders such as `frontend/`.

If you want strict local-only config:

```bash
ENV_DISCOVERY=false
```

## Good use cases

- launch page monitoring
- NFT or app mint pages
- startup “coming soon” sites
- campaign landing pages
- one-page docs that should not silently change
- “ping me when this becomes real” bots for private groups

## Roadmap ideas

- selector-based ignore rules
- Slack and Discord delivery
- web dashboard for recent diffs
- deploy recipes for Fly.io and Railway
- signed webhook mode for external automations

## Contributing

PRs are welcome. If you want to extend transports, tune diff behavior, or add deployment targets, open an issue or jump straight into a patch.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
