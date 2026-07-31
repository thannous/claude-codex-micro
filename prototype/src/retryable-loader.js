export function createRetryableLoader(load) {
  let cachedPromise;

  return function loadWithRetry() {
    if (!cachedPromise) {
      cachedPromise = Promise.resolve()
        .then(load)
        .catch((error) => {
          cachedPromise = undefined;
          throw error;
        });
    }
    return cachedPromise;
  };
}
