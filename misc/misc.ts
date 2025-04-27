// ensure this module don't have imports and as runtime agnostic as possible,
// make separate module when necessary

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
export function throwError(error: unknown): never {
  throw error;
}
export function compound(
  elements: ReadonlyArray<string>,
  conjunction: string,
  repeat: boolean,
): string {
  if (repeat || elements.length <= 2) {
    return elements.join(` ${conjunction} `);
  } else {
    const lastIndex = elements.length - 1;
    const init = elements.slice(0, lastIndex);
    const last = elements[lastIndex];
    const initText = init.map((item) => `${item},`).join(" ");
    return `${initText} ${conjunction} ${last}`;
  }
}
export function lazy<T>(fn: () => T): () => T {
  let defined = false;
  let value: null | T;
  return () => {
    if (!defined) {
      defined = true;
      value = fn();
    }
    return value!;
  };
}
