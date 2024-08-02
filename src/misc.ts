export function nullableAsArray<T>(
  value?: T | null | undefined,
): Array<NonNullable<T>> {
  if (value == null) {
    return [];
  } else {
    return [value];
  }
}
export function repeat(text: string, count: number): string {
  return new Array(count).fill(text).join("");
}
