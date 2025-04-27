import { distinctBy } from "@std/collections/distinct-by";

export function deduplicateErrors<const T extends Error>(
  errors: Iterable<T>,
): ReadonlyArray<T> {
  return distinctBy(errors, ({ message }) => message);
}
