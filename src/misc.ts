import { escape } from "@std/html/entities";

export const NEWLINE = /\r\n|\n|\r/g;

export function nullableAsArray<T>(value?: T): Array<NonNullable<T>> {
  if (value == null) {
    return [];
  } else {
    return [value];
  }
}
export function repeatWithSpace(text: string, count: number): string {
  return new Array(count).fill(text).join(" ");
}
let localStorageAvailable: undefined | boolean;
export function checkLocalStorage(): boolean {
  if (localStorageAvailable == null) {
    if (typeof localStorage === "undefined") {
      localStorageAvailable = false;
    } else {
      // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
      try {
        const x = "__storage_test__";
        localStorage.setItem(x, x);
        localStorage.removeItem(x);
        localStorageAvailable = true;
      } catch (e) {
        localStorageAvailable = e instanceof DOMException &&
          e.name === "QuotaExceededError" &&
          // acknowledge QuotaExceededError only if there's something already stored
          localStorage &&
          localStorage.length !== 0;
      }
    }
  }
  return localStorageAvailable;
}
export function newlineAsHtml(text: string): string {
  return text.replaceAll(NEWLINE, "<br/>");
}
export function escapeHtmlWithNewline(text: string): string {
  return newlineAsHtml(escape(text));
}
export function setIgnoreError(key: string, value: string): void {
  if (!checkLocalStorage()) {
    return;
  }
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
export async function fetchOk(url: string | URL): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `unable to fetch ${url} (${response.status} ${response.statusText})`,
    );
  }
  return response;
}
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else {
    return `${error}`;
  }
}
export function filterSet<T>(
  set: Array<[condition: boolean, value: T]>,
): Array<T> {
  return set.filter(([condition]) => condition).map(([_, value]) => value);
}
