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
