/**
 * Module for lexer. It is responsible for turning string into array of token
 * trees. It also latinizes UCSUR characters.
 *
 * Note: the words lexer and parser are used interchangeably since they both
 * have the same capabilities.
 */

import { Output } from "./output.ts";
import { UnexpectedError, UnrecognizedError } from "./error.ts";
import {
  all,
  allAtLeastOnce,
  choiceOnlyOne,
  count,
  empty,
  optionalAll,
  Parser,
  sequence as rawSequence,
} from "./parser-lib.ts";
import { TokenTree } from "./token-tree.ts";
import { settings } from "./settings.ts";
import {
  END_OF_CARTOUCHE,
  END_OF_LONG_GLYPH,
  END_OF_REVERSE_LONG_GLYPH,
  SCALING_JOINER,
  STACKING_JOINER,
  START_OF_CARTOUCHE,
  START_OF_LONG_GLYPH,
  START_OF_REVERSE_LONG_GLYPH,
  UCSUR_TO_LATIN,
} from "./ucsur.ts";

type Lexer<T> = Parser<string, T>;

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
  const newRegex = new RegExp(`^${regex.source}`, regex.flags);
  return new Parser((src) => {
    const match = src.match(newRegex);
    if (match != null) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    } else if (src === "") {
      return new Output(new UnexpectedError("end of sentence", description));
    } else {
      const token = src.match(/[^\s]*/)![0];
      let tokenDescription: string;
      if (token === "") {
        tokenDescription = "space";
      } else {
        tokenDescription = `"${token}"`;
      }
      return new Output(new UnexpectedError(tokenDescription, description));
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
/** Parses a string that exactly matches the given string. */
function matchString(match: string): Lexer<string> {
  return slice(match.length, `"${match}"`).map((slice) => {
    if (slice === match) {
      return match;
    } else {
      throw new UnexpectedError(`"${slice}"`, `"${match}"`);
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
  return match(/[\uFE00-\uFE0F]/, "variation selector")
    .map(([character]) => character);
}
/**
 * Parses an UCSUR character, this doesn't parse space and so must be manually
 * added if needed.
 */
function ucsur(): Lexer<string> {
  return slice(2, "UCSUR character");
}
/**
 * Parses a specific UCSUR character, this doesn't parse space and so must be
 * manually added if needed
 */
function specificUcsurCharacter(
  character: string,
  description: string,
): Lexer<string> {
  return ucsur().filter((word) => {
    if (word === character) {
      return true;
    } else {
      throw new UnexpectedError(`"${word}"`, description);
    }
  });
}
/**
 * Parses UCSUR word, this doesn't parse space and so must be manually added if
 * needed
 */
function ucsurWord(): Lexer<string> {
  return ucsur().map((word) => {
    const latin = UCSUR_TO_LATIN[word];
    if (latin == null) {
      throw new UnexpectedError(word, "UCSUR glyph");
    } else {
      return latin;
    }
  });
}
/** Parses a single UCSUR word. */
function singleUcsurWord(): Lexer<string> {
  return ucsurWord().skip(optionalAll(variationSelector())).skip(spaces());
}
/** Parses a joiner. */
function joiner(): Lexer<string> {
  return choiceOnlyOne(
    match(/\u200D/, "zero width joiner").map(([_, joiner]) => joiner),
    specificUcsurCharacter(STACKING_JOINER, "stacking joiner"),
    specificUcsurCharacter(SCALING_JOINER, "scaling joiner"),
  );
}
/**
 * Parses combined glyphs. The spaces after aren't parsed and so must be
 * manually added by the caller.
 */
function combinedGlyphs(): Lexer<Array<string>> {
  return sequence(
    ucsurWord(),
    allAtLeastOnce(
      joiner().with(ucsurWord()),
    ),
  )
    .map(([first, rest]) => [first, ...rest]);
}
/** Parses a word, either UCSUR or latin. */
function word(): Lexer<string> {
  return choiceOnlyOne(singleUcsurWord(), latinWord());
}
/** Parses proper words spanning multiple words. */
function properWords(): Lexer<string> {
  return allAtLeastOnce(
    match(/([A-Z][a-zA-Z]*)\s*/, "proper word").map(([_, word]) => word),
  )
    .map((array) => array.join(" "));
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
  return sequence(specificWord("a"), allAtLeastOnce(specificWord("a")))
    .map(([a, as]) => [a, ...as].length);
}
/** Parses lengthened words. */
function longWord(): Lexer<TokenTree & { type: "long word" }> {
  return match(/[an]/, 'long "a" or "n"')
    .then(([word, _]) =>
      count(allAtLeastOnce(matchString(word)))
        .map((count) =>
          ({
            type: "long word",
            word,
            length: count + 1,
          }) as TokenTree & { type: "long word" }
        )
    )
    .skip(spaces());
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
/** Parses a punctuation. */
function punctuation(): Lexer<string> {
  return match(/([.,:;?!󱦜󱦝])\s*/u, "punctuation")
    .map(([_, punctuation]) => punctuation);
}
/** Parses cartouche element and returns the phonemes or letters it represents. */
function cartoucheElement(): Lexer<string> {
  return choiceOnlyOne(
    singleUcsurWord()
      .skip(
        match(/([\uff1a󱦝])\s*/u, "full width colon").map(([_, dot]) => dot),
      ),
    sequence(
      singleUcsurWord(),
      count(
        allAtLeastOnce(
          match(/([・。／󱦜])\s*/u, "full width dot").map(([_, dot]) => dot),
        ),
      ),
    )
      .map(([word, dots]) => {
        let count = dots;
        if (/^[aeiou]/.test(word)) {
          count++;
        }
        const morae = word.match(/[aeiou]|[jklmnpstw][aeiou]|n/g)!;
        if (morae.length < count) {
          throw new UnrecognizedError("Excess dots");
        }
        return morae.slice(0, count).join("");
      }),
    singleUcsurWord().map((word) => word[0]),
    match(/([a-zA-Z]+)\s*/, "Latin letter")
      .map(([_, letter]) => letter.toLowerCase()),
  );
}
/** Parses a single cartouche. */
function cartouche(): Lexer<string> {
  return sequence(
    specificUcsurCharacter(START_OF_CARTOUCHE, "start of cartouche")
      .skip(spaces()),
    allAtLeastOnce(cartoucheElement()),
    specificUcsurCharacter(END_OF_CARTOUCHE, "end of cartouche").skip(spaces()),
  )
    .map(([_, words, _1]) => {
      const word = words.join("");
      return word[0].toUpperCase() + word.slice(1);
    });
}
/** Parses multiple cartouches. */
function cartouches(): Lexer<string> {
  return allAtLeastOnce(cartouche()).map((words) => words.join(" "));
}
/** Parses quotation. */
function quotation(
  allowLongGlyph: boolean,
): Lexer<TokenTree & { type: "quotation" }> {
  return sequence(
    openQuotationMark(),
    tokenTrees({ allowQuotation: false, allowLongGlyph }),
    closeQuotationMark(),
  )
    .map(([leftMark, tokenTree, rightMark]) => {
      switch (leftMark) {
        case '"':
        case "“":
          if (rightMark !== '"' && rightMark !== "”") {
            throw new UnrecognizedError("Mismatched quotation marks");
          }
          break;
        case "«":
          if (rightMark !== "»") {
            throw new UnrecognizedError("Mismatched quotation marks");
          }
          break;
        case "「":
          if (rightMark !== "」") {
            throw new UnrecognizedError("Mismatched quotation marks");
          }
          break;
      }
      return { type: "quotation", tokenTree, leftMark, rightMark };
    });
}
/**
 * Parses long glyph container.
 *
 * spaces after the first glyph and the last glyph aren't parsed and so must be
 * manually added by the caller if needed.
 */
function longContainer<T>(
  left: string,
  right: string,
  inside: Lexer<T>,
): Lexer<T> {
  const description: { [character: string]: string } = {
    [START_OF_LONG_GLYPH]: "start of long glyph",
    [END_OF_LONG_GLYPH]: "end of long glyph",
    [START_OF_REVERSE_LONG_GLYPH]: "start of reverse long glyph",
    [END_OF_REVERSE_LONG_GLYPH]: "end of reverse long glyph",
  };
  return sequence(
    specificUcsurCharacter(left, description[left]),
    inside,
    specificUcsurCharacter(right, description[right]),
  )
    .map(([_, inside, _1]) => inside);
}
/** Parses long glyph container containing words. */
function longCharacterContainer(
  allowQuotation: boolean,
  left: string,
  right: string,
): Lexer<Array<TokenTree>> {
  return longContainer(
    left,
    right,
    spaces().with(
      allAtLeastOnce(tokenTree({ allowQuotation, allowLongGlyph: false })),
    ),
  );
}
/** Parses long glyph container containing just spaces. */
function longSpaceContainer(): Lexer<number> {
  return longContainer(
    START_OF_LONG_GLYPH,
    END_OF_LONG_GLYPH,
    match(/\s+/, "space").map(([space]) => space.length),
  )
    .skip(spaces());
}
/**
 * Parses long glyph head.
 *
 * This doesn't parses space on the right and so must be manually added by the
 * caller if needed.
 */
function longGlyphHead(): Lexer<Array<string>> {
  return choiceOnlyOne(
    combinedGlyphs(),
    ucsurWord().map((word) => [word]),
  );
}
/** Parses long glyph that contains characters. */
function characterLongGlyph(
  allowQuotation: boolean,
): Lexer<TokenTree & { type: "long glyph" }> {
  return sequence(
    optionalAll(
      longCharacterContainer(
        allowQuotation,
        START_OF_REVERSE_LONG_GLYPH,
        END_OF_REVERSE_LONG_GLYPH,
      ),
    )
      .map((array) => array ?? []),
    longGlyphHead(),
    optionalAll(
      longCharacterContainer(
        allowQuotation,
        START_OF_LONG_GLYPH,
        END_OF_LONG_GLYPH,
      ),
    )
      .map((array) => array ?? []),
  )
    .skip(spaces())
    .filter(([before, _, after]) => before.length !== 0 || after.length !== 0)
    .map(([before, words, after]) => ({
      type: "long glyph",
      before,
      words,
      after,
    }));
}
/** Parses long glyph that only contains spaces. */
function longSpaceGlyph(): Lexer<TokenTree & { type: "long glyph space" }> {
  return sequence(longGlyphHead(), longSpaceContainer())
    .map(([words, spaceLength]) => ({
      type: "long glyph space",
      words,
      spaceLength,
    }));
}
/** Parses underline lon. */
function longLon(
  allowQuotation: boolean,
): Lexer<Array<TokenTree>> {
  return longCharacterContainer(
    allowQuotation,
    START_OF_REVERSE_LONG_GLYPH,
    END_OF_LONG_GLYPH,
  )
    .skip(spaces());
}
/** Parses all kinds of long glyphs. */
function longGlyph(allowQuotation: boolean): Lexer<TokenTree> {
  return choiceOnlyOne(
    characterLongGlyph(allowQuotation) as Lexer<TokenTree>,
    longSpaceGlyph() as Lexer<TokenTree>,
    longLon(allowQuotation).map((words) => ({ type: "underline lon", words })),
  );
}
/** Parses a token tree. */
function tokenTree(
  nestingSettings: { allowQuotation: boolean; allowLongGlyph: boolean },
): Lexer<TokenTree> {
  let quotationParser: Lexer<TokenTree>;
  if (nestingSettings.allowQuotation) {
    quotationParser = quotation(nestingSettings.allowLongGlyph);
  } else {
    quotationParser = empty();
  }
  let longGlyphParser: Lexer<TokenTree>;
  if (nestingSettings.allowLongGlyph) {
    longGlyphParser = longGlyph(nestingSettings.allowQuotation);
  } else {
    longGlyphParser = empty();
  }
  let xAlaXParser: Lexer<TokenTree>;
  if (settings.get("x-ala-x-partial-parsing")) {
    xAlaXParser = empty();
  } else {
    xAlaXParser = xAlaX()
      .map((word) => ({ type: "x ala x", word }) as TokenTree);
  }
  return choiceOnlyOne(
    punctuation().map((punctuation) =>
      ({ type: "punctuation", punctuation }) as TokenTree
    ),
    quotationParser,
    longGlyphParser,
    cartouches().map((words) =>
      ({ type: "proper word", words, kind: "cartouche" }) as TokenTree
    ),
    properWords().map((words) =>
      ({ type: "proper word", words, kind: "latin" }) as TokenTree
    ),
    combinedGlyphs()
      .skip(spaces())
      .map((words) => ({ type: "combined glyphs", words }) as TokenTree),
    longWord(),
    multipleA().map((count) => ({ type: "multiple a", count }) as TokenTree),
    xAlaXParser,
    word().map((word) => ({ type: "word", word })),
  );
}
/** Parses multiple token trees. */
function tokenTrees(
  nestingSettings: { allowQuotation: boolean; allowLongGlyph: boolean },
): Lexer<Array<TokenTree>> {
  return all(tokenTree(nestingSettings));
}
/** The final lexer. */
const FULL_PARSER = spaces()
  .with(tokenTrees({ allowQuotation: true, allowLongGlyph: true }))
  .skip(eol());
/** Turns string into token trees. */
export function lex(src: string): Output<Array<TokenTree>> {
  if (/\n/.test(src.trim())) {
    return new Output(new UnrecognizedError("multiline text"));
  }
  return FULL_PARSER.parse(src);
}
