const inlineScriptPattern =
  /(<script\b(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi;
const regexReplacementTokenPattern = /\$(?=\$|\d|[&`'<])/g;

export function encodeRegexReplacementTokens(html) {
  return html.replace(
    inlineScriptPattern,
    (fullMatch, openingTag, script, closingTag) => {
      const safeScript = script.replace(
        regexReplacementTokenPattern,
        "\\u0024",
      );
      return `${openingTag}${safeScript}${closingTag}`;
    },
  );
}
