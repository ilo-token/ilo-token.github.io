/**
 * Module for lexer. It is responsible for turning string into array of token
 * trees. It also latinizes UCSUR characters.
 *
 * Note: the words lexer and parser are used interchangeably since they both
 * have the same capabilities.
 */

import { settings } from "../settings.ts";
import { cache } from "./cache.ts";
import {
  allAtLeastOnce,
  choice,
  choiceOnlyOne,
  count,
  empty,
  lazy,
  match,
  matchString,
  nothing,
  optionalAll,
  Parser,
  sequence,
  sourceOnly,
  UnexpectedError,
  UnrecognizedError,
} from "./parser-lib.ts";
import { Token } from "./token.ts";
import {
  END_OF_CARTOUCHE,
  END_OF_LONG_GLYPH,
  END_OF_REVERSE_LONG_GLYPH,
  SCALING_JOINER,
  SPECIAL_UCSUR_DESCRIPTIONS,
  STACKING_JOINER,
  START_OF_CARTOUCHE,
  START_OF_LONG_GLYPH,
  START_OF_REVERSE_LONG_GLYPH,
  UCSUR_CHARACTER_REGEX,
  UCSUR_TO_LATIN,
} from "./ucsur.ts";

const spacesWithoutNewline = match(/[^\S\n\r]*/, "spaces");
const newline = match(/[\n\r]\s*/, "newline");
/** parses space. */
const spaces = sourceOnly(
  sequence(spacesWithoutNewline, choice(nothing, newline)),
);
/** Parses lowercase latin word. */
const latinWord = match(/[a-z][a-zA-Z]*/, "word").skip(spaces);
/** Parses variation selector. */
const variationSelector = match(/[\uFE00-\uFE0F]/, "variation selector");
/**
 * Parses UCSUR word, this doesn't parse space and so must be manually added if
 * needed
 */
const ucsur = match(UCSUR_CHARACTER_REGEX, "UCSUR glyph")
  .map((ucsur) => UCSUR_TO_LATIN.get(ucsur)!);
/**
 * Parses special UCSUR character, this doesn't parse space and so must be
 * manually added if needed
 */
function specificSpecialUcsur(specialUcsur: string): Parser<string> {
  return matchString(
    specialUcsur,
    SPECIAL_UCSUR_DESCRIPTIONS.get(specialUcsur)!,
  );
}
/** Parses a single UCSUR word. */
const singleUcsurWord = ucsur.skip(optionalAll(variationSelector)).skip(spaces);
/** Parses a joiner. */
const joiner = choiceOnlyOne(
  matchString("\u200D", "zero width joiner"),
  specificSpecialUcsur(STACKING_JOINER),
  specificSpecialUcsur(SCALING_JOINER),
);
/**
 * Parses combined glyphs. The spaces after aren't parsed and so must be
 * manually added by the caller.
 */
const combinedGlyphs = sequence(ucsur, allAtLeastOnce(joiner.with(ucsur)))
  .map(([first, rest]) => [first, ...rest]);
/** Parses a word, either UCSUR or latin. */
const word = choiceOnlyOne(latinWord, singleUcsurWord);
/** Parses proper words spanning multiple words. */
const properWords = allAtLeastOnce(
  match(/[A-Z][a-zA-Z]*/, "proper word").skip(spaces),
)
  .map((array) => array.join(" "))
  .map<Token>((words) => ({ type: "proper word", words, kind: "latin" }));
/** Parses a specific word, either UCSUR or latin. */
function specificWord(thatWord: string): Parser<string> {
  return word.filter((thisWord) => {
    if (thatWord === thisWord) {
      return true;
    } else {
      throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
    }
  });
}
/** Parses multiple a. */
const multipleA = sequence(
  specificWord("a"),
  count(allAtLeastOnce(specificWord("a"))),
)
  .map<Token>(([_, count]) => ({ type: "multiple a", count: count + 1 }));
/** Parses lengthened words. */
const longWord = choiceOnlyOne(matchString("a"), matchString("n"))
  .then((word) =>
    count(allAtLeastOnce(matchString(word)))
      .map<Token>((count) => ({
        type: "long word",
        word,
        length: count + 1,
      }))
  )
  .skip(spaces);

Parser.startCache(cache);

/** Parses X ala X constructions if allowed by the settings. */
const xAlaX = lazy(() => {
  if (settings.xAlaXPartialParsing) {
    return empty;
  } else {
    return word
      .then((word) =>
        sequence(specificWord("ala"), specificWord(word)).map(() => word)
      );
  }
})
  .map<Token>((word) => ({ type: "x ala x", word }));

Parser.endCache();

/** Parses a punctuation. */
const punctuation = choiceOnlyOne(
  match(/[.,:;?!…·。｡︒\u{F199C}\u{F199D}]+/u, "punctuation")
    .map((punctuation) =>
      punctuation
        .replaceAll(/[·。｡︒\u{F199C}]/gu, ".")
        .replaceAll("\u{F199D}", ":")
        .replaceAll("...", "…")
    )
    .skip(spaces),
  newline.map(() => "."),
)
  .map<Token>((punctuation) => ({ type: "punctuation", punctuation }));
/**
 * Parses cartouche element and returns the phonemes or letters it represents.
 */
const cartoucheElement = choiceOnlyOne(
  singleUcsurWord
    .skip(match(/[\uFF1A\u{F199D}]/u, "full width colon").skip(spaces)),
  sequence(
    singleUcsurWord,
    count(
      allAtLeastOnce(
        match(/[・。／\u{F199C}]/u, "full width dot").skip(spaces),
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
        throw new UnrecognizedError("excess dots");
      }
      return morae.slice(0, count).join("");
    }),
  singleUcsurWord.map((word) => word[0]),
  match(/[a-zA-Z]+/, "Latin letter")
    .map((letter) => letter.toLowerCase())
    .skip(spaces),
);
/** Parses a single cartouche. */
const cartouche = sequence(
  specificSpecialUcsur(START_OF_CARTOUCHE).skip(spaces),
  allAtLeastOnce(cartoucheElement),
  specificSpecialUcsur(END_OF_CARTOUCHE).skip(spaces),
)
  .map(([_, words]) => {
    const word = words.join("");
    return `${word[0].toUpperCase()}${word.slice(1)}`;
  });
/** Parses multiple cartouches. */
const cartouches = allAtLeastOnce(cartouche)
  .map((words) => words.join(" "))
  .map<Token>((words) => ({
    type: "proper word",
    words,
    kind: "cartouche",
  }));
/**
 * Parses long glyph container.
 *
 * spaces after the first glyph and the last glyph aren't parsed and so must be
 * manually added by the caller if needed.
 */
function longContainer<T>(
  left: string,
  right: string,
  inside: Parser<T>,
): Parser<T> {
  return sequence(
    specificSpecialUcsur(left),
    inside,
    specificSpecialUcsur(right),
  )
    .map(([_, inside]) => inside);
}
/** Parses long glyph container containing just spaces. */
const longSpaceContainer = longContainer(
  START_OF_LONG_GLYPH,
  END_OF_LONG_GLYPH,
  spacesWithoutNewline.map((space) => space.length),
)
  .skip(spaces);
/**
 * Parses long glyph head.
 *
 * This doesn't parses space on the right and so must be manually added by the
 * caller if needed.
 */
const longGlyphHead = choiceOnlyOne(
  combinedGlyphs,
  ucsur.map((word) => [word]),
);
/** Parses long glyph that only contains spaces. */
const spaceLongGlyph = sequence(longGlyphHead, longSpaceContainer)
  .map<Token>(([words, spaceLength]) => ({
    type: "space long glyph",
    words,
    spaceLength,
  }));
const headedLongGlyphStart = longGlyphHead
  .skip(specificSpecialUcsur(START_OF_LONG_GLYPH))
  .skip(spaces)
  .map<Token>((words) => ({ type: "headed long glyph start", words }));
const headlessLongGlyphEnd = specificSpecialUcsur(END_OF_LONG_GLYPH)
  .skip(spaces)
  .map<Token>(() => ({ type: "headless long glyph end" }));
const headlessLongGlyphStart = specificSpecialUcsur(START_OF_REVERSE_LONG_GLYPH)
  .skip(spaces)
  .map<Token>(() => ({ type: "headless long glyph end" }));
const headedLongGlyphEnd = specificSpecialUcsur(END_OF_REVERSE_LONG_GLYPH)
  .with(longGlyphHead)
  .skip(spaces)
  .map<Token>((words) => ({ type: "headed long glyph start", words }));
const insideLongGlyph = specificSpecialUcsur(END_OF_REVERSE_LONG_GLYPH)
  .with(longGlyphHead)
  .skip(specificSpecialUcsur(START_OF_LONG_GLYPH))
  .skip(spaces)
  .map<Token>((words) => ({ type: "inside long glyph", words }));
const combinedGlyphsToken = combinedGlyphs
  .skip(spaces)
  .map<Token>((words) => ({ type: "combined glyphs", words }));
const wordToken = word.map<Token>((word) => ({ type: "word", word }));

Parser.startCache(cache);

/** Parses a token. */
export const token = choiceOnlyOne(
  longWord,
  xAlaX,
  multipleA,
  wordToken,
  properWords,
  // UCSUR only
  spaceLongGlyph,
  headedLongGlyphStart,
  combinedGlyphsToken,
  // starting with non-words:
  punctuation,
  headlessLongGlyphEnd,
  headedLongGlyphEnd,
  headlessLongGlyphStart,
  insideLongGlyph,
  cartouches,
);

Parser.endCache();
