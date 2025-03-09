import { repeatWithSpace } from "../misc.ts";

export type Token =
  | Readonly<{ type: "word"; word: string }>
  | Readonly<{
    type: "combined glyphs";
    words: ReadonlyArray<string>;
  }>
  | Readonly<{
    type: "space long glyph";
    words: ReadonlyArray<string>;
    spaceLength: number;
  }>
  | Readonly<{
    type: "headed long glyph start";
    words: ReadonlyArray<string>;
  }>
  | Readonly<{
    type: "headless long glyph end";
  }>
  | Readonly<{
    type: "headless long glyph start";
  }>
  | Readonly<{
    type: "headed long glyph end";
    words: ReadonlyArray<string>;
  }>
  | Readonly<{
    type: "inside long glyph";
    words: ReadonlyArray<string>;
  }>
  | Readonly<{ type: "multiple a"; count: number }>
  | Readonly<{ type: "long word"; word: string; length: number }>
  | Readonly<{ type: "x ala x"; word: string }>
  | Readonly<{
    type: "proper word";
    words: string;
    kind: "cartouche" | "latin";
  }>
  | Readonly<{ type: "punctuation"; punctuation: string }>;
export function describe(token: Token): string {
  switch (token.type) {
    case "word":
      return `"${token.word}"`;
    case "combined glyphs":
      return `combined glyphs "${token.words.join(" ")}"`;
    case "space long glyph":
    case "headed long glyph start":
      return `long "${token.words.join(" ")}"`;
    case "headless long glyph start":
      return "long glyph";
    case "headless long glyph end":
    case "headed long glyph end":
    case "inside long glyph":
      return "end of long glyph";
    case "multiple a":
      return `"${repeatWithSpace("a", token.count)}"`;
    case "long word":
      return `"${token.word.repeat(token.length)}"`;
    case "x ala x":
      return `"${token.word} ala ${token.word}"`;
    case "punctuation":
      return `punctuation mark "${token.punctuation}"`;
    case "proper word":
      switch (token.kind) {
        case "cartouche":
          return "cartouche";
        case "latin":
          return `proper word "${token.words}"`;
      }
  }
}
