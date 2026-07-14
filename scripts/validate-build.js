import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distHtmlPath = path.join(projectRoot, "dist/index.html");
const forbiddenEntityLiterals = ["&amp;", "&quot;", "&lt;", "&gt;"];

const distHtml = fs.readFileSync(distHtmlPath, "utf8");
const inlineScripts = Array.from(
  distHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  (match) => match[1],
);
const unsafeEntities = forbiddenEntityLiterals.filter((entity) => {
  return inlineScripts.some((script) => script.includes(entity));
});

if (unsafeEntities.length > 0) {
  throw new Error(
    `Inline scripts contain srcdoc-sensitive HTML entities: ${unsafeEntities.join(", ")}`,
  );
}

console.log("Validated inline scripts for srcdoc-safe entity handling");
