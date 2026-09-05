import {
  SUPPORTED_ENTITY_TYPES,
  SUPPORTED_IMAGE_SCHEMA_VERSION,
} from "./constants.js";

function normalizeImage(image, entityName, index) {
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片不是有效对象`);
  }

  const url = String(image.url || "").trim();
  const theme = String(image.theme || "").trim();
  if (!url || !/^(https?:\/\/|data:image\/)/i.test(url)) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片 URL 无效`);
  }
  if (!theme) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片缺少 theme`);
  }

  return {
    ...image,
    url,
    theme,
    tags: Array.isArray(image.tags)
      ? image.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
  };
}

export function parseImageLibrary(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("图片库不是有效对象");
  }
  if (Number(data.schemaVersion) !== SUPPORTED_IMAGE_SCHEMA_VERSION) {
    throw new Error(`不支持的图片库版本：${data.schemaVersion ?? "缺失"}`);
  }

  const rawEntities = data.data?.entities;
  if (!rawEntities || typeof rawEntities !== "object" || Array.isArray(rawEntities)) {
    throw new Error("图片库缺少 data.entities");
  }

  const entities = {};
  for (const [rawName, rawEntity] of Object.entries(rawEntities)) {
    const name = String(rawName).trim();
    if (!name || !rawEntity || typeof rawEntity !== "object") {
      throw new Error("图片库包含无效实体");
    }

    const type = String(rawEntity.type || "").trim();
    if (!SUPPORTED_ENTITY_TYPES.has(type)) {
      throw new Error(`实体“${name}”的 type 无效：${type || "缺失"}`);
    }
    if (!Array.isArray(rawEntity.images)) {
      throw new Error(`实体“${name}”的 images 不是数组`);
    }

    entities[name] = {
      ...rawEntity,
      type,
      images: rawEntity.images.map((image, index) =>
        normalizeImage(image, name, index),
      ),
    };
  }

  if (Object.keys(entities).length === 0) {
    throw new Error("图片库没有实体数据");
  }

  return {
    schemaVersion: SUPPORTED_IMAGE_SCHEMA_VERSION,
    data: { entities },
  };
}
