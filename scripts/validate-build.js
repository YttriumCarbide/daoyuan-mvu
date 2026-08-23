import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { encodeRegexReplacementTokens } from "./regex-replacement-safety.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distHtmlPath = path.join(projectRoot, "dist/index.html");
const target = process.env.BUILD_TARGET === "shujuku" ? "shujuku" : "mvu";
const regexJsonPath = path.join(projectRoot, `dist/regex-${target}.json`);
const forbiddenEntityLiterals = ["&amp;", "&quot;", "&lt;", "&gt;"];

const distHtml = fs.readFileSync(distHtmlPath, "utf8");
const regexConfig = JSON.parse(fs.readFileSync(regexJsonPath, "utf8"));
const captureOne = "1537";
const captureTwo = "DA0YUAN_MESSAGE_BODY_CAPTURE";
const expectedRegexHtml = encodeRegexReplacementTokens(distHtml);
const nativeSimulatedReplacement = `${captureOne}${captureTwo}`.replace(
  new RegExp(`(${captureOne})(${captureTwo})`),
  regexConfig.replaceString,
);
const tavernHelperSimulatedReplacement = regexConfig.replaceString
  .replaceAll("$1", captureOne)
  .replaceAll("$2", captureTwo);
const fenceMatch = tavernHelperSimulatedReplacement.match(/^(`+)html\n/);

if (!fenceMatch) {
  throw new Error("Regex replacement is missing its opening HTML fence");
}

const fence = fenceMatch[1];
const closingFence = `\n${fence}`;
if (!tavernHelperSimulatedReplacement.endsWith(closingFence)) {
  throw new Error("Regex replacement is missing its closing HTML fence");
}

const renderedHtml = tavernHelperSimulatedReplacement.slice(
  fenceMatch[0].length,
  -closingFence.length,
);
const nativeRenderedHtml = nativeSimulatedReplacement.slice(
  fenceMatch[0].length,
  -closingFence.length,
);

if (
  renderedHtml !== expectedRegexHtml ||
  nativeRenderedHtml !== expectedRegexHtml
) {
  throw new Error(
    "Regex replacement changed the protected HTML; check exposed replacement tokens",
  );
}

const exposedReplacementToken = regexConfig.replaceString.match(
  /\$(?:\$|\d|[&`'<])/,
);
if (exposedReplacementToken) {
  throw new Error(
    `Regex replacement still exposes token ${exposedReplacementToken[0]}`,
  );
}

const inlineScripts = Array.from(
  renderedHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  (match) => match[1],
);

inlineScripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `regex-${target}-inline-${index}.js` });
  } catch (error) {
    throw new Error(
      `Regex-rendered inline script ${index} is invalid: ${error.message}`,
    );
  }
});
const unsafeEntities = forbiddenEntityLiterals.filter((entity) => {
  return inlineScripts.some((script) => script.includes(entity));
});
const requiredImageLibraryMarkers = [
  "images.json",
  "daoyuan_images_cache_v2",
  "daoyuan_portrait_preferences_v2",
  "daoyuan_portrait_preferences_migration_version",
  "daoyuan_status_assets",
  "idb:daoyuan-portrait:",
  "daoyuan_images_changed",
  "portrait-pool-selector",
  "portrait-pool-body-open",
  "switchPortraitInPool",
  "Nai",
  "🥛",
  "urls.length === 0",
  "dyImageCacheMissing",
  "getSectMapImages",
  "replaceChildren",
];
const missingImageLibraryMarkers = requiredImageLibraryMarkers.filter(
  marker => !distHtml.includes(marker),
);
const forbiddenLegacyImageFiles = [
  "portraits.json",
  "portrait-drawers.json",
  "sect-maps.json",
].filter(marker => distHtml.includes(marker));

if (unsafeEntities.length > 0) {
  throw new Error(
    `Inline scripts contain srcdoc-sensitive HTML entities: ${unsafeEntities.join(", ")}`,
  );
}

if (missingImageLibraryMarkers.length > 0) {
  throw new Error(
    `Build is missing image-library markers: ${missingImageLibraryMarkers.join(", ")}`,
  );
}

if (forbiddenLegacyImageFiles.length > 0) {
  throw new Error(
    `Build still references legacy image files: ${forbiddenLegacyImageFiles.join(", ")}`,
  );
}

console.log(
  "Validated regex replacement, inline scripts, and unified images.json build markers",
);
