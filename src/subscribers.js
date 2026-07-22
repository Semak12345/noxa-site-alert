const fs = require("fs");
const path = require("path");

function subscribersFilePath(stateDir) {
  return path.join(stateDir, "subscribers.json");
}

function loadSubscribers(stateDir) {
  const filePath = subscribersFilePath(stateDir);
  if (!fs.existsSync(filePath)) {
    return {
      version: 1,
      lastUpdateId: 0,
      chats: {},
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      version: 1,
      lastUpdateId: Number(parsed.lastUpdateId || 0),
      chats: parsed.chats || {},
    };
  } catch {
    return {
      version: 1,
      lastUpdateId: 0,
      chats: {},
    };
  }
}

function saveSubscribers(stateDir, data) {
  fs.writeFileSync(subscribersFilePath(stateDir), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function activeSubscribers(subscribers) {
  return Object.values(subscribers.chats || {}).filter((chat) => chat && chat.active);
}

module.exports = {
  loadSubscribers,
  saveSubscribers,
  activeSubscribers,
};
