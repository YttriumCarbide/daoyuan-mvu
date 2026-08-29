let imageLibraryState = {
  schemaVersion: null,
  entities: {},
  loaded: false,
  source: null,
};

const subscribers = new Set();

export function setImageLibrary(data, source) {
  imageLibraryState = {
    schemaVersion: data.schemaVersion,
    entities: data.data.entities,
    loaded: true,
    source,
  };
  subscribers.forEach((subscriber) => subscriber(imageLibraryState));
  return imageLibraryState;
}

export function getImageLibraryState() {
  return imageLibraryState;
}

export function subscribeImageLibrary(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
