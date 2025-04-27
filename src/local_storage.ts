import { lazy } from "../misc/misc.ts";

export const checkLocalStorage = lazy((): boolean => {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
  try {
    const x = "__storage_test__";
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  } catch (e) {
    return e instanceof DOMException &&
      e.name === "QuotaExceededError" &&
      // acknowledge QuotaExceededError only if there's something already stored
      localStorage &&
      localStorage.length !== 0;
  }
});
export function setIgnoreError(key: string, value: string): void {
  if (checkLocalStorage()) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (
        !(error instanceof DOMException) || error.name !== "QuotaExceededError"
      ) {
        throw error;
      }
    }
  }
}
