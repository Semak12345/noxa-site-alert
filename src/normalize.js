function applyRegexReplacements(input, regexes) {
  let output = String(input || "");

  for (const regex of regexes || []) {
    output = output.replace(regex, " ");
  }

  return output;
}

module.exports = {
  applyRegexReplacements,
};
