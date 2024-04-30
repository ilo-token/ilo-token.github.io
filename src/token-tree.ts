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
    type: "long glyph";
    before: Array<TokenTree>;
    words: Array<string>;
    after: Array<TokenTree>;
  }
  | {
    type: "long glyph space";
    words: Array<string>;
    spaceLength: number;
  }
  | {
    type: "underline lon";
    words: Array<TokenTree>;
  }
  | { type: "multiple a"; count: number }
  | { type: "long word"; word: string; length: number }
  | { type: "x ala x"; word: string }
  | { type: "proper word"; words: string }
  | {
    type: "quotation";
    tokenTree: Array<TokenTree>;
    leftMark: string;
    rightMark: string;
  }
  | { type: "comma" }
  | { type: "punctuation"; punctuation: string };

export function describe(tokenTree: TokenTree): string {
  switch (tokenTree.type) {
    case "word":
      return `"${tokenTree.word}"`;
    case "combined glyphs":
      return `combined glyphs "${tokenTree.words.join(" ")}"`;
    case "long glyph":
    case "long glyph space":
    case "underline lon":
      return "long glyph";
    case "multiple a":
      return new Array(tokenTree.count).fill("a").join(" ");
    case "long word":
    case "x ala x":
      return `"${tokenTree.word} ala ${tokenTree.word}"`;
    case "proper word":
      return "proper word or cartouche";
    case "quotation":
      return "quotation";
    case "comma":
      return "comma";
    case "punctuation":
      return "punctuation mark";
  }
}
