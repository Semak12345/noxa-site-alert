function normalizeLines(text) {
  return String(text || "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function unique(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    result.push(line);
  }

  return result;
}

function buildDiff(beforeText, afterText, limit = 8) {
  const before = unique(normalizeLines(beforeText));
  const after = unique(normalizeLines(afterText));
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  const removed = before.filter((line) => !afterSet.has(line)).slice(0, limit);
  const added = after.filter((line) => !beforeSet.has(line)).slice(0, limit);

  return {
    added,
    removed,
  };
}

function formatDiff(diff) {
  const lines = [];

  if (diff.added.length) {
    lines.push("Added:");
    for (const line of diff.added) {
      lines.push(`+ ${truncate(line, 180)}`);
    }
  }

  if (diff.removed.length) {
    if (lines.length) lines.push("");
    lines.push("Removed:");
    for (const line of diff.removed) {
      lines.push(`- ${truncate(line, 180)}`);
    }
  }

  return lines.join("\n");
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

module.exports = {
  buildDiff,
  formatDiff,
};
