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
    word: string;
    after: Array<TokenTree>;
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
