export function asComment(text: string): string {
  return text
    .replaceAll(/^/mg, "# ")
    .replaceAll(/^#\s*$/mg, "#");
}
