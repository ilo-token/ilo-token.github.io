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
  allAtLeastOnce,
  cached,
  choiceOnlyOne,
  count,
  match,
  optionalAll,
  Parser,
  sequence,
} from "./parser-lib.ts";
import { Token } from "./token.ts";
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

/** parses space. */
export function spaces(): Parser<string> {
  return match(/\s*/, "space").map(([space]) => space);
}
/** parses a string of consistent length. */
function slice(length: number, description: string): Parser<string> {
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
function matchString(match: string): Parser<string> {
  return slice(match.length, `"${match}"`).map((slice) => {
    if (slice === match) {
      return match;
    } else {
      throw new UnexpectedError(`"${slice}"`, `"${match}"`);
    }
  });
}
/** Parses lowercase latin word. */
function latinWord(): Parser<string> {
  return match(/([a-z][a-zA-Z]*)\s*/, "word").map(([_, word]) => {
    if (/[A-Z]/.test(word)) {
      throw new UnrecognizedError(`"${word}"`);
    } else {
      return word;
    }
  });
}
/** Parses variation selector. */
function variationSelector(): Parser<string> {
  return match(/[\uFE00-\uFE0F]/, "variation selector")
    .map(([character]) => character);
}
/**
 * Parses an UCSUR character, this doesn't parse space and so must be manually
 * added if needed.
 */
function ucsur(): Parser<string> {
  return slice(2, "UCSUR character");
}
/**
 * Parses a specific UCSUR character, this doesn't parse space and so must be
 * manually added if needed
 */
function specificUcsurCharacter(
  character: string,
  description: string,
): Parser<string> {
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
function ucsurWord(): Parser<string> {
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
function singleUcsurWord(): Parser<string> {
  return ucsurWord().skip(optionalAll(variationSelector())).skip(spaces());
}
/** Parses a joiner. */
function joiner(): Parser<string> {
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
function combinedGlyphs(): Parser<Array<string>> {
  return sequence(
    ucsurWord(),
    allAtLeastOnce(
      joiner().with(ucsurWord()),
    ),
  )
    .map(([first, rest]) => [first, ...rest]);
}
/** Parses a word, either UCSUR or latin. */
function word(): Parser<string> {
  return choiceOnlyOne(singleUcsurWord(), latinWord());
}
/** Parses proper words spanning multiple words. */
function properWords(): Parser<string> {
  return allAtLeastOnce(
    match(/([A-Z][a-zA-Z]*)\s*/, "proper word").map(([_, word]) => word),
  )
    .map((array) => array.join(" "));
}
/** Parses a specific word, either UCSUR or latin. */
function specificWord(thatWord: string): Parser<string> {
  return word().filter((thisWord) => {
    if (thatWord === thisWord) return true;
    else throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
  });
}
/** Parses multiple a. */
function multipleA(): Parser<number> {
  return sequence(specificWord("a"), allAtLeastOnce(specificWord("a")))
    .map(([a, as]) => [a, ...as].length);
}
/** Parses lengthened words. */
function longWord(): Parser<Token & { type: "long word" }> {
  return match(/[an]/, 'long "a" or "n"')
    .then(([word, _]) =>
      count(allAtLeastOnce(matchString(word)))
        .map((count) =>
          ({
            type: "long word",
            word,
            length: count + 1,
          }) as Token & { type: "long word" }
        )
    )
    .skip(spaces());
}
/** Parses X ala X constructions. */
function xAlaX(): Parser<string> {
  return word().then((word) =>
    sequence(specificWord("ala"), specificWord(word)).map(() => word)
  );
}
/** Parses a punctuation. */
function punctuation(): Parser<string> {
  return match(/([.,:;?!󱦜󱦝])\s*/u, "punctuation")
    .map(([_, punctuation]) => punctuation);
}
/** Parses cartouche element and returns the phonemes or letters it represents. */
function cartoucheElement(): Parser<string> {
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
function cartouche(): Parser<string> {
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
/** Parses long glyph container containing just spaces. */
function longSpaceContainer(): Parser<number> {
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
function longGlyphHead(): Parser<Array<string>> {
  return choiceOnlyOne(
    combinedGlyphs(),
    ucsurWord().map((word) => [word]),
  );
}
/** Parses long glyph that only contains spaces. */
function longSpaceGlyph(): Parser<Token & { type: "long glyph space" }> {
  return sequence(longGlyphHead(), longSpaceContainer())
    .map(([words, spaceLength]) => ({
      type: "long glyph space",
      words,
      spaceLength,
    }));
}
function headedLongGlyphStart(): Parser<
  Token & { type: "headed long glyph start" }
> {
  return longGlyphHead().skip(
    specificUcsurCharacter(START_OF_LONG_GLYPH, "start of long glyph"),
  )
    .skip(spaces())
    .map((words) => ({ type: "headed long glyph start", words }));
}
function headlessLongGlyphEnd(): Parser<
  Token & { type: "headless long glyph end" }
> {
  return specificUcsurCharacter(END_OF_LONG_GLYPH, "end of long glyph")
    .skip(spaces())
    .map((_) => ({ type: "headless long glyph end" }));
}
function headlessLongGlyphStart(): Parser<
  Token & { type: "headless long glyph end" }
> {
  return specificUcsurCharacter(
    START_OF_REVERSE_LONG_GLYPH,
    "start of reverse long glyph",
  )
    .skip(spaces())
    .map((_) => ({ type: "headless long glyph end" }));
}
function headedLongGlyphEnd(): Parser<
  Token & { type: "headed long glyph start" }
> {
  return specificUcsurCharacter(
    END_OF_REVERSE_LONG_GLYPH,
    "end of reverse long glyph",
  )
    .with(longGlyphHead())
    .skip(spaces())
    .map((words) => ({ type: "headed long glyph start", words }));
}
function insideLongGlyph(): Parser<
  Token & { type: "headed long glyph start" }
> {
  return specificUcsurCharacter(
    END_OF_REVERSE_LONG_GLYPH,
    "end of reverse long glyph",
  )
    .with(longGlyphHead())
    .skip(specificUcsurCharacter(START_OF_LONG_GLYPH, "start of long glyph"))
    .skip(spaces())
    .map((words) => ({ type: "headed long glyph start", words }));
}
/** Parses a token. */
export const TOKEN = cached(choiceOnlyOne(
  longSpaceGlyph(),
  headedLongGlyphStart(),
  combinedGlyphs()
    .skip(spaces())
    .map((words) => ({ type: "combined glyphs", words }) as Token),
  properWords().map((words) =>
    ({ type: "proper word", words, kind: "latin" }) as Token
  ),
  longWord(),
  multipleA().map((count) => ({ type: "multiple a", count }) as Token),
  xAlaX().map((word) => ({ type: "x ala x", word }) as Token),
  word().map((word) => ({ type: "word", word }) as Token),
  // starting with non-words:
  punctuation().map((punctuation) =>
    ({ type: "punctuation", punctuation }) as Token
  ),
  headlessLongGlyphEnd(),
  headedLongGlyphEnd(),
  headlessLongGlyphStart(),
  insideLongGlyph(),
  cartouches().map((words) =>
    ({ type: "proper word", words, kind: "cartouche" }) as Token
  ),
));
