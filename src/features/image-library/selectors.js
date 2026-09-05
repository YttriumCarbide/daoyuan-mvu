import { getImageLibraryState } from "./store.js";

export function getImageEntity(name) {
  return getImageLibraryState().entities[String(name || "").trim()] || null;
}

export function getEntityType(name) {
  return getImageEntity(name)?.type || null;
}

export function getCharacterEntity(name) {
  const entity = getImageEntity(name);
  return entity?.type === "character" ? entity : null;
}

export function getSectEntity(name) {
  const entity = getImageEntity(name);
  return entity?.type === "sect" ? entity : null;
}

export function getImagesByTheme(name, theme) {
  const entity = getImageEntity(name);
  if (!entity) return [];
  return entity.images.filter((image) => image.theme === theme);
}

export function groupCharacterImagesByTheme(name) {
  const entity = getCharacterEntity(name);
  if (!entity) return new Map();

  const groups = new Map();
  entity.images.forEach((image) => {
    if (!groups.has(image.theme)) groups.set(image.theme, []);
    groups.get(image.theme).push(image);
  });
  return groups;
}

export function getSectMapImages(name) {
  const entity = getSectEntity(name);
  return entity ? entity.images.filter((image) => image.theme === "map") : [];
}

export function getAllCharacterNames() {
  return Object.entries(getImageLibraryState().entities)
    .filter(([, entity]) => entity.type === "character")
    .map(([name]) => name);
}
