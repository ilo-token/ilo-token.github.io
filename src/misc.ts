import { distinctBy } from "@std/collections/distinct-by";
import { escape as escapeHtml } from "@std/html/entities";
import { escape as escapeRegex } from "@std/regexp/escape";
import { Lazy } from "./cache.ts";

export const NEWLINES = /\r\n|\n|\r/g;

export function nullableAsArray<T>(value?: T): ReadonlyArray<NonNullable<T>> {
  if (value == null) {
    return [];
  } else {
    return [value];
  }
}
export function mapNullable<T, U>(
  value: T,
  mapper: (value: NonNullable<T>) => U,
): null | U {
  if (value == null) {
    return null;
  } else {
    return mapper(value);
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
  return newlineAsHtmlLineBreak(escapeHtml(text));
}
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
export function assertOk(response: Response): Response {
  if (!response.ok) {
    const { url, status, statusText } = response;
    throw new Error(
      `unable to fetch ${url} (${status} ${statusText})`,
    );
  } else {
    return response;
  }
}
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else {
    return `${error}`;
  }
}
export function filterSet<T>(
  set: Iterable<readonly [condition: boolean, value: T]>,
): ReadonlyArray<T> {
  return [...set].filter(([condition]) => condition).map(([_, value]) => value);
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
  errors: Iterable<T>,
): ReadonlyArray<T> {
  return distinctBy(errors, ({ message }) => message);
}
export function characterClass(characters: Iterable<string>): RegExp {
  return new RegExp(`[${escapeRegex([...characters].join(""))}]`, "u");
}
export function uniquePairs<T>(
  array: ReadonlyArray<T>,
): ReadonlyArray<readonly [T, T]> {
  return array.flatMap((a, i) => array.slice(i + 1).map((b) => [a, b]));
}
export function throwError(error: unknown): never {
  throw error;
}
