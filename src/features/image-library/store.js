let mainLibrary = null;
let workshopLibrary = null;
let mainSource = null;
let imageLibraryState = {
  schemaVersion: null,
  entities: {},
  loaded: false,
  source: null,
};

const subscribers = new Set();

function mergeEntities() {
  const entities = new Map(Object.entries(mainLibrary?.data.entities || {}));
  for (const [name, extra] of Object.entries(workshopLibrary?.data.entities || {})) {
    const base = entities.get(name);
    if (!base) {
      entities.set(name, extra);
    } else if (base.type === extra.type) {
      const images = new Map();
      for (const image of [...base.images, ...extra.images]) {
        const key = JSON.stringify([image.url, image.theme]);
        const existing = images.get(key);
        images.set(key, existing
          ? { ...existing, tags: [...new Set([...existing.tags, ...image.tags])] }
          : image);
      }
      entities.set(name, { ...base, images: [...images.values()] });
    }
  }
  return Object.fromEntries(entities);
}

function publishImageLibrary() {
  const library = mainLibrary || workshopLibrary;
  imageLibraryState = {
    schemaVersion: library?.schemaVersion ?? null,
    entities: mergeEntities(),
    loaded: Boolean(library),
    source: mainSource || (workshopLibrary ? "workshop" : null),
  };
  subscribers.forEach((subscriber) => subscriber(imageLibraryState));
  return imageLibraryState;
}

export function setImageLibrary(data, source) {
  mainLibrary = data;
  mainSource = source;
  return publishImageLibrary();
}

export function setWorkshopImageLibrary(data) {
  workshopLibrary = data;
  return publishImageLibrary();
}

export function getImageLibraryState() {
  return imageLibraryState;
}

export function subscribeImageLibrary(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
