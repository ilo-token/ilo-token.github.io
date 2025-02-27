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
const spaces = sourceOnly(
  sequence(spacesWithoutNewline, choice(nothing, newline)),
);
const latinWord = match(/[a-z][a-zA-Z]*/, "word").skip(spaces);
const variationSelector = match(/[\uFE00-\uFE0F]/, "variation selector");
const ucsur = match(UCSUR_CHARACTER_REGEX, "UCSUR glyph")
  .map((ucsur) => UCSUR_TO_LATIN.get(ucsur)!);
function specificSpecialUcsur(specialUcsur: string): Parser<string> {
  return matchString(
    specialUcsur,
    SPECIAL_UCSUR_DESCRIPTIONS.get(specialUcsur)!,
  );
}
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
  .map<Token>((words) => ({ type: "proper word", words, kind: "latin" }));
function specificWord(thatWord: string): Parser<string> {
  return word.filter((thisWord) => {
    if (thatWord === thisWord) {
      return true;
    } else {
      throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
    }
  });
}
const multipleA = sequence(
  specificWord("a"),
  count(allAtLeastOnce(specificWord("a"))),
)
  .map<Token>(([_, count]) => ({ type: "multiple a", count: count + 1 }));

const repeatingLetter = match(/[a-zA-Z]/, "latin letter")
  .then((letter) =>
    count(allAtLeastOnce(matchString(letter))).map<[string, number]>(
      (count) => [letter, count + 1],
    )
  );
const longWord = allAtLeastOnce(repeatingLetter)
  .skip(spaces)
  .map<Token & { type: "long word" }>((letters) => {
    const word = letters.map(([letter]) => letter).join("");
    const length = letters.reduce((rest, [_, count]) => rest + count, 0) -
      word.length + 1;
    return { type: "long word", word, length };
  })
  .filter(({ length }) => length > 1);

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
const cartouche = sequence(
  specificSpecialUcsur(START_OF_CARTOUCHE).skip(spaces),
  allAtLeastOnce(cartoucheElement),
  specificSpecialUcsur(END_OF_CARTOUCHE).skip(spaces),
)
  .map(([_, words]) => {
    const word = words.join("");
    return `${word[0].toUpperCase()}${word.slice(1)}`;
  });
const cartouches = allAtLeastOnce(cartouche)
  .map((words) => words.join(" "))
  .map<Token>((words) => ({
    type: "proper word",
    words,
    kind: "cartouche",
  }));
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
const longSpaceContainer = longContainer(
  START_OF_LONG_GLYPH,
  END_OF_LONG_GLYPH,
  spacesWithoutNewline.map((space) => space.length),
)
  .skip(spaces);
const longGlyphHead = choiceOnlyOne(
  combinedGlyphs,
  ucsur.map((word) => [word]),
);
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

export const token = choiceOnlyOne(
  xAlaX,
  multipleA,
  choice(longWord, wordToken),
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
