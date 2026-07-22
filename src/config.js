const path = require("path");

function readInt(value, fallback, min) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (typeof min === "number" && parsed < min) return fallback;
  return parsed;
}

function readBool(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeMode(value) {
  const mode = String(value || "dom").trim().toLowerCase();
  if (["dom", "text", "html"].includes(mode)) return mode;
  return "dom";
}

function parseRegexToken(token, envName) {
  const value = String(token || "").trim();
  if (!value) return null;

  if (value.startsWith("/") && value.lastIndexOf("/") > 0) {
    const lastSlash = value.lastIndexOf("/");
    const pattern = value.slice(1, lastSlash);
    const flags = value.slice(lastSlash + 1);

    try {
      return new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
    } catch (error) {
      throw new Error(`Invalid ${envName} regex ${value}: ${error.message}`);
    }
  }

  try {
    return new RegExp(value, "g");
  } catch (error) {
    throw new Error(`Invalid ${envName} regex ${value}: ${error.message}`);
  }
}

function parseRegexList(value, envName) {
  return String(value || "")
    .split(/\r?\n|\|\|/g)
    .map((item) => parseRegexToken(item, envName))
    .filter(Boolean);
}

function buildConfig(startDir, envReport) {
  const stateDirValue = process.env.STATE_DIR || ".data";
  const ignoreHtmlRegexes = parseRegexList(process.env.IGNORE_HTML_REGEX, "IGNORE_HTML_REGEX");
  const ignoreTextRegexes = parseRegexList(process.env.IGNORE_TEXT_REGEX, "IGNORE_TEXT_REGEX");

  return {
    cwd: startDir,
    watchUrl: process.env.WATCH_URL || "https://noxa.fi/",
    watchMode: normalizeMode(process.env.WATCH_MODE),
    pollIntervalMs: readInt(process.env.POLL_INTERVAL_MS, 10000, 1000),
    requestTimeoutMs: readInt(process.env.REQUEST_TIMEOUT_MS, 15000, 1000),
    sendStartupPing: readBool(process.env.SEND_STARTUP_PING, false),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    telegramThreadId: process.env.TELEGRAM_THREAD_ID || "",
    telegramBroadcastSubscribers: readBool(process.env.TELEGRAM_BROADCAST_SUBSCRIBERS, true),
    ignoreHtmlRegexes,
    ignoreTextRegexes,
    stateDir: path.isAbsolute(stateDirValue) ? stateDirValue : path.resolve(startDir, stateDirValue),
    envReport,
  };
}

function redactSecret(value) {
  if (!value) return "not set";
  if (value.length <= 10) return "set";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function configSummary(config) {
  return {
    watchUrl: config.watchUrl,
    watchMode: config.watchMode,
    pollIntervalMs: config.pollIntervalMs,
    requestTimeoutMs: config.requestTimeoutMs,
    stateDir: config.stateDir,
    sendStartupPing: config.sendStartupPing,
    telegramBotToken: redactSecret(config.telegramBotToken),
    telegramChatId: config.telegramChatId || "not set",
    telegramThreadId: config.telegramThreadId || "not set",
    telegramBroadcastSubscribers: config.telegramBroadcastSubscribers,
    ignoreHtmlRegexCount: config.ignoreHtmlRegexes.length,
    ignoreTextRegexCount: config.ignoreTextRegexes.length,
    envDiscovery: config.envReport.enabled,
  };
}

module.exports = {
  buildConfig,
  configSummary,
};
