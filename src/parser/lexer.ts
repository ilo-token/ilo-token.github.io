import { memoize } from "@std/cache/memoize";
import { sumOf } from "@std/collections/sum-of";
import { throwError } from "../../misc/misc.ts";
import { settings } from "../settings.ts";
import {
  all,
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
  sequence,
  UnexpectedError,
  UnrecognizedError,
} from "./parser_lib.ts";
import {
  ELLIPSIS,
  NSK_COLON,
  NSK_PERIOD,
  SENTENCE_TERMINATOR,
  SENTENCE_TERMINATOR_TO_ASCII,
} from "./punctuation.ts";
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

const spacesWithoutNewline = match(/[^\S\n]*?(?=\S|\r?\n|$)/, "spaces");
const newline = match(/\r?\n\s*/, "newline");
const spaces = sequence(spacesWithoutNewline, choice(nothing, newline));
const latinWord = match(/[a-z][a-zA-Z]*/, "word").skip(spaces);
const variationSelector = match(/[\uFE00-\uFE0F]/, "variation selector");
const ucsur = match(UCSUR_CHARACTER_REGEX, "UCSUR glyph")
  .map((ucsur) => UCSUR_TO_LATIN.get(ucsur)!);

const specificSpecialUcsur = memoize((specialUcsur: string) =>
  matchString(
    specialUcsur,
    SPECIAL_UCSUR_DESCRIPTIONS.get(specialUcsur)!,
  )
);
const singleUcsurWord = ucsur.skip(optionalAll(variationSelector)).skip(spaces);
const joiner = choiceOnlyOne(
  matchString("\u200D", "zero width joiner"),
  specificSpecialUcsur(STACKING_JOINER),
  specificSpecialUcsur(SCALING_JOINER),
);
const combinedGlyphs = sequence(ucsur, allAtLeastOnce(joiner.with(ucsur)))
  .map(([first, rest]) => [first, ...rest]);
const word = choiceOnlyOne(latinWord, singleUcsurWord);
const properWords = allAtLeastOnce(
  match(/[A-Z][a-zA-Z]*/, "proper word").skip(spaces),
)
  .map((array) => array.join(" "))
  .map((words) => ({ type: "proper word", words, kind: "latin" }) as const);

const specificWord = memoize((thatWord: string) =>
  word.filter((thisWord) =>
    thatWord === thisWord ||
    throwError(new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`))
  )
);
const multipleA = specificWord("a")
  .with(count(allAtLeastOnce(specificWord("a"))))
  .map((count) => ({ type: "multiple a", count: count + 1 }) as const);
const repeatingLetter = match(/[a-zA-Z]/, "latin letter")
  .then(memoize((letter) =>
    count(all(matchString(letter)))
      .map((count) => [letter, count + 1] as const)
  ));
const longWord = allAtLeastOnce(repeatingLetter)
  .skip(spaces)
  .map((letters) => {
    const word = letters.map(([letter]) => letter).join("");
    const length = sumOf(letters, ([_, count]) => count) - word.length + 1;
    return { type: "long word", word, length } as const;
  })
  .filter(({ word, length }) => /^[a-z]/.test(word) && length > 1);

const alaX = memoize((word: string) =>
  sequence(specificWord("ala"), specificWord(word)).map(() => word)
);
const xAlaX = lazy(() => settings.xAlaXPartialParsing ? empty : word.then(alaX))
  .map((word) => ({ type: "x ala x", word }) as const);
const punctuation = choiceOnlyOne(
  allAtLeastOnce(
    match(SENTENCE_TERMINATOR, "punctuation")
      .map((punctuation) => SENTENCE_TERMINATOR_TO_ASCII.get(punctuation)!),
  )
    .skip(spaces)
    .map((punctuation) => punctuation.join("").replaceAll("...", ELLIPSIS)),
  newline.map(() => "."),
)
  .map((punctuation) => ({ type: "punctuation", punctuation }) as const);
const cartoucheElement = choiceOnlyOne(
  singleUcsurWord
    .skip(match(NSK_COLON, "full width colon").skip(spaces)),
  sequence(
    singleUcsurWord,
    count(
      allAtLeastOnce(
        match(NSK_PERIOD, "full width dot").skip(spaces),
      ),
    ),
  )
    .map(([word, dots]) => {
      const count = /^[aeiou]/.test(word) ? dots + 1 : dots;
      const morae = word.match(/[jklmnpstw]?[aeiou]|n/g)!;
      if (count <= morae.length) {
        return morae.slice(0, count).join("");
      } else {
        throw new UnrecognizedError("excess dots");
      }
    }),
  singleUcsurWord.map(([letter]) => letter),
  match(/[a-zA-Z]/, "Latin letter")
    .map((letter) => letter.toLowerCase())
    .skip(spaces),
);
const cartouche = specificSpecialUcsur(START_OF_CARTOUCHE)
  .skip(spaces)
  .with(allAtLeastOnce(cartoucheElement))
  .skip(specificSpecialUcsur(END_OF_CARTOUCHE))
  .skip(spaces)
  .map((words) =>
    words.join("").replace(/^./, (character) => character.toUpperCase())
  );
const cartouches = allAtLeastOnce(cartouche)
  .map((words) => words.join(" "))
  .map((words) =>
    ({
      type: "proper word",
      words,
      kind: "cartouche",
    }) as const
  );
const longSpaceContainer = specificSpecialUcsur(START_OF_LONG_GLYPH)
  .with(count(spacesWithoutNewline).filter((length) => length > 0))
  .skip(specificSpecialUcsur(END_OF_LONG_GLYPH))
  .skip(spaces);
const longGlyphHead = choiceOnlyOne(
  combinedGlyphs,
  ucsur.map((word) => [word]),
);
const spaceLongGlyph = sequence(
  longGlyphHead,
  longSpaceContainer,
)
  .map(([words, spaceLength]) =>
    ({
      type: "space long glyph",
      words,
      spaceLength,
    }) as const
  );
const headedLongGlyphStart = longGlyphHead
  .skip(specificSpecialUcsur(START_OF_LONG_GLYPH))
  .skip(spaces)
  .map((words) => ({ type: "headed long glyph start", words }) as const);
const headlessLongGlyphEnd = specificSpecialUcsur(END_OF_LONG_GLYPH)
  .skip(spaces)
  .map(() => ({ type: "headless long glyph end" }) as const);
const headlessLongGlyphStart = specificSpecialUcsur(START_OF_REVERSE_LONG_GLYPH)
  .skip(spaces)
  .map(() => ({ type: "headless long glyph end" }) as const);
const headedLongGlyphEnd = specificSpecialUcsur(END_OF_REVERSE_LONG_GLYPH)
  .with(longGlyphHead)
  .skip(spaces)
  .map((words) => ({ type: "headed long glyph start", words }) as const);
const insideLongGlyph = specificSpecialUcsur(END_OF_REVERSE_LONG_GLYPH)
  .with(longGlyphHead)
  .skip(specificSpecialUcsur(START_OF_LONG_GLYPH))
  .skip(spaces)
  .map((words) => ({ type: "inside long glyph", words }) as const);
const combinedGlyphsToken = combinedGlyphs
  .skip(spaces)
  .map((words) => ({ type: "combined glyphs", words }) as const);
const wordToken = word.map((word) => ({ type: "word", word }) as const);

export const token = choiceOnlyOne<Token>(
  xAlaX,
  multipleA,
  choice<Token>(longWord, wordToken),
  properWords,
  // UCSUR only
  spaceLongGlyph,
  headedLongGlyphStart,
  combinedGlyphsToken,
  // starting with non-words:
  punctuation,
  cartouches,
  headlessLongGlyphEnd,
  headedLongGlyphEnd,
  headlessLongGlyphStart,
  insideLongGlyph,
);
