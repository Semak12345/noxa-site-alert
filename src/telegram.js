async function telegramRequest(config, method, payload) {
  if (!config.telegramBotToken) {
    throw new Error("Telegram is not configured. Set TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram API error (${response.status})`);
  }

  return data;
}

async function sendTelegramMessage(config, chatId, text, options = {}) {
  if (!config.telegramBotToken) {
    throw new Error("Telegram is not configured. Set TELEGRAM_BOT_TOKEN.");
  }

  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };

  const threadId = options.threadId ?? config.telegramThreadId;
  if (threadId) {
    payload.message_thread_id = Number(threadId);
  }

  return telegramRequest(config, "sendMessage", payload);
}

async function getTelegramUpdates(config, offset) {
  return telegramRequest(config, "getUpdates", {
    offset,
    timeout: 0,
    allowed_updates: ["message"],
  });
}

async function syncSubscribers(config, subscribers) {
  if (!config.telegramBotToken || !config.telegramBroadcastSubscribers) {
    return {
      subscribers,
      added: [],
      removed: [],
    };
  }

  const response = await getTelegramUpdates(config, Number(subscribers.lastUpdateId || 0) + 1);
  const updates = Array.isArray(response.result) ? response.result : [];
  const next = {
    version: 1,
    lastUpdateId: subscribers.lastUpdateId || 0,
    chats: { ...(subscribers.chats || {}) },
  };
  const added = [];
  const removed = [];

  for (const update of updates) {
    if (typeof update.update_id === "number" && update.update_id > next.lastUpdateId) {
      next.lastUpdateId = update.update_id;
    }

    const message = update.message;
    if (!message || !message.chat) continue;

    const text = String(message.text || "").trim();
    if (!text.startsWith("/")) continue;

    const command = text.split(/\s+/)[0].toLowerCase();
    const chatId = String(message.chat.id);
    const existing = next.chats[chatId] || {};

    const chatRecord = {
      chatId,
      type: message.chat.type || existing.type || "unknown",
      title: message.chat.title || existing.title || "",
      username: message.chat.username || existing.username || "",
      firstName: message.chat.first_name || existing.firstName || "",
      lastName: message.chat.last_name || existing.lastName || "",
      lastSeenAt: new Date((message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      active: existing.active || false,
      addedAt: existing.addedAt || new Date().toISOString(),
    };

    if (command === "/start") {
      const wasActive = Boolean(existing.active);
      next.chats[chatId] = {
        ...chatRecord,
        active: true,
        addedAt: existing.addedAt || new Date().toISOString(),
      };

      if (!wasActive) {
        added.push(next.chats[chatId]);
      }
    }

    if (command === "/stop") {
      if (existing && existing.active) {
        next.chats[chatId] = {
          ...chatRecord,
          active: false,
          addedAt: existing.addedAt || new Date().toISOString(),
        };
        removed.push(next.chats[chatId]);
      }
    }
  }

  for (const chat of added) {
    await sendTelegramMessage(
      config,
      chat.chatId,
      [
        "✅ Subscribed to noxa-site-alert",
        `Watching: ${config.watchUrl}`,
        "You will receive alerts when the page changes.",
        "",
        "Send /stop to unsubscribe.",
      ].join("\n")
    );
  }

  for (const chat of removed) {
    await sendTelegramMessage(
      config,
      chat.chatId,
      [
        "🛑 Unsubscribed from noxa-site-alert",
        `Watching: ${config.watchUrl}`,
        "Send /start anytime to subscribe again.",
      ].join("\n")
    );
  }

  return {
    subscribers: next,
    added,
    removed,
  };
}

async function broadcastTelegramMessage(config, subscribers, text) {
  const targets = new Map();

  if (config.telegramChatId) {
    targets.set(String(config.telegramChatId), {
      chatId: String(config.telegramChatId),
      threadId: config.telegramThreadId || "",
    });
  }

  if (config.telegramBroadcastSubscribers) {
    for (const chat of Object.values(subscribers.chats || {})) {
      if (!chat || !chat.active) continue;
      targets.set(String(chat.chatId), {
        chatId: String(chat.chatId),
      });
    }
  }

  if (!targets.size) {
    throw new Error("No Telegram targets configured. Set TELEGRAM_CHAT_ID or subscribe with /start.");
  }

  const results = [];
  for (const target of targets.values()) {
    try {
      const response = await sendTelegramMessage(config, target.chatId, text, {
        threadId: target.threadId || "",
      });
      results.push({
        chatId: target.chatId,
        ok: true,
        response,
      });
    } catch (error) {
      results.push({
        chatId: target.chatId,
        ok: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  sendTelegramMessage,
  broadcastTelegramMessage,
  syncSubscribers,
};
