import { distinctBy } from "@std/collections/distinct-by";
import { escape } from "@std/html/entities";
import { Lazy } from "./cache.ts";

export const NEWLINES = /\r\n|\n|\r/g;

export function nullableAsArray<T>(value?: T): ReadonlyArray<NonNullable<T>> {
  if (value == null) {
    return [];
  } else {
    return [value];
  }
}
export function repeatArray<T>(element: T, count: number): ReadonlyArray<T> {
  return new Array(count).fill(element);
}
export function repeatWithSpace(text: string, count: number): string {
  return repeatArray(text, count).join(" ");
}
export const checkLocalStorage = lazy(() => {
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
export function newlineAsHtmlLineBreak(text: string): string {
  return text.replaceAll(NEWLINES, "<br/>");
}
export function escapeHtmlWithLineBreak(text: string): string {
  return newlineAsHtmlLineBreak(escape(text));
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
export function assertOk(response: Response): Response {
  if (!response.ok) {
    const { url, status, statusText } = response;
    throw new Error(
      `unable to fetch ${url} (${status} ${statusText})`,
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
  set: ReadonlyArray<readonly [condition: boolean, value: T]>,
): ReadonlyArray<T> {
  return set.filter(([condition]) => condition).map(([_, value]) => value);
}
export function flattenError(error: unknown): ReadonlyArray<unknown> {
  if (error instanceof AggregateError) {
    return error.errors.flatMap(flattenError);
  } else {
    return [error];
  }
}
export function lazy<T>(fn: () => T): () => T {
  const cache = new Lazy(fn);
  return () => cache.getValue();
}
export function deduplicateErrors<T extends Error>(
  errors: ReadonlyArray<T>,
): ReadonlyArray<T> {
  return distinctBy(errors, ({ message }) => message);
}
