import { IMAGES_URL } from "./constants.js";

export async function fetchImageLibrary() {
  const separator = IMAGES_URL.includes("?") ? "&" : "?";
  const response = await fetch(`${IMAGES_URL}${separator}t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`图片库请求异常：${response.status}`);
  }
  return response.json();
}
