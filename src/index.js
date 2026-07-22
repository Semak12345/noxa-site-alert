const fs = require("fs");
const path = require("path");
const { loadEnvFiles } = require("./env");
const { buildConfig, configSummary } = require("./config");
const { fetchSite } = require("./fetch-site");
const { buildDiff, formatDiff } = require("./diff");
const { loadState, saveState, writeSnapshot, readTextFileMaybe, ensureStateDir } = require("./state");
const { sendTelegramMessage, broadcastTelegramMessage, syncSubscribers } = require("./telegram");
const { loadSubscribers, saveSubscribers, activeSubscribers } = require("./subscribers");

async function main() {
  const cwd = process.cwd();
  const envReport = loadEnvFiles(cwd);
  const config = buildConfig(cwd, envReport);
  const command = String(process.argv[2] || "watch").trim().toLowerCase();

  ensureStateDir(config.stateDir);

  if (command === "doctor") {
    runDoctor(config);
    return;
  }

  if (command === "test-alert") {
    await runTestAlert(config);
    return;
  }

  if (command === "init") {
    await runInit(config);
    return;
  }

  if (command === "check") {
    await runCheck(config, { notify: true });
    return;
  }

  if (command === "watch") {
    await runWatch(config);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}

function runDoctor(config) {
  console.log("noxa-site-alert doctor");
  console.log("");
  console.log(JSON.stringify(configSummary(config), null, 2));

  if (config.envReport.files.length) {
    console.log("");
    console.log("Loaded env files:");
    for (const item of config.envReport.files) {
      console.log(`- ${item.filePath}${item.keys.length ? ` (${item.keys.length} keys)` : ""}`);
    }
  } else {
    console.log("");
    console.log("Loaded env files: none");
  }
}

async function runTestAlert(config) {
  const subscribers = loadSubscribers(config.stateDir);
  await syncAndPersistSubscribers(config, subscribers);
  await broadcastTelegramMessage(config, loadSubscribers(config.stateDir), [
      "🧪 noxa-site-alert test message",
      `URL: ${config.watchUrl}`,
      `Mode: ${config.watchMode}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n"));

  console.log("Test alert sent.");
}

async function runInit(config) {
  const site = await fetchSite(config);
  const snapshots = writeSnapshot(config.stateDir, site);
  const state = makeHealthyState(config, site, snapshots);
  saveState(config.stateDir, state);

  console.log(`Baseline saved for ${site.url}`);
  console.log(`Active hash: ${site.hashes.activeHash}`);
}

async function runCheck(config, options = {}) {
  const notify = options.notify !== false;
  const state = loadState(config.stateDir);
  const subscribers = await syncAndPersistSubscribers(config, loadSubscribers(config.stateDir));

  try {
    const site = await fetchSite(config);

    if (!state || !state.currentHash) {
      const snapshots = writeSnapshot(config.stateDir, site);
      const nextState = makeHealthyState(config, site, snapshots);
      saveState(config.stateDir, nextState);
      console.log(`Initialized baseline for ${site.url}`);
      return;
    }

    const changed = state.currentHash !== site.hashes.activeHash;
    const recoveredFromError = state.lastError && !state.lastError.resolvedAt;

    if (changed) {
      const previousText = readTextFileMaybe(state.latestSnapshotTextPath);
      const snapshots = writeSnapshot(config.stateDir, site);
      const nextState = makeHealthyState(config, site, snapshots);
      saveState(config.stateDir, nextState);

      const diff = buildDiff(previousText, site.text);
      const message = buildChangeMessage(config, state, nextState, site, diff);

      if (notify && isTelegramReady(config, subscribers)) {
        await broadcastTelegramMessage(config, subscribers, message);
      }

      console.log(`Change detected at ${site.fetchedAt}`);
      return;
    }

    const nextState = {
      ...state,
      lastCheckedAt: site.fetchedAt,
      title: site.title || state.title,
      statusCode: site.statusCode,
      contentType: site.contentType,
      lastError: recoveredFromError
        ? {
            ...state.lastError,
            resolvedAt: site.fetchedAt,
          }
        : state.lastError || null,
    };

    saveState(config.stateDir, nextState);

    if (recoveredFromError && notify && isTelegramReady(config, subscribers)) {
      await broadcastTelegramMessage(
        config,
        subscribers,
        [
          "✅ noxa-site-alert recovered",
          `URL: ${config.watchUrl}`,
          `Time: ${site.fetchedAt}`,
          site.title ? `Title: ${site.title}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    console.log(`No change at ${site.fetchedAt}`);
  } catch (error) {
    await handleError(config, state, subscribers, error, notify);
    throw error;
  }
}

async function runWatch(config) {
  const subscribers = await syncAndPersistSubscribers(config, loadSubscribers(config.stateDir));

  if (config.sendStartupPing && isTelegramReady(config, subscribers)) {
    await broadcastTelegramMessage(
      config,
      subscribers,
      [
        "🚀 noxa-site-alert started",
        `URL: ${config.watchUrl}`,
        `Mode: ${config.watchMode}`,
        `Interval: ${config.pollIntervalMs}ms`,
        `Time: ${new Date().toISOString()}`,
      ].join("\n")
    );
  }

  while (true) {
    try {
      await runCheck(config, { notify: true });
    } catch (error) {
      console.error(`[watch] ${error.message}`);
    }

    await sleep(config.pollIntervalMs);
  }
}

async function handleError(config, state, subscribers, error, notify) {
  const now = new Date().toISOString();
  const alreadyOpenError = state?.lastError && !state.lastError.resolvedAt;

  const nextState = {
    ...(state || {}),
    lastCheckedAt: now,
    lastError: {
      message: error.message,
      startedAt: alreadyOpenError ? state.lastError.startedAt : now,
      lastSeenAt: now,
      resolvedAt: null,
    },
  };

  saveState(config.stateDir, nextState);

  if (!alreadyOpenError && notify && isTelegramReady(config, subscribers)) {
    await broadcastTelegramMessage(
      config,
      subscribers,
      [
        "⚠️ noxa-site-alert fetch error",
        `URL: ${config.watchUrl}`,
        `Time: ${now}`,
        `Error: ${error.message}`,
      ].join("\n")
    );
  }
}

function makeHealthyState(config, site, snapshots) {
  return {
    version: 1,
    url: config.watchUrl,
    mode: config.watchMode,
    currentHash: site.hashes.activeHash,
    rawHash: site.hashes.rawHash,
    htmlHash: site.hashes.htmlHash,
    textHash: site.hashes.textHash,
    title: site.title,
    statusCode: site.statusCode,
    contentType: site.contentType,
    firstSeenAt: site.fetchedAt,
    lastCheckedAt: site.fetchedAt,
    lastChangedAt: site.fetchedAt,
    latestSnapshotHtmlPath: snapshots.htmlPath,
    latestSnapshotTextPath: snapshots.textPath,
    lastError: null,
  };
}

function buildChangeMessage(config, previousState, nextState, site, diff) {
  const parts = [
    "🚨 noxa.fi changed",
    `URL: ${config.watchUrl}`,
    `Detected: ${site.fetchedAt}`,
    site.title ? `Title: ${site.title}` : null,
    `Mode: ${config.watchMode}`,
    `Previous hash: ${shortHash(previousState.currentHash)}`,
    `New hash: ${shortHash(nextState.currentHash)}`,
  ].filter(Boolean);

  const formattedDiff = formatDiff(diff);
  if (formattedDiff) {
    parts.push("", formattedDiff);
  } else if (site.preview) {
    parts.push("", "Preview:", site.preview.slice(0, 800));
  }

  return parts.join("\n");
}

async function syncAndPersistSubscribers(config, subscribers) {
  const result = await syncSubscribers(config, subscribers);
  saveSubscribers(config.stateDir, result.subscribers);
  return result.subscribers;
}

function isTelegramReady(config, subscribers) {
  if (!config.telegramBotToken) return false;
  if (config.telegramChatId) return true;
  return activeSubscribers(subscribers).length > 0;
}

function shortHash(hash) {
  if (!hash) return "n/a";
  return hash.slice(0, 12);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
