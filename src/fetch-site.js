const { sha256 } = require("./hash");
const { applyRegexReplacements } = require("./normalize");

function stripVolatileHtml(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html) {
  const cleaned = String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|main|header|footer|li|ul|ol|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(cleaned)
    .split(/\r?\n/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function extractTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim() : "";
}

function previewText(text, maxLines = 12) {
  return String(text || "")
    .split(/\r?\n/g)
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
}

async function fetchSite(config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(config.watchUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "noxa-site-alert/1.0 (+https://github.com/Semak12345/noxa-site-alert)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const html = await response.text();
    const normalizedHtml = applyRegexReplacements(
      stripVolatileHtml(html),
      config.ignoreHtmlRegexes
    );
    const text = applyRegexReplacements(
      htmlToText(html),
      config.ignoreTextRegexes
    );
    const normalizedText = text.replace(/\s+/g, " ").trim();
    const title = extractTitle(html);

    const rawHash = sha256(html);
    const htmlHash = sha256(normalizedHtml);
    const textHash = sha256(normalizedText);

    let activeHash = htmlHash;
    if (config.watchMode === "html") activeHash = rawHash;
    if (config.watchMode === "text") activeHash = textHash;

    return {
      url: response.url,
      statusCode: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type") || "",
      fetchedAt: new Date().toISOString(),
      title,
      html,
      text,
      preview: previewText(text),
      hashes: {
        rawHash,
        htmlHash,
        textHash,
        activeHash,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  fetchSite,
};
