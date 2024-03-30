/**
 * Module for lexer. It is responsible for turning string into array of token
 * tress. It also latinizes UCSUR characters.
 *
 * Note: the words lexer and parser are used interchangeably since they both
 * have the same capabilities.
 */

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

/** Takes all parser and applies them one after another. */
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
/** parses space. */
function spaces(): Lexer<string> {
  return match(/\s*/, "space").map(([space]) => space);
}
/** parses a string of consistent length. */
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
/** Parses variation selector. */
function variationSelector(): Lexer<string> {
  return match(/[\uFE00-\uFE0F]/, "variation selector").map(([character]) =>
    character
  );
}
/** Parses an UCSUR character with optional variation selector and space. */
function ucsur(
  settings: { allowVariation: boolean; allowSpace: boolean },
): Lexer<string> {
  let variationParser: Lexer<null>;
  if (settings.allowVariation) {
    variationParser = optionalAll(variationSelector()).map(() => null);
  } else {
    variationParser = nothing();
  }
  let spaceParser: Lexer<null>;
  if (settings.allowSpace) {
    spaceParser = spaces().map(() => null);
  } else {
    spaceParser = nothing();
  }
  return slice(2, "UCSUR character").skip(variationParser).skip(spaceParser);
}
/** Parses a specific UCSUR character. */
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
/** Parses a single UCSUR word. */
function singleUcsurWord(): Lexer<string> {
  return ucsurWord({ allowVariation: true, allowSpace: true });
}
/** Parses a joiner. */
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
/** Parses combined glyphs. */
function combinedGlyphs(): Lexer<TokenTree & { type: "combined glyphs" }> {
  return sequence(
    ucsurWord({ allowVariation: false, allowSpace: false }),
    allAtLeastOnce(
      joiner().with(ucsurWord({ allowVariation: false, allowSpace: true })),
    ),
  ).map(([first, rest]) => ({
    type: "combined glyphs",
    words: [first, ...rest],
  }));
}
/** Parses a word, either UCSUR or latin. */
function word(): Lexer<string> {
  return choiceOnlyOne(singleUcsurWord(), latinWord());
}
/** Parses proper words spanning multiple words. */
function properWords(): Lexer<string> {
  return allAtLeastOnce(
    match(/([A-Z][a-zA-Z]*)\s*/, "proper word").map(([_, word]) => word),
  ).map(
    (array) => array.join(" "),
  );
}
/** Parses a specific word, either UCSUR or latin. */
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
    // NOTE: maybe these are unnecessary
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
/** Parses cartouche element and returns the phonemes or letters it represents. */
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
/** Parses a single cartouche. */
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
/** Parses multiple cartouches. */
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
  let quotationParser: Lexer<TokenTree>;
  if (includeQuotation) {
    quotationParser = quotation();
  } else {
    quotationParser = error(new CoveredError());
  }
  let xAlaXParser: Lexer<TokenTree>;
  if (settings.xAlaXPartialParsing) {
    xAlaXParser = error(new CoveredError());
  } else {
    xAlaXParser = xAlaX().map((word) =>
      ({ type: "x ala x", word }) as TokenTree
    );
  }
  return choiceOnlyOne(
    punctuation().map((punctuation) =>
      ({ type: "punctuation", punctuation }) as TokenTree
    ),
    comma().map(() => ({ type: "comma" }) as TokenTree),
    quotationParser,
    choiceOnlyOne(cartouches(), properWords()).map((words) =>
      ({ type: "proper word", words }) as TokenTree
    ),
    combinedGlyphs(),
    multipleA().map((count) => ({ type: "multiple a", count }) as TokenTree),
    xAlaXParser,
    word().map((word) => ({ type: "word", word })),
  );
}
/** Parses multiple token trees. */
function tokenTrees(includeQuotation: boolean): Lexer<Array<TokenTree>> {
  return all(tokenTree(includeQuotation));
}
const FULL_PARSER = spaces().with(all(tokenTree(true))).skip(eol());
/** Parses multiple token trees. */
export function lex(src: string): Output<Array<TokenTree>> {
  if (/\n/.test(src.trim())) {
    return new Output(new UnrecognizedError("multiline text"));
  }
  return FULL_PARSER.parser(src)
    .map((
      { value },
    ) => value);
}
