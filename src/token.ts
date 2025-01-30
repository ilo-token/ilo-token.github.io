/** Module describing token. */

import { fs, join, repeat, repeatWithSpace } from "./misc.ts";

/** Represents token. */
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
/** Describes a token. Useful for error messages. */
export function describe(token: Token): string {
  switch (token.type) {
    case "word":
      return fs`"${token.word}"`;
    case "combined glyphs":
      return fs`combined glyphs "${join(token.words, " ")}"`;
    case "space long glyph":
    case "headed long glyph start":
      return fs`long "${join(token.words, " ")}"`;
    case "headless long glyph start":
      return "long glyph";
    case "headless long glyph end":
    case "headed long glyph end":
    case "inside long glyph":
      return "end of long glyph";
    case "multiple a":
      return fs`"${repeatWithSpace("a", token.count)}"`;
    case "long word":
      return fs`"${repeat(token.word, token.length)}"`;
    case "x ala x":
      return fs`"${token.word} ala ${token.word}"`;
    case "proper word":
      switch (token.kind) {
        case "cartouche":
          return "cartouche";
        case "latin":
          return fs`proper word "${token.words}"`;
      }
      // this is unreachable
      // fallthrough
    case "punctuation":
      return fs`punctuation mark "${token.punctuation}"`;
  }
}
