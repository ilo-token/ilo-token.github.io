import { repeatWithSpace } from "../misc.ts";

export type Token =
  | { type: "word"; word: string }
  | {
    type: "combined glyphs";
    words: Array<string>;
  }
  | {
    type: "space long glyph";
    words: Array<string>;
    spaceLength: number;
  }
  | {
    type: "headed long glyph start";
    words: Array<string>;
  }
  | {
    type: "headless long glyph end";
  }
  | {
    type: "headless long glyph start";
  }
  | {
    type: "headed long glyph end";
    words: Array<string>;
  }
  | {
    type: "inside long glyph";
    words: Array<string>;
  }
  | { type: "multiple a"; count: number }
  | { type: "long word"; word: string; length: number }
  | { type: "x ala x"; word: string }
  | { type: "proper word"; words: string; kind: "cartouche" | "latin" }
  | { type: "punctuation"; punctuation: string };
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
