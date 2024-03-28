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
    type: "combined words";
    first: string;
    second: string;
  }
  | {
    type: "long container";
    before: Array<TokenTree>;
    word: longContainerHead;
    after: Array<TokenTree>;
  }
  | {
    type: "long space container";
    word: longContainerHead;
    spaceLength: number;
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
/**
 * Represents the word used as long container.
 */
export type longContainerHead =
  | {
    type: "word";
    word: string;
  }
  | {
    type: "combined words";
    first: string;
    second: string;
  };
export function describe(tokenTree: TokenTree): string {
  if (tokenTree.type === "word") {
    return `"${tokenTree.word}"`;
  } else if (tokenTree.type === "combined words") {
    return `"${tokenTree.first} ${tokenTree.second}"`;
  } else if (
    tokenTree.type === "long container" ||
    tokenTree.type === "long space container"
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
