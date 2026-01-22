export function condense(first: string, second: string): string {
  if (first === second) {
    return first;
  } else if (
    second.length > first.length && second.slice(0, first.length) === first
  ) {
    return `${first}(${second.slice(first.length)})`;
  } else {
    return `${first}/${second}`;
  }
}
