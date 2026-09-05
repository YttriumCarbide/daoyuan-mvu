export const THEME_UI = Object.freeze({
  default: { name: "普通", icon: "常" },
  female: { name: "性转", icon: "♀️" },
  special: { name: "心动", icon: "💖" },
  wedding: { name: "婚纱", icon: "👰" },
  tarot: { name: "塔罗", icon: "🔮" },
  swimsuit: { name: "泳装", icon: "👙" },
  nai: { name: "Nai", icon: "🥛" },
});

let remoteThemeUi = {};
let remoteThemeAliases = {};

function normalizeThemeUiKey(theme) {
  const normalized = String(theme || "").trim().toLowerCase();
  return normalized === "normal" ? "default" : normalized;
}

export function setThemeUiConfiguration(configuration) {
  remoteThemeUi = { ...(configuration?.pools || {}) };
  remoteThemeAliases = { ...(configuration?.aliases || {}) };
}

export function resetThemeUiConfiguration() {
  remoteThemeUi = {};
  remoteThemeAliases = {};
}

function resolveThemeUiKey(theme) {
  let resolved = normalizeThemeUiKey(theme);
  const visited = new Set();
  while (remoteThemeAliases[resolved] && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = normalizeThemeUiKey(remoteThemeAliases[resolved]);
  }
  return resolved;
}

export function getThemeUi(theme) {
  const resolved = resolveThemeUiKey(theme);
  return (
    remoteThemeUi[resolved] ||
    THEME_UI[resolved] || { name: String(theme || resolved), icon: "🖼️" }
  );
}
