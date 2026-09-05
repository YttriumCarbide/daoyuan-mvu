import { parseImageLibrary } from "./schema.js";

// Workshop is optional: neither discovery nor a pending host read may hold up the UI.
export async function readWorkshopImageLibrary() {
  let timer;
  try {
    const host = window.parent;
    const read = async () => {
      if (typeof window.waitGlobalInitialized === "function") {
        await window.waitGlobalInitialized("DaoyuanWorkshopAPI");
      }
      const api = host?.DaoyuanWorkshopAPI;
      if (typeof api?.getImages !== "function") return null;
      return parseImageLibrary(await api.getImages());
    };
    return await Promise.race([
      read(),
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), 2000); }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
