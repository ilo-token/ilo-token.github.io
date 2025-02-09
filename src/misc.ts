import { escape } from "@std/html/entities";

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
// TODO: use @std/random/shuffle when stable
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle<T>(array: Array<T>): void {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
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
  return text.replaceAll(/\r\n|\n|\r/g, "<br/>");
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
// This is different from @std/async/debounce, this ensures the callback is
// awaited before running another callback
export function debounce<T extends Array<unknown>>(
  callback: (...args: T) => Promise<void>,
  delay: number,
): (...args: T) => void {
  let previous = { aborted: true };
  let current = Promise.resolve();
  return (...args) => {
    previous.aborted = true;
    const newPrevious = previous = { aborted: false };
    setTimeout(() => {
      if (!newPrevious.aborted) {
        current = current
          .then(() => callback(...args));
      }
    }, delay);
  };
}
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else {
    return `${error}`;
  }
}
