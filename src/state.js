const fs = require("fs");
const path = require("path");

function ensureStateDir(stateDir) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(path.join(stateDir, "snapshots"), { recursive: true });
}

function stateFilePath(stateDir) {
  return path.join(stateDir, "state.json");
}

function loadState(stateDir) {
  ensureStateDir(stateDir);
  const file = stateFilePath(stateDir);
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function saveState(stateDir, state) {
  ensureStateDir(stateDir);
  fs.writeFileSync(stateFilePath(stateDir), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function readTextFileMaybe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function writeSnapshot(stateDir, site) {
  ensureStateDir(stateDir);
  const stamp = site.fetchedAt.replace(/[:.]/g, "-");
  const snapshotsDir = path.join(stateDir, "snapshots");
  const htmlPath = path.join(snapshotsDir, `${stamp}.html`);
  const textPath = path.join(snapshotsDir, `${stamp}.txt`);

  fs.writeFileSync(htmlPath, site.html, "utf8");
  fs.writeFileSync(textPath, `${site.text}\n`, "utf8");

  return {
    htmlPath,
    textPath,
  };
}

module.exports = {
  loadState,
  saveState,
  writeSnapshot,
  readTextFileMaybe,
  ensureStateDir,
};
