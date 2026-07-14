import registry from "../../data/applause-character-registry.json";

const characterIdByName = new Map(
  registry.characters
    .filter(({ characterId, name, status }) => {
      return (
        status === "active" &&
        Number.isInteger(characterId) &&
        characterId > 0 &&
        typeof name === "string"
      );
    })
    .map(({ characterId, name }) => [name.trim(), characterId]),
);

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderDaoyuanApplause(characterName) {
  const normalizedName = String(characterName).trim();
  const characterId = characterIdByName.get(normalizedName);
  if (!characterId) return "";

  const safeName = escapeAttribute(normalizedName);
  return `<daoyuan-applause class="portrait-applause" character-id="${characterId}" aria-label="为${safeName}点赞" title="为${safeName}点赞"><span aria-hidden="true">👏</span></daoyuan-applause>`;
}
