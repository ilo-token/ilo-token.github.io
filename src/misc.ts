// ensure this module don't have imports and as runtime agnostic as possible,
// make separate module when necessary

export type ErrorOption = Readonly<{ cause?: Error }>;

export function nullableAsArray<T>(
  value?: T,
): ReadonlyArray<NonNullable<T>> {
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
export function repeatArray<T>(
  value: T,
  count: number,
): ReadonlyArray<T> {
  return new Array(count).fill(value);
}
export function repeatWithSpace(text: string, count: number): string {
  return repeatArray(text, count).join(" ");
}
export function throwError(error: Error): never {
  throw error;
}
export function lazy<T>(fn: () => T): () => T {
  let defined = false;
  let value: T;
  return () => {
    if (!defined) {
      defined = true;
      value = fn();
    }
    return value!;
  };
}
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
      assertQuotaExceededError(error);
    }
  }
}

export function assertQuotaExceededError(error: unknown): void {
  if (
    !(error instanceof DOMException) || error.name !== "QuotaExceededError"
  ) {
    throw error;
  }
}
