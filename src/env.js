const fs = require("fs");
const path = require("path");

function parseEnvFile(content) {
  const result = {};
  const lines = String(content || "").split(/\r?\n/g);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function listAncestorDirs(startDir) {
  const dirs = [];
  let current = path.resolve(startDir);

  while (true) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return dirs.reverse();
}

function candidateDirs(startDir) {
  const ancestors = listAncestorDirs(startDir);
  const seen = new Set();
  const dirs = [];

  for (const dir of ancestors) {
    if (!seen.has(dir)) {
      seen.add(dir);
      dirs.push(dir);
    }

    const frontendDir = path.join(dir, "frontend");
    if (fs.existsSync(frontendDir) && fs.statSync(frontendDir).isDirectory() && !seen.has(frontendDir)) {
      seen.add(frontendDir);
      dirs.push(frontendDir);
    }
  }

  return dirs;
}

function loadEnvFiles(startDir) {
  const originalKeys = new Set(Object.keys(process.env));
  const loadedFiles = [];
  const sourcesByKey = {};
  const discoveryEnabled = readBool(process.env.ENV_DISCOVERY, true);

  if (!discoveryEnabled) {
    return {
      enabled: false,
      files: [],
      sourcesByKey: {},
    };
  }

  const filenames = [".env", ".env.local"];

  for (const dir of candidateDirs(startDir)) {
    for (const filename of filenames) {
      const filePath = path.join(dir, filename);
      if (!fs.existsSync(filePath)) continue;

      const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
      const loadedKeys = [];

      for (const [key, value] of Object.entries(parsed)) {
        if (originalKeys.has(key)) {
          continue;
        }

        process.env[key] = value;
        sourcesByKey[key] = filePath;
        loadedKeys.push(key);
      }

      loadedFiles.push({
        filePath,
        keys: loadedKeys.sort(),
      });
    }
  }

  return {
    enabled: true,
    files: loadedFiles,
    sourcesByKey,
  };
}

function readBool(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

module.exports = {
  loadEnvFiles,
};
