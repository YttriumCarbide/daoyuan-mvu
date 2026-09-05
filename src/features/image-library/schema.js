import {
  SUPPORTED_ENTITY_TYPES,
  SUPPORTED_IMAGE_SCHEMA_VERSION,
} from "./constants.js";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value, maxLength = 100) {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maxLength && value.trim() === value;
}

function parseImage(image, entityName, index) {
  if (!isRecord(image)) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片不是有效对象`);
  }
  const { url, theme, tags, comment } = image;
  if (typeof url !== "string" || !/^https:\/\/[^\s|]+$/.test(url)) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片 URL 无效`);
  }
  if (!isText(theme)) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片 theme 无效`);
  }
  if (!Array.isArray(tags) || !tags.every((tag) => isText(tag)) ||
      new Set(tags).size !== tags.length) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片 tags 无效`);
  }
  if (comment !== undefined && !isText(comment, 500)) {
    throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片 comment 无效`);
  }
  return { url, theme, tags: tags.slice(), ...(comment === undefined ? {} : { comment }) };
}

export function parseImageLibrary(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!isRecord(data)) throw new Error("图片库不是有效对象");
  if (data.schemaVersion !== SUPPORTED_IMAGE_SCHEMA_VERSION) {
    throw new Error(`不支持的图片库版本：${data.schemaVersion ?? "缺失"}`);
  }
  const rawEntities = data.data?.entities;
  if (!isRecord(data.data) || !isRecord(rawEntities)) {
    throw new Error("图片库缺少 data.entities");
  }
  const entries = Object.entries(rawEntities);
  if (!entries.length) throw new Error("图片库没有实体数据");

  const entities = Object.fromEntries(entries.map(([name, entity]) => {
    if (!isText(name) || !isRecord(entity)) throw new Error("图片库包含无效实体");
    if (!SUPPORTED_ENTITY_TYPES.has(entity.type)) {
      throw new Error(`实体“${name}”的 type 无效：${entity.type ?? "缺失"}`);
    }
    if (!Array.isArray(entity.images)) {
      throw new Error(`实体“${name}”的 images 不是数组`);
    }
    return [name, {
      type: entity.type,
      images: entity.images.map((image, index) => parseImage(image, name, index)),
    }];
  }));
  return { schemaVersion: SUPPORTED_IMAGE_SCHEMA_VERSION, data: { entities } };
}
