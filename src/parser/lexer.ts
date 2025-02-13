/**
 * Module for lexer. It is responsible for turning string into array of token
 * trees. It also latinizes UCSUR characters.
 *
 * Note: the words lexer and parser are used interchangeably since they both
 * have the same capabilities.
 */

import { settings } from "../settings.ts";
import {
  allAtLeastOnce,
  cached,
  choice,
  choiceOnlyOne,
  count,
  empty,
  match,
  matchString,
  optionalAll,
  Parser,
  sequence,
  UnexpectedError,
  UnrecognizedError,
  variable,
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

/** parses space. */
function spaces(): Parser<string> {
  return match(/[^\S\n\r]*/, "spaces");
}
/** Parses lowercase latin word. */
function latinWord(): Parser<string> {
  return match(/[a-z][a-zA-Z]*/, "word")
    .map((word) => {
      if (/[A-Z]/.test(word)) {
        throw new UnrecognizedError(`"${word}"`);
      } else {
        return word;
      }
    })
    .skip(spaces());
}
/** Parses variation selector. */
function variationSelector(): Parser<string> {
  return match(/[\uFE00-\uFE0F]/, "variation selector");
}
/**
 * Parses UCSUR word, this doesn't parse space and so must be manually added if
 * needed
 */
function ucsur(): Parser<string> {
  return match(UCSUR_CHARACTER_REGEX, "UCSUR glyph")
    .map((ucsur) => UCSUR_TO_LATIN[ucsur]);
}
/**
 * Parses special UCSUR character, this doesn't parse space and so must be
 * manually added if needed
 */
function specificSpecialUcsur(specialUcsur: string): Parser<string> {
  return matchString(specialUcsur, SPECIAL_UCSUR_DESCRIPTIONS[specialUcsur]);
}
/** Parses a single UCSUR word. */
function singleUcsurWord(): Parser<string> {
  return ucsur().skip(optionalAll(variationSelector())).skip(spaces());
}
/** Parses a joiner. */
function joiner(): Parser<string> {
  return choiceOnlyOne(
    matchString("\u200D", "zero width joiner"),
    specificSpecialUcsur(STACKING_JOINER),
    specificSpecialUcsur(SCALING_JOINER),
  );
}
/**
 * Parses combined glyphs. The spaces after aren't parsed and so must be
 * manually added by the caller.
 */
function combinedGlyphs(): Parser<Array<string>> {
  return sequence(ucsur(), allAtLeastOnce(joiner().with(ucsur())))
    .map(([first, rest]) => [first, ...rest]);
}
/** Parses a word, either UCSUR or latin. */
function word(): Parser<string> {
  return choiceOnlyOne(latinWord(), singleUcsurWord());
}
/** Parses proper words spanning multiple words. */
function properWords(): Parser<string> {
  return allAtLeastOnce(match(/[A-Z][a-zA-Z]*/, "proper word").skip(spaces()))
    .map((array) => array.join(" "));
}
/** Parses a specific word, either UCSUR or latin. */
function specificWord(thatWord: string): Parser<string> {
  return word().filter((thisWord) => {
    if (thatWord === thisWord) {
      return true;
    } else {
      throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
    }
  });
}
/** Parses multiple a. */
function multipleA(): Parser<number> {
  return sequence(specificWord("a"), allAtLeastOnce(specificWord("a")))
    .map(([a, as]) => [a, ...as].length);
}
/** Parses lengthened words. */
function longWord(): Parser<Token & { type: "long word" }> {
  return choice(matchString("a"), matchString("n"))
    .then((word) =>
      count(allAtLeastOnce(matchString(word)))
        .map<Token & { type: "long word" }>((count) => ({
          type: "long word",
          word,
          length: count + 1,
        }))
    )
    .skip(spaces());
}
/** Parses X ala X constructions if allowed by the settings. */
function xAlaX(): Parser<string> {
  return variable(() => {
    if (settings.xAlaXPartialParsing) {
      return empty();
    } else {
      return word()
        .then((word) =>
          sequence(specificWord("ala"), specificWord(word)).map(() => word)
        );
    }
  });
}
/** Parses a punctuation. */
function punctuation(): Parser<string> {
  // This includes UCSUR middle dot and colon
  // https://www.kreativekorp.com/ucsur/charts/sitelen.html
  return match(/[.,:;?!…·。｡︒\u{F199C}\u{F199D}]+/u, "punctuation")
    .map((punctuation) =>
      punctuation
        .replaceAll(/[·。｡︒\u{F199C}]/gu, ".")
        .replaceAll("\u{F199D}", ":")
        .replaceAll("...", "…")
    )
    .skip(spaces());
}
/**
 * Parses cartouche element and returns the phonemes or letters it represents.
 */
function cartoucheElement(): Parser<string> {
  // This includes UCSUR middle dot and colon
  // https://www.kreativekorp.com/ucsur/charts/sitelen.html
  return choiceOnlyOne(
    singleUcsurWord()
      .skip(match(/[\uFF1A\u{F199D}]/u, "full width colon").skip(spaces())),
    sequence(
      singleUcsurWord(),
      count(
        allAtLeastOnce(
          match(/[・。／\u{F199C}]/u, "full width dot").skip(spaces()),
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
    singleUcsurWord().map((word) => word[0]),
    match(/[a-zA-Z]+/, "Latin letter")
      .map((letter) => letter.toLowerCase())
      .skip(spaces()),
  );
}
/** Parses a single cartouche. */
function cartouche(): Parser<string> {
  return sequence(
    specificSpecialUcsur(START_OF_CARTOUCHE).skip(spaces()),
    allAtLeastOnce(cartoucheElement()),
    specificSpecialUcsur(END_OF_CARTOUCHE).skip(spaces()),
  )
    .map(([_, words]) => {
      const word = words.join("");
      return `${word[0].toUpperCase()}${word.slice(1)}`;
    });
}
/** Parses multiple cartouches. */
function cartouches(): Parser<string> {
  return allAtLeastOnce(cartouche()).map((words) => words.join(" "));
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
function longSpaceContainer(): Parser<number> {
  return longContainer(
    START_OF_LONG_GLYPH,
    END_OF_LONG_GLYPH,
    spaces().map((space) => space.length),
  )
    .skip(spaces());
}
/**
 * Parses long glyph head.
 *
 * This doesn't parses space on the right and so must be manually added by the
 * caller if needed.
 */
function longGlyphHead(): Parser<Array<string>> {
  return choiceOnlyOne(
    combinedGlyphs(),
    ucsur().map((word) => [word]),
  );
}
/** Parses long glyph that only contains spaces. */
function spaceLongGlyph(): Parser<Token & { type: "space long glyph" }> {
  return sequence(longGlyphHead(), longSpaceContainer())
    .map(([words, spaceLength]) => ({
      type: "space long glyph",
      words,
      spaceLength,
    }));
}
function headedLongGlyphStart(): Parser<
  Token & { type: "headed long glyph start" }
> {
  return longGlyphHead()
    .skip(specificSpecialUcsur(START_OF_LONG_GLYPH))
    .skip(spaces())
    .map((words) => ({ type: "headed long glyph start", words }));
}
function headlessLongGlyphEnd(): Parser<
  Token & { type: "headless long glyph end" }
> {
  return specificSpecialUcsur(END_OF_LONG_GLYPH)
    .skip(spaces())
    .map(() => ({ type: "headless long glyph end" }));
}
function headlessLongGlyphStart(): Parser<
  Token & { type: "headless long glyph end" }
> {
  return specificSpecialUcsur(START_OF_REVERSE_LONG_GLYPH)
    .skip(spaces())
    .map(() => ({ type: "headless long glyph end" }));
}
function headedLongGlyphEnd(): Parser<
  Token & { type: "headed long glyph start" }
> {
  return specificSpecialUcsur(END_OF_REVERSE_LONG_GLYPH)
    .with(longGlyphHead())
    .skip(spaces())
    .map((words) => ({ type: "headed long glyph start", words }));
}
function insideLongGlyph(): Parser<
  Token & { type: "inside long glyph" }
> {
  return specificSpecialUcsur(END_OF_REVERSE_LONG_GLYPH)
    .with(longGlyphHead())
    .skip(specificSpecialUcsur(START_OF_LONG_GLYPH))
    .skip(spaces())
    .map((words) => ({ type: "inside long glyph", words }));
}
/** Parses a token aside from X ala X. */
const TOKEN_EXCEPT_X_ALA_X = cached(choiceOnlyOne<Token>(
  spaceLongGlyph(),
  headedLongGlyphStart(),
  combinedGlyphs()
    .skip(spaces())
    .map((words) => ({ type: "combined glyphs", words })),
  properWords().map((words) => ({ type: "proper word", words, kind: "latin" })),
  longWord(),
  multipleA().map((count) => ({ type: "multiple a", count })),
  word().map((word) => ({ type: "word", word })),
  // starting with non-words:
  punctuation().map((punctuation) => ({ type: "punctuation", punctuation })),
  headlessLongGlyphEnd(),
  headedLongGlyphEnd(),
  headlessLongGlyphStart(),
  insideLongGlyph(),
  cartouches().map((words) => ({
    type: "proper word",
    words,
    kind: "cartouche",
  })),
));
/** Parses a token. */
export const TOKEN = choiceOnlyOne<Token>(
  xAlaX().map((word) => ({ type: "x ala x", word })),
  TOKEN_EXCEPT_X_ALA_X,
);
