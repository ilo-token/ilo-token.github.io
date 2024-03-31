/**
 * Module describing token tree. It is like token but some token tree type also
 * stores array of token trees hence the name token tree.
 */

import { UnreachableError } from "./error.ts";

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
  if (tokenTree.type === "word") {
    return `"${tokenTree.word}"`;
  } else if (tokenTree.type === "combined glyphs") {
    return `combined glyphs "${tokenTree.words.join(" ")}"`;
  } else if (
    tokenTree.type === "long glyph" ||
    tokenTree.type === "long glyph space"
  ) {
    return "long glyph";
  } else if (tokenTree.type === "multiple a") {
    return new Array(tokenTree.count).fill("a").join(" ");
  } else if (tokenTree.type === "x ala x") {
    return `"${tokenTree.word} ala ${tokenTree.word}"`;
  } else if (tokenTree.type === "proper word") {
    return "proper word or cartouche";
  } else if (tokenTree.type === "quotation") {
    return "quotation";
  } else if (tokenTree.type === "comma") {
    return "comma";
  } else if (tokenTree.type === "punctuation") {
    return "punctuation mark";
  } else {
    throw new UnreachableError();
  }
}
