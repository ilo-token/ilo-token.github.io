/**
 * Module describing token tree. It is like token but some token tree type also
 * stores array of token trees hence the name token tree.
 */

/**
 * Represents token tree.
 */
export type TokenTree =
  | { type: "word"; word: string }
  | {
    type: "combined glyphs";
    words: Array<string>;
  }
  | {
    type: "long glyph space";
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
/** Describes a token tree. Useful for error messages. */
export function describe(tokenTree: TokenTree): string {
  switch (tokenTree.type) {
    case "word":
      return `"${tokenTree.word}"`;
    case "combined glyphs":
      return `combined glyphs "${tokenTree.words.join(" ")}"`;
    case "long glyph space":
    case "headed long glyph start":
    case "headless long glyph start":
      return "long glyph";
    case "headless long glyph end":
    case "headed long glyph end":
    case "inside long glyph":
      return "end of long glyph";
    case "multiple a":
      return `"${new Array(tokenTree.count).fill("a").join(" ")}"`;
    case "long word":
      return `"${new Array(tokenTree.length).fill(tokenTree.word).join("")}"`;
    case "x ala x":
      return `"${tokenTree.word} ala ${tokenTree.word}"`;
    case "proper word":
      switch (tokenTree.kind) {
        case "cartouche":
          return "cartouche";
        case "latin":
          return "proper word";
      }
      // this is unreachable
      // fallthrough
    case "punctuation":
      return "punctuation mark";
  }
}
