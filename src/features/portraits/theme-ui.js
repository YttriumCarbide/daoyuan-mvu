export const THEME_UI = Object.freeze({
  default: { name: "普通", icon: "常" },
  female: { name: "性转", icon: "♀️" },
  special: { name: "心动", icon: "💖" },
  wedding: { name: "婚纱", icon: "👰" },
  tarot: { name: "塔罗", icon: "🔮" },
  swimsuit: { name: "泳装", icon: "👙" },
  nai: { name: "Nai", icon: "🥛" },
});

export function getThemeUi(theme) {
  return THEME_UI[theme] || { name: theme, icon: "🖼️" };
}
