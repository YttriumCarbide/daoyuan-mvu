function getAffection(characterStats = {}) {
  return Number.parseFloat(
    characterStats.亲密 ||
      characterStats.好感 ||
      characterStats.亲密度 ||
      characterStats.好感度 ||
      0,
  );
}

export function canUsePortraitTheme(theme, images, characterStats = {}) {
  if (!Array.isArray(images) || images.length === 0) return false;
  if (theme === "special") return getAffection(characterStats) > 90;
  return true;
}
