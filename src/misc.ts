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
export function repeatWithSpace(text: string, count: number): string {
  return new Array(count).fill(text).join(" ");
}
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
export function fs(
  strings: TemplateStringsArray,
  ...values: Array<string>
): string {
  return strings.map((string, i) => `${string}${values[i] ?? ""}`).join("");
}
