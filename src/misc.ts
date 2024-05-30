export function nullableAsArray<T>(value?: T | null | undefined): Array<T> {
  if (value == null) {
    return [];
  } else {
    return [value];
  }
}
