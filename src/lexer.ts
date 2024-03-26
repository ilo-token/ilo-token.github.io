import { Output } from "./output.ts";
import {
  UnexpectedError,
  UnreachableError,
  UnrecognizedError,
} from "./error.ts";
import {
  all,
  allAtLeastOnce,
  choiceOnlyOne,
  error,
  lazy,
  Parser,
  sequence as rawSequence,
} from "./parser-lib.ts";
import { TokenTree } from "./token-tree.ts";
import { CoveredError } from "./error.ts";
import { settings } from "./settings.ts";

export type Lexer<T> = Parser<string, T>;

/** Takes all parsers and applies them one after another. */
// Had to redeclare this function, Typescript really struggles with inferring
// types when using `sequence`.
function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: Lexer<T[I]> } & { length: T["length"] }
): Lexer<T> {
  // deno-lint-ignore no-explicit-any
  return rawSequence<string, T>(...sequence as any);
}
/**
 * Uses Regular Expression to create parser. The parser outputs
 * RegExpMatchArray, which is what `string.match( ... )` returns.
 */
function match(
  regex: RegExp,
  description: string,
): Lexer<RegExpMatchArray> {
  const newRegex = new RegExp("^" + regex.source, regex.flags);
  return new Parser((src) => {
    const match = src.match(newRegex);
    if (match !== null) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    } else if (src === "") {
      return new Output(new UnexpectedError("end of sentence", description));
    } else {
      const token = src.match(/[^\s]*/)?.[0];
      if (token !== undefined) {
        return new Output(new UnexpectedError(`"${token}"`, description));
      } else {
        throw new UnreachableError();
      }
    }
  });
}
/** Parses the end of line (or the end of sentence in context of Toki Pona) */
function eol(): Lexer<null> {
  return new Parser((src) => {
    if (src === "") return new Output([{ value: null, rest: "" }]);
    else return new Output(new UnexpectedError(`"${src}"`, "end of sentence"));
  });
}
/** Parses lowercase word. */
function word(): Lexer<string> {
  return match(/([a-z][a-zA-Z]*)\s*/, "word").map(([_, word]) => {
    if (/[A-Z]/.test(word)) {
      throw new UnrecognizedError(`"${word}"`);
    } else {
      return word;
    }
  });
}
/**
 * Parses all at least one uppercase words and combines them all into single
 * string. This function is exhaustive like `all`.
 */
function properWords(): Lexer<string> {
  return allAtLeastOnce(
    match(/([A-Z][a-zA-Z]*)\s*/, "proper word").map(([_, word]) => word),
  ).map(
    (array) => array.join(" "),
  );
}
/** Parses a specific word. */
function specificWord(thatWord: string): Lexer<string> {
  return word().filter((thisWord) => {
    if (thatWord === thisWord) return true;
    else throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
  });
}
/** Parses multiple a. */
function multipleA(): Lexer<number> {
  return sequence(specificWord("a"), allAtLeastOnce(specificWord("a"))).map((
    [a, as],
  ) => [a, ...as].length);
}
/** Parses X ala X constructions. */
function xAlaX(): Lexer<string> {
  return word().then((word) =>
    sequence(specificWord("ala"), specificWord(word)).map(() => word)
  );
}
/** Parses opening quotation mark */
function openQuotationMark(): Lexer<string> {
  return match(/(["“«「])\s*/, "open quotation mark").map(([_, mark]) => mark);
}
/** Parses closing quotation mark */
function closeQuotationMark(): Lexer<string> {
  return match(/(["”»」])\s*/, "close quotation mark").map(([_, mark]) => mark);
}
/** Parses quotation. */
function quotation(): Lexer<TokenTree & { type: "quotation" }> {
  return sequence(
    openQuotationMark(),
    lazy(() => tokenTrees(false)),
    closeQuotationMark(),
  ).map(([leftMark, tokenTree, rightMark]) => {
    if (leftMark === '"' || leftMark === "“") {
      if (rightMark !== '"' && rightMark !== "”") {
        throw new UnrecognizedError("Mismatched quotation marks");
      }
    } else if (leftMark === "«") {
      if (rightMark !== "»") {
        throw new UnrecognizedError("Mismatched quotation marks");
      }
    } else if (leftMark === "「") {
      if (rightMark !== "」") {
        throw new UnrecognizedError("Mismatched quotation marks");
      }
    } else throw new UnreachableError();
    return {
      type: "quotation",
      tokenTree,
      leftMark,
      rightMark,
    };
  });
}
/** Parses a comma. */
function comma(): Lexer<string> {
  return match(/,\s*/, "comma").map(() => ",");
}
/** Parses a punctuation. */
function punctuation(): Lexer<string> {
  return match(/([.,:;?!])\s*/, "punctuation").map(([_, punctuation]) =>
    punctuation
  );
}
/** Parses a token tree. */
function tokenTree(includeQuotation: boolean): Lexer<TokenTree> {
  return choiceOnlyOne(
    punctuation().map((punctuation) =>
      ({ type: "punctuation", punctuation }) as TokenTree
    ),
    comma().map(() => ({ type: "comma" }) as TokenTree),
    lazy(() => {
      if (includeQuotation) {
        return quotation();
      } else {
        return error(new CoveredError());
      }
    }),
    properWords().map((words) => ({ type: "proper word", words }) as TokenTree),
    multipleA().map((count) => ({ type: "multiple a", count }) as TokenTree),
    lazy(() => {
      if (!settings.xAlaXPartialParsing) {
        return xAlaX().map((word) => ({ type: "x ala x", word }) as TokenTree);
      } else {
        return error(new CoveredError());
      }
    }),
    word().map((word) => ({ type: "word", word })),
  );
}
function tokenTrees(includeQuotation: boolean): Lexer<Array<TokenTree>> {
  return all(tokenTree(includeQuotation));
}
export function lex(src: string): Output<Array<TokenTree>> {
  return match(/\s*/, "spaces").with(tokenTrees(true)).skip(eol()).parser(src)
    .map((
      { value },
    ) => value);
}
