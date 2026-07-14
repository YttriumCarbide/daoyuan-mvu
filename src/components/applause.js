import registry from "../../data/applause-character-registry.json";
import { escapeHtmlAttribute } from "../utils/html.js";

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

export function renderDaoyuanApplause(characterName) {
  const normalizedName = String(characterName).trim();
  const characterId = characterIdByName.get(normalizedName);
  if (!characterId) return "";

  const safeName = escapeHtmlAttribute(normalizedName);
  return `<daoyuan-applause class="portrait-applause" character-id="${characterId}" aria-label="为${safeName}点赞" title="为${safeName}点赞"><span aria-hidden="true">👏</span></daoyuan-applause>`;
}
