import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputPath = path.join(projectRoot, "dist/daoyuan-floating-mvu.json");

if (!fs.existsSync(outputPath)) {
  throw new Error(`Floating MVU output not found at ${outputPath}`);
}

const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const requiredShape = {
  type: "string",
  enabled: "boolean",
  name: "string",
  id: "string",
  content: "string",
  info: "string",
  button: "object",
  data: "object",
  export_with: "object",
};
const invalidFields = Object.entries(requiredShape)
  .filter(([key, type]) => typeof output[key] !== type)
  .map(([key]) => key);

if (output.type !== "script" || invalidFields.length > 0) {
  throw new Error(
    `Invalid Tavern Helper script JSON fields: ${invalidFields.join(", ") || "type"}`,
  );
}

if (
  !Array.isArray(output.button.buttons) ||
  typeof output.button.enabled !== "boolean" ||
  typeof output.export_with.data !== "boolean" ||
  typeof output.export_with.button !== "boolean"
) {
  throw new Error("Invalid Tavern Helper button/export_with structure");
}

const scriptContent = output.content;
const requiredMarkers = [
  "daoyuan-floating-mvu-root",
  "daoyuan-floating-mvu-status",
  "daoyuan-floating-mvu-launcher",
  "daoyuan-floating-mvu-panel-drag",
  "daoyuan-floating-mvu-resize-",
  "daoyuan-floating-mvu-pet-style",
  "resizeHandleSettings",
  "daoyuan-floating-mvu-layout-v4",
  "daoyuan-floating-mvu-layout-v3",
  "mobile-portrait",
  "mobile-landscape",
  "activeLayoutProfile",
  "applyLoadedLayout",
  "setPetState",
  "petTransitionTimer",
  "petBubbleTimer",
  "getLauncherSize",
  "dy-pet-idle",
  "dy-pet-press",
  "dy-pet-drag",
  "dy-pet-open",
  "dy-pet-close",
  "dy-pet-release",
  "dy-pet-peek",
  "dy-pet-update-bubble",
  "launcherDockSide",
  "getLauncherDockSideFromRect",
  "data-dock-side",
  "setPetUpdateNotice",
  "isDangerousMvuData",
  "南可熙",
  "哟，棋局又动了。",
  "嘶——别敲本姑娘！",
  "来，本姑娘给你瞧瞧。",
  "行啦，本姑娘歇会儿。",
  "喂！别提本姑娘的腰！",
  "嘘，本姑娘在这儿看着。",
  "真是杂鱼……退后。",
  "transform-origin:52% 20%",
  "rgba(92,196,255,.82)",
  "#d8f5ff",
  "(pointer: coarse)",
  "waitGlobalInitialized",
  "getMvuData",
  "replaceMvuData",
  "daoyuan_mvu_manual_updated",
  "eventEmit",
  "getPersonaAvatarPath",
  "getButtonEvent",
  "VARIABLE_UPDATE_ENDED",
  "__daoyuanFloatingBridge",
  "images.json",
  "portrait-drawers.json",
  "daoyuan_images_cache_v2",
  "daoyuan_portrait_drawers_cache_v1",
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
  "dyPortraitCacheMissing",
  "getSectMapImages",
  "DaoyuanStatusStorage",
  "sharedStatusStorage",
  "portraitRevision",
  "replaceChildren",
];
const missingMarkers = requiredMarkers.filter(
  marker => !scriptContent.includes(marker),
);

const forbiddenLegacyImageFiles = [
  "portraits.json",
  "sect-maps.json",
].filter(marker => scriptContent.includes(marker));

if (missingMarkers.length > 0) {
  throw new Error(
    `Floating MVU output is missing markers: ${missingMarkers.join(", ")}`,
  );
}

if (forbiddenLegacyImageFiles.length > 0) {
  throw new Error(
    `Floating MVU still references legacy image files: ${forbiddenLegacyImageFiles.join(", ")}`,
  );
}

if (
  !scriptContent.includes("if (collapsed) {") ||
  !scriptContent.includes("isDangerousMvuData(args[0] || latestMvuData)") ||
  !scriptContent.includes("setPetUpdateNotice(false);")
) {
  throw new Error(
    "Floating MVU output is missing collapsed-update notice lifecycle behavior",
  );
}

if (scriptContent.includes("DaoyuanStatusDb")) {
  throw new Error("Floating MVU output unexpectedly contains Shujuku adapter code");
}

const embeddedPetImages = [
  ...scriptContent.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g),
].map(match => Buffer.from(match[1], "base64"));

if (embeddedPetImages.length !== 7) {
  throw new Error(
    `Expected 7 embedded floating pet WebP states, found ${embeddedPetImages.length}`,
  );
}

embeddedPetImages.forEach((image, index) => {
  if (
    image.length < 4096 ||
    image.toString("ascii", 0, 4) !== "RIFF" ||
    image.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error(`Embedded floating pet state ${index + 1} is not a valid WebP`);
  }
  if (image.length > 128 * 1024) {
    throw new Error(
      `Embedded floating pet state ${index + 1} is unexpectedly large: ${image.length} bytes`,
    );
  }
});

if (/<\/script/i.test(scriptContent)) {
  throw new Error(
    "Floating MVU script contains an unescaped </script> that would break the Tavern Helper module iframe",
  );
}

new vm.Script(scriptContent, { filename: "daoyuan-floating-mvu.content.js" });

console.log(
  "Validated Tavern Helper JSON schema, seven embedded pet states, floating MVU markers, and JavaScript syntax",
);
