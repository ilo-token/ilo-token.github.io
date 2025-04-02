import { distinctBy } from "@std/collections/distinct-by";

export function deduplicateErrors<T extends Error>(
  errors: Iterable<T>,
): ReadonlyArray<T> {
  return distinctBy(errors, ({ message }) => message);
}
