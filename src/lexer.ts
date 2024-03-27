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
  optionalAll,
  Parser,
  sequence as rawSequence,
} from "./parser-lib.ts";
import { TokenTree } from "./token-tree.ts";
import { CoveredError } from "./error.ts";
import { settings } from "./settings.ts";
import {
  END_OF_CARTOUCHE,
  SCALING_JOINER,
  STACKING_JOINER,
  START_OF_CARTOUCHE,
  UCSUR_TO_LATIN,
} from "./ucsur.ts";
import { nothing } from "./parser-lib.ts";

export type Lexer<T> = Parser<string, T>;

const VOWEL = /[aeiou]/;
const MORAE = /[aeiou]|[jklmnpstw][aeiou]|n/g;

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
    if (match != null) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    } else if (src === "") {
      return new Output(new UnexpectedError("end of sentence", description));
    } else {
      const token = src.match(/[^\s]*/)?.[0];
      if (token != null) {
        return new Output(new UnexpectedError(`"${token}"`, description));
      } else {
        throw new UnreachableError();
      }
    }
  });
}
function spaces(): Lexer<string> {
  return match(/\s*/, "space").map(([space]) => space);
}
function slice(length: number, description: string): Lexer<string> {
  return new Parser((src) => {
    if (src.length < length) {
      return new Output(new UnexpectedError(src, description));
    } else {
      return new Output([{
        rest: src.slice(length),
        value: src.slice(0, length),
      }]);
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
/** Parses lowercase latin word. */
function latinWord(): Lexer<string> {
  return match(/([a-z][a-zA-Z]*)\s*/, "word").map(([_, word]) => {
    if (/[A-Z]/.test(word)) {
      throw new UnrecognizedError(`"${word}"`);
    } else {
      return word;
    }
  });
}
function variationSelector(): Lexer<string> {
  return match(/[\uFE00-\uFE0F]/, "variation selector").map(([character]) =>
    character
  );
}
function ucsur(
  settings: { allowVariation: boolean; allowSpace: boolean },
): Lexer<string> {
  return slice(2, "UCSUR character").skip(
    lazy(() => {
      if (settings.allowVariation) {
        return optionalAll(variationSelector()).map(() => null);
      } else {
        return nothing();
      }
    }),
  ).skip(lazy(() => {
    if (settings.allowSpace) {
      return spaces().map(() => null);
    } else {
      return nothing();
    }
  }));
}
function specificUcsurCharacter(
  character: string,
  description: string,
  settings: { allowVariation: boolean; allowSpace: boolean },
): Lexer<string> {
  return ucsur(settings).filter((word) => {
    if (word === character) {
      return true;
    } else {
      throw new UnexpectedError(`"${word}"`, description);
    }
  });
}
/** Parses UCSUR word. */
function ucsurWord(
  settings: { allowVariation: boolean; allowSpace: boolean },
): Lexer<string> {
  return ucsur(settings).map((word) => {
    const latin = UCSUR_TO_LATIN[word];
    if (latin == null) {
      throw new CoveredError();
    } else {
      return latin;
    }
  });
}
/** Parses UCSUR word. */
function singleUcsurWord(): Lexer<string> {
  return ucsurWord({ allowVariation: true, allowSpace: true });
}
function joiner(): Lexer<string> {
  return choiceOnlyOne(
    match(/\u200D/, "zero width joiner").map(([_, joiner]) => joiner),
    specificUcsurCharacter(STACKING_JOINER, "stacking joiner", {
      allowVariation: false,
      allowSpace: false,
    }),
    specificUcsurCharacter(SCALING_JOINER, "scaling joiner", {
      allowVariation: false,
      allowSpace: false,
    }),
  );
}
function combinedWords(): Lexer<TokenTree & { type: "combined words" }> {
  return sequence(
    ucsurWord({ allowVariation: false, allowSpace: false }),
    joiner(),
    ucsurWord({ allowVariation: false, allowSpace: true }),
  ).map(([first, _, second]) => ({
    type: "combined words",
    first,
    second,
  }));
}
/** Parses a word. */
function word(): Lexer<string> {
  return choiceOnlyOne(singleUcsurWord(), latinWord());
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
/** Parses a comma. */
function comma(): Lexer<string> {
  return match(/,\s*/, "comma").map(() => ",");
}
/** Parses a punctuation. */
function punctuation(): Lexer<string> {
  return choiceOnlyOne(
    match(/([.,:;?!])\s*/, "punctuation").map(([_, punctuation]) =>
      punctuation
    ),
    specificUcsurCharacter("󱦜", "middle dot", {
      allowVariation: true,
      allowSpace: true,
    }).map(() => "."),
    specificUcsurCharacter("󱦝", "middle dot", {
      allowVariation: true,
      allowSpace: true,
    }).map(() => ":"),
  );
}
function cartoucheElement(): Lexer<string> {
  return choiceOnlyOne(
    singleUcsurWord().skip(
      choiceOnlyOne(
        match(/(\uff1a)\s*/, "full width colon").map(([_, dot]) => dot),
        specificUcsurCharacter("󱦝", "colon", {
          allowVariation: true,
          allowSpace: true,
        }),
      ),
    ),
    sequence(
      singleUcsurWord(),
      allAtLeastOnce(
        choiceOnlyOne(
          match(/([・。／])\s*/, "full width dot").map(([_, dot]) => dot),
          specificUcsurCharacter("󱦜", "middle dot", {
            allowVariation: true,
            allowSpace: true,
          }),
        ),
      ).map(
        (dots) => dots.length,
      ),
    ).map(([word, dots]) => {
      let count = dots;
      if (VOWEL.test(word[0])) {
        count++;
      }
      const morae = word.match(MORAE)!;
      if (morae.length < count) {
        throw new UnrecognizedError("Excess dots");
      }
      return morae.slice(0, count).join("");
    }),
    singleUcsurWord().map((word) => word[0]),
    match(/([a-zA-Z])\s*/, "Latin letter").map((
      [_, letter],
    ) => letter),
  );
}
function cartouche(): Lexer<string> {
  return sequence(
    specificUcsurCharacter(START_OF_CARTOUCHE, "start of cartouche", {
      allowVariation: false,
      allowSpace: false,
    }),
    allAtLeastOnce(cartoucheElement()),
    specificUcsurCharacter(END_OF_CARTOUCHE, "end of cartouche", {
      allowVariation: false,
      allowSpace: false,
    }),
  ).map(
    ([_, words, _1]) => {
      const word = words.join("");
      return word[0].toUpperCase() + word.slice(1);
    },
  );
}
function cartouches(): Lexer<string> {
  return allAtLeastOnce(cartouche()).map((words) => words.join(" "));
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
    choiceOnlyOne(cartouches(), properWords()).map((words) =>
      ({ type: "proper word", words }) as TokenTree
    ),
    combinedWords(),
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
  return spaces().with(all(tokenTree(true))).skip(eol()).parser(src)
    .map((
      { value },
    ) => value);
}
