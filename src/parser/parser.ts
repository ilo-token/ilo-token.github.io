import { memoize } from "@std/cache/memoize";
import {
  contentWordSet,
  fillerSet,
  numeralSet,
  prepositionSet,
  preverbSet,
  tokiPonaWordSet,
} from "../dictionary.ts";
import { nullableAsArray, throwError } from "../../misc/misc.ts";
import {
  Clause,
  ContextClause,
  Emphasis,
  Filler,
  HeadedWordUnit,
  Modifier,
  MultiplePhrases,
  MultipleSentences,
  Nanpa,
  Phrase,
  Predicate,
  Preposition,
  Sentence,
  SimpleHeadedWordUnit,
  SimpleWordUnit,
} from "./ast.ts";
import { cache } from "./cache.ts";
import { everyWordUnitInSentence } from "./extract.ts";
import {
  CLAUSE_RULE,
  CONTEXT_CLAUSE_RULE,
  filter,
  MODIFIER_RULES,
  MULTIPLE_MODIFIERS_RULES,
  MULTIPLE_SENTENCES_RULE,
  NANPA_RULES,
  PHRASE_RULE,
  PREPOSITION_RULE,
  SENTENCE_RULE,
  WORD_UNIT_RULES,
} from "./filter.ts";
import { token } from "./lexer.ts";
import {
  choice,
  choiceOnlyOne,
  count,
  empty,
  end,
  everything,
  lazy,
  lookAhead,
  many,
  manyAtLeastOnce,
  match,
  optional,
  Parser,
  sequence,
  UnexpectedError,
  UnrecognizedError,
} from "./parser_lib.ts";
import { describe, Token } from "./token.ts";

const spaces = match(/\s*/, "spaces");

Parser.startCache(cache);

const specificToken = memoize(
  <T extends Token["type"]>(type: T): Parser<Token & { type: T }> => {
    return token.map((token) =>
      token.type === type
        ? token as Token & { type: T }
        : throwError(new UnexpectedError(describe(token), type))
    );
  },
);
const punctuation = specificToken("punctuation")
  .map(({ punctuation }) => punctuation);
const comma = punctuation
  .filter((punctuation) =>
    punctuation === "," ||
    throwError(new UnexpectedError(`"${punctuation}"`, "comma"))
  );
const optionalComma = optional(comma);
const word = specificToken("word").map(({ word }) => word);
const properWords = specificToken("proper word").map(({ words }) => words);
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word.filter((word) =>
    set.has(word) ||
    throwError(new UnrecognizedError(`"${word}" as ${description}`))
  );
}
const specificWord = memoize((thatWord: string) =>
  word.filter((thisWord) =>
    thatWord === thisWord ||
    throwError(new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`))
  )
);
function filterCombinedGlyphs(
  words: ReadonlyArray<string>,
  expected: string,
): boolean {
  const description = `"${expected}"`;
  if (words.length !== 1) {
    throw new UnexpectedError(
      describe({ type: "combined glyphs", words }),
      description,
    );
  } else if (words[0] !== "a") {
    throw new UnexpectedError(`"${word}"`, description);
  } else {
    return true;
  }
}
const emphasis = choice<Emphasis>(
  specificToken("space long glyph")
    .filter(({ words }) => filterCombinedGlyphs(words, "a"))
    .map<Emphasis>(({ spaceLength }) => ({
      type: "long word",
      word: "a",
      length: spaceLength,
    })),
  specificToken("long word")
    .map(({ word, length }) =>
      word === "a"
        ? { type: "long word", word, length }
        : throwError(new UnexpectedError(`"${word}"`, '"a"'))
    ),
  specificWord("a").map((word) => ({ type: "word", word })),
);
const optionalEmphasis = optional(emphasis);
function xAlaX(
  useWord: Set<string>,
  description: string,
): Parser<SimpleWordUnit & { type: "x ala x" }> {
  return choice<SimpleWordUnit & { type: "x ala x" }>(
    specificToken("headless long glyph start")
      .with(wordFrom(useWord, description))
      .skip(
        specificToken("inside long glyph")
          .filter(({ words }) => filterCombinedGlyphs(words, "ala")),
      )
      .then((word) =>
        specificWord(word)
          .skip(specificToken("headless long glyph end"))
          .map(() => ({ type: "x ala x", word }))
      ),
    specificToken("x ala x")
      .map(({ word }) => ({ type: "x ala x", word })),
    word
      .then((word) =>
        sequence(specificWord("ala"), specificWord(word))
          .map(() => ({ type: "x ala x", word }))
      ),
  );
}
function simpleWordUnit(
  word: Set<string>,
  description: string,
): Parser<SimpleHeadedWordUnit> {
  return choice<SimpleHeadedWordUnit>(
    wordFrom(word, description)
      .then((word) =>
        count(manyAtLeastOnce(specificWord(word)))
          .map((count) => ({
            type: "reduplication",
            word,
            count: count + 1,
          }))
      ),
    xAlaX(word, description),
    wordFrom(word, description)
      .map((word) => ({ type: "default", word })),
  );
}
function wordUnit(
  word: Set<string>,
  description: string,
): Parser<HeadedWordUnit> {
  return sequence(
    simpleWordUnit(word, description),
    optionalEmphasis,
  )
    .map(([wordUnit, emphasis]) => ({
      ...wordUnit,
      emphasis,
    }))
    .filter(filter(WORD_UNIT_RULES));
}
function binaryWords(
  word: Set<string>,
  description: string,
): Parser<readonly [bottom: string, top: string]> {
  return specificToken("combined glyphs").map(({ words }) => {
    if (words.length > 2) {
      throw new UnrecognizedError(`combined glyphs of ${words.length} words`);
    } else if (!word.has(words[0])) {
      throw new UnrecognizedError(`"${words[0]}" as ${description}`);
    } else if (!contentWordSet.has(words[1])) {
      throw new UnrecognizedError(`"${words[1]}" as content word`);
    } else {
      return words as [string, string];
    }
  });
}
function optionalCombined(
  word: Set<string>,
  description: string,
): Parser<readonly [headWord: HeadedWordUnit, modifier: null | Modifier]> {
  return choice<readonly [HeadedWordUnit, null | Modifier]>(
    wordUnit(word, description)
      .map((wordUnit) => [wordUnit, null]),
    binaryWords(word, description)
      .map<readonly [HeadedWordUnit, null | Modifier]>(([first, second]) => [
        { type: "default", word: first, emphasis: null },
        {
          type: "default",
          word: { type: "default", word: second, emphasis: null },
        },
      ]),
  );
}
const number = manyAtLeastOnce(wordFrom(numeralSet, "numeral"));
const phrase: Parser<Phrase> = lazy(() =>
  choice<Phrase>(
    sequence(
      number,
      optionalEmphasis,
      modifiers,
      optionalEmphasis,
    )
      .map(([words, wordModifier, modifiers, phraseModifier]) => ({
        type: "default",
        headWord: { type: "number", words, emphasis: wordModifier },
        modifiers,
        emphasis: phraseModifier,
      })),
    binaryWords(preverbSet, "preverb").map(([preverb, phrase]) => ({
      type: "preverb",
      preverb: { type: "default", word: preverb, emphasis: null },
      modifiers: [],
      phrase: {
        type: "default",
        headWord: { type: "default", word: phrase, emphasis: null },
        modifiers: [],
        emphasis: null,
      },
      emphasis: null,
    })),
    sequence(
      optionalCombined(preverbSet, "preverb"),
      modifiers,
      phrase,
      optionalEmphasis,
    )
      .map(([[preverb, modifier], modifiers, phrase, emphasis]) => ({
        type: "preverb",
        preverb,
        modifiers: [...nullableAsArray(modifier), ...modifiers],
        phrase,
        emphasis,
      })),
    preposition
      .map((preposition) => ({ ...preposition, type: "preposition" })),
    sequence(
      optionalCombined(contentWordSet, "content word"),
      modifiers,
      optionalEmphasis,
    )
      .map(([[headWord, modifier], modifiers, emphasis]) => ({
        type: "default",
        headWord,
        modifiers: [...nullableAsArray(modifier), ...modifiers],
        emphasis,
      })),
  )
    .filter(filter(PHRASE_RULE))
);
const nanpa = sequence(wordUnit(new Set(["nanpa"]), '"nanpa"'), phrase)
  .map<Nanpa>(([nanpa, phrase]) => ({ nanpa, phrase }))
  .filter(filter(NANPA_RULES));
const pi = choice(
  specificToken("headed long glyph start")
    .filter(({ words }) => filterCombinedGlyphs(words, "pi"))
    .with(phrase)
    .skip(specificToken("headless long glyph end")),
  specificWord("pi").with(phrase),
);
const modifiers = sequence(
  many(
    choice(
      sequence(number, optionalEmphasis)
        .map<Modifier>(([words, emphasis]) => ({
          type: "default",
          word: { type: "number", words, emphasis },
        }))
        .filter(filter(MODIFIER_RULES)),
      wordUnit(contentWordSet, "modifier")
        .map<Modifier>((word) => ({ type: "default", word }))
        .filter(filter(MODIFIER_RULES)),
      properWords
        .map<Modifier>((words) => ({ type: "proper words", words }))
        .filter(filter(MODIFIER_RULES)),
    ),
  ),
  many(nanpa.map<Modifier>((nanpa) => ({ ...nanpa, type: "nanpa" }))),
  many(
    pi
      .map<Modifier>((phrase) => ({ type: "pi", phrase }))
      .filter(filter(MODIFIER_RULES)),
  ),
)
  .sortBy(([_, nanpaModifiers]) => -nanpaModifiers.length)
  .map(([modifiers, nanpaModifiers, piModifiers]) => [
    ...modifiers,
    ...nanpaModifiers,
    ...piModifiers,
  ])
  .filter(filter(MULTIPLE_MODIFIERS_RULES));
const singlePhrase = phrase
  .map<MultiplePhrases>((phrase) => ({ type: "single", phrase }));
const longAnu = sequence(
  specificToken("headless long glyph start").with(phrase),
  manyAtLeastOnce(
    specificToken("inside long glyph")
      .filter(({ words }) => filterCombinedGlyphs(words, "anu"))
      .with(phrase),
  ),
)
  .skip(specificToken("headless long glyph end"))
  .map(([phrase, morePhrase]) => [phrase, ...morePhrase]);
function nestedPhrasesOnly(
  nestingRule: ReadonlyArray<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return singlePhrase;
  } else {
    const [first, ...rest] = nestingRule;
    const type = first === "anu" ? "anu" : "and conjunction";
    const longAnuParser = type === "anu"
      ? longAnu.map<MultiplePhrases>((phrases) => ({
        type: "anu",
        phrases: phrases.map((phrase) => ({ type: "single", phrase })),
      }))
      : empty;
    return choice(
      longAnuParser,
      sequence(
        nestedPhrases(rest),
        manyAtLeastOnce(
          optionalComma
            .with(specificWord(first))
            .with(nestedPhrases(rest)),
        ),
      )
        .map(([group, moreGroups]) => ({
          type,
          phrases: [group, ...moreGroups],
        })),
    );
  }
}
function nestedPhrases(
  nestingRule: ReadonlyArray<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return singlePhrase;
  } else {
    return choice(
      nestedPhrasesOnly(nestingRule),
      nestedPhrases(nestingRule.slice(1)),
    );
  }
}
const subjectPhrases = choice(
  nestedPhrasesOnly(["en", "anu"]),
  nestedPhrasesOnly(["anu", "en"]),
  singlePhrase,
);
const preposition = choice<Preposition>(
  specificToken("headless long glyph start")
    .with(phrase)
    .skip(specificToken("headless long glyph end"))
    .map((phrase) => ({
      preposition: {
        type: "default",
        word: "lon",
        emphasis: null,
      },
      modifiers: [],
      phrases: { type: "single", phrase },
      emphasis: null,
    })),
  sequence(
    specificToken("headed long glyph start")
      .map(({ words }) => {
        if (words.length > 2) {
          throw new UnrecognizedError(
            `combined glyphs of ${words.length} words`,
          );
        } else {
          const [word] = words;
          if (!prepositionSet.has(word)) {
            throw new UnrecognizedError(`"${word}" as preposition`);
          } else {
            return words;
          }
        }
      }),
    phrase,
  )
    .skip(specificToken("headless long glyph end"))
    .map<Preposition>(([words, phrase]) => {
      const modifiers = words
        .slice(1)
        .map<Modifier>((word) => ({
          type: "default",
          word: { type: "default", word, emphasis: null },
          emphasis: null,
        }));
      return {
        preposition: { type: "default", word: words[0], emphasis: null },
        modifiers,
        phrases: { type: "single", phrase, emphasis: null },
        emphasis: null,
      };
    }),
  binaryWords(prepositionSet, "preposition").map(([preposition, phrase]) => ({
    preposition: {
      type: "default",
      word: preposition,
      emphasis: null,
    },
    modifiers: [],
    phrases: {
      type: "single",
      phrase: {
        type: "default",
        headWord: {
          type: "default",
          word: phrase,
          emphasis: null,
        },
        modifiers: [],
        emphasis: null,
      },
    },
    emphasis: null,
  })),
  sequence(
    optionalCombined(prepositionSet, "preposition"),
    modifiers,
    nestedPhrases(["anu"]) as Parser<
      MultiplePhrases & { type: "single" | "anu" }
    >,
    optionalEmphasis,
  )
    .map<Preposition>((
      [[preposition, modifier], modifiers, phrases, emphasis],
    ) => ({
      preposition,
      modifiers: [...nullableAsArray(modifier), ...modifiers],
      phrases,
      emphasis,
    })),
)
  .filter(filter(PREPOSITION_RULE));
function associatedPredicates(
  nestingRule: ReadonlyArray<"li" | "o" | "anu">,
): Parser<Predicate> {
  return sequence(
    nestedPhrasesOnly(nestingRule),
    optional(
      optionalComma
        .with(specificWord("e"))
        .with(nestedPhrases(["e", "anu"])),
    ),
    many(optionalComma.with(preposition)),
  )
    .map<Predicate & { type: "associated" }>((
      [predicates, objects, prepositions],
    ) => ({
      type: "associated",
      predicates,
      objects,
      prepositions,
    }))
    .filter(({ objects, prepositions }) =>
      objects != null || prepositions.length > 0
    )
    .sortBy(({ prepositions }) => -prepositions.length);
}
function multiplePredicates(
  nestingRule: ReadonlyArray<"li" | "o" | "anu">,
): Parser<Predicate> {
  if (nestingRule.length === 0) {
    return choice<Predicate>(
      associatedPredicates([]),
      phrase.map((predicate) => ({ type: "single", predicate })),
    );
  } else {
    const [first, ...rest] = nestingRule;
    const type = first === "anu" ? "anu" : "and conjunction";
    const longAnuParser = type === "anu"
      ? longAnu.map<Predicate>((phrases) => ({
        type: "anu",
        predicates: phrases.map((predicate) => ({ type: "single", predicate })),
      }))
      : empty;
    return choice<Predicate>(
      longAnuParser,
      associatedPredicates(nestingRule),
      sequence(
        choice(
          associatedPredicates(nestingRule),
          multiplePredicates(rest),
        ),
        manyAtLeastOnce(
          optionalComma
            .with(specificWord(first))
            .with(
              choice(
                associatedPredicates(nestingRule),
                multiplePredicates(rest),
              ),
            ),
        ),
      )
        .map(([group, moreGroups]) => ({
          type,
          predicates: [group, ...moreGroups],
        })),
      multiplePredicates(rest),
    );
  }
}
const liPredicates = multiplePredicates(["li", "anu"]);
const oPredicates = multiplePredicates(["o", "anu"]);
const clause = choice<Clause>(
  sequence(
    wordFrom(new Set(["mi", "sina"]), "mi/sina subject"),
    liPredicates,
  )
    .map(([subject, predicates]) => ({
      type: "li clause",
      subjects: {
        type: "single",
        phrase: {
          type: "default",
          headWord: {
            type: "default",
            word: subject,
            emphasis: null,
          },
          modifiers: [],
          emphasis: null,
        },
      },
      predicates,
      explicitLi: false,
    })),
  sequence(
    preposition,
    many(optionalComma.with(preposition)),
  )
    .map(
      ([preposition, morePreposition]) => [preposition, ...morePreposition],
    )
    .sortBy((prepositions) => -prepositions.length)
    .map((prepositions) => ({
      type: "prepositions",
      prepositions,
    })),
  subjectPhrases
    .map((phrases) => ({ type: "phrases", phrases })),
  subjectPhrases
    .skip(specificWord("o"))
    .map((phrases) => ({ type: "o vocative", phrases })),
  sequence(
    subjectPhrases,
    optionalComma
      .with(specificWord("li"))
      .with(liPredicates),
  )
    .map(([subjects, predicates]) => ({
      type: "li clause",
      subjects,
      predicates,
      explicitLi: true,
    })),
  specificWord("o")
    .with(oPredicates)
    .map((predicates) => ({ type: "o clause", subjects: null, predicates })),
  sequence(
    subjectPhrases,
    optionalComma
      .with(specificWord("o"))
      .with(oPredicates),
  )
    .map(([subjects, predicates]) => ({
      type: "o clause",
      subjects,
      predicates,
    })),
)
  .filter(filter(CLAUSE_RULE));
const contextClause = choice<ContextClause>(
  nanpa.map((nanpa) => ({ ...nanpa, type: "nanpa" })),
  wordUnit(new Set(["anu"]), '"anu"').map((anu) => ({ type: "anu", anu })),
  clause,
)
  .filter(filter(CONTEXT_CLAUSE_RULE));
const la = choice(
  comma.with(specificWord("la")),
  specificWord("la").skip(comma),
  specificWord("la"),
);
const filler = choice<Filler>(
  specificToken("space long glyph")
    .map(({ words, spaceLength }) =>
      words.length === 1
        ? {
          type: "long word",
          word: words[0],
          length: spaceLength,
        }
        : throwError(
          new UnexpectedError(
            describe({ type: "combined glyphs", words: words }),
            "simple glyph",
          ),
        )
    ),
  specificToken("multiple a")
    .map(({ count }) => ({ type: "multiple a", count })),
  specificToken("long word")
    .map(({ word, length }) =>
      fillerSet.has(word)
        ? { type: "long word", word, length }
        : throwError(new UnrecognizedError(`"${word}" as filler`))
    ),
  wordFrom(fillerSet, "filler")
    .map((word) => ({ type: "word", word })),
);
const seme = wordUnit(new Set(["seme"]), '"seme"');
const anuSeme = choice(
  specificToken("headed long glyph start")
    .filter(({ words }) => filterCombinedGlyphs(words, "anu"))
    .with(seme)
    .skip(specificToken("headless long glyph end")),
  optionalComma
    .with(specificWord("anu"))
    .with(seme),
);
const sentence = choice<Sentence>(
  sequence(
    optional(
      wordUnit(new Set(["taso", "kin", "anu"]), "taso/kin/anu")
        .skip(optionalComma),
    ),
    many(contextClause.skip(la)),
    clause,
    optional(anuSeme),
    optionalEmphasis,
    choice(
      punctuation,
      end.map(() => ""),
      lookAhead(sequence(manyAtLeastOnce(filler), choice(punctuation, end)))
        .map(() => ""),
    ),
  )
    .map<Sentence & { type: "default" }>(
      (
        [
          startingParticle,
          laClauses,
          finalClause,
          anuSeme,
          emphasis,
          punctuation,
        ],
      ) => {
        const sentence: Sentence & { type: "default" } = {
          type: "default",
          startingParticle,
          laClauses,
          finalClause,
          anuSeme,
          emphasis,
          punctuation,
          interrogative: null,
        };
        const wordUnits = everyWordUnitInSentence(sentence);
        const interrogative = wordUnits.some(({ type }) => type === "x ala x")
          ? "x ala x"
          : wordUnits.some((wordUnit) =>
              (wordUnit.type === "default" ||
                wordUnit.type === "reduplication") &&
              wordUnit.word === "seme"
            )
          ? "seme"
          : null;
        return { ...sentence, interrogative };
      },
    )
    .sortBy(({ anuSeme }) => anuSeme == null ? 1 : 0),
  sequence(filler, optional(punctuation))
    .map(([filler, punctuation]) => ({
      type: "filler",
      filler,
      punctuation: punctuation ?? "",
      interrogative: null,
    })),
)
  .filter(filter(SENTENCE_RULE));
export const parse = spaces
  .with(
    lookAhead(everything.filter((src) =>
      src.trimEnd().length <= 500 ||
      throwError(new UnrecognizedError("long text"))
    )),
  )
  .with(choiceOnlyOne<MultipleSentences>(
    wordFrom(tokiPonaWordSet, "Toki Pona word")
      .skip(end)
      .map((word) => ({ type: "single word", word })),
    manyAtLeastOnce(sentence)
      .skip(end)
      .filter(filter(MULTIPLE_SENTENCES_RULE))
      .map((sentences) => ({ type: "sentences", sentences })),
  ))
  .parser();

Parser.endCache();
