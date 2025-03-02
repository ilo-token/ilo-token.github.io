import { sumOf } from "@std/collections/sum-of";
import { ArrayResult } from "../array-result.ts";
import {
  contentWordSet,
  dictionary,
  fillerSet,
  MissingEntryError,
  prepositionSet,
  preverbSet,
  tokiPonaWordSet,
} from "../dictionary.ts";
import { nullableAsArray } from "../misc.ts";
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
} from "./parser-lib.ts";
import { describe, Token } from "./token.ts";

const spaces = match(/\s*/, "spaces");

Parser.startCache(cache);

function specificToken<T extends Token["type"]>(
  type: T,
): Parser<Token & { type: T }> {
  return token.map((token) => {
    if (token.type === type) {
      return token as Token & { type: T };
    } else {
      throw new UnexpectedError(describe(token), type);
    }
  });
}
const punctuation = specificToken("punctuation")
  .map(({ punctuation }) => punctuation);
const comma = punctuation
  .filter((punctuation) => {
    if (punctuation === ",") {
      return true;
    } else {
      throw new UnexpectedError(`"${punctuation}"`, "comma");
    }
  });
const optionalComma = optional(comma);
const word = specificToken("word").map(({ word }) => word);
const properWords = specificToken("proper word").map(({ words }) => words);
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word.filter((word) => {
    if (set.has(word)) {
      return true;
    } else {
      throw new UnrecognizedError(`"${word}" as ${description}`);
    }
  });
}
function specificWord(thatWord: string): Parser<string> {
  return word.filter((thisWord) => {
    if (thatWord === thisWord) {
      return true;
    } else {
      throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
    }
  });
}
const emphasis = choice<Emphasis>(
  specificToken("space long glyph")
    .map((longGlyph) => {
      if (longGlyph.words.length !== 1) {
        throw new UnexpectedError(
          describe({ type: "combined glyphs", words: longGlyph.words }),
          '"a"',
        );
      }
      const word = longGlyph.words[0];
      if (word !== "a") {
        throw new UnexpectedError(`"${word}"`, '"a"');
      }
      return {
        type: "long word",
        word,
        length: longGlyph.spaceLength,
      };
    }),
  specificToken("long word")
    .map(({ word, length }) => {
      if (word !== "a") {
        throw new UnexpectedError(`"${word}"`, '"a"');
      }
      return { type: "long word", word, length };
    }),
  specificWord("a").map((word) => ({ type: "word", word })),
);
const optionalEmphasis = optional(emphasis);
function xAlaX(
  useWord: Set<string>,
  description: string,
): Parser<SimpleWordUnit & { type: "x ala x" }> {
  return choice<SimpleWordUnit & { type: "x ala x" }>(
    sequence(
      specificToken("headless long glyph start"),
      wordFrom(useWord, description),
      specificToken("inside long glyph")
        .filter((words) => {
          if (words.words.length !== 1) {
            throw new UnexpectedError(
              describe({ type: "combined glyphs", words: words.words }),
              '"ala"',
            );
          }
          if (words.words[0] !== "ala") {
            throw new UnexpectedError(`"${words.words[0]}"`, '"ala"');
          }
          return true;
        }),
    )
      .then(([_, word]) =>
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
    sequence(
      wordFrom(word, description)
        .then((word) =>
          count(manyAtLeastOnce(specificWord(word)))
            .map<[string, number]>((count) => [word, count + 1])
        ),
    )
      .map(([[word, count]]) => ({
        type: "reduplication",
        word,
        count,
      })),
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
): Parser<[string, string]> {
  return specificToken("combined glyphs").map(({ words }) => {
    if (words.length > 2) {
      throw new UnrecognizedError(
        `combined glyphs of ${words.length} words`,
      );
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
): Parser<[HeadedWordUnit, null | Modifier]> {
  return choice<[HeadedWordUnit, null | Modifier]>(
    wordUnit(word, description)
      .map((wordUnit) => [wordUnit, null]),
    binaryWords(word, description)
      .map<[HeadedWordUnit, null | Modifier]>(([first, second]) => [
        { type: "default", word: first, emphasis: null },
        {
          type: "default",
          word: { type: "default", word: second, emphasis: null },
        },
      ]),
  );
}
function wordToNumber(word: string): number {
  const num = dictionary.get(word)
    ?.definitions
    .filter((definition) => definition.type === "numeral")[0]
    ?.numeral;
  if (num == null) {
    throw new MissingEntryError("numeral", word);
  }
  return num;
}
const subAleNumber = sequence(
  many(specificWord("mute")),
  many(specificWord("luka")),
  many(specificWord("tu")),
  many(specificWord("wan")),
)
  .map((array) => array.flat())
  .map((array) => sumOf(array, wordToNumber));
const properSubAleNumber = subAleNumber.filter((number) => {
  if (number > 100) {
    throw new UnrecognizedError(
      'numbers after "ale" exceeding 100 in nasin nanpa pona',
    );
  } else {
    return true;
  }
});
const ale = choice(specificWord("ale"), specificWord("ali"));
const number = choice(
  specificWord("ala").map(() => 0),
  sequence(
    manyAtLeastOnce(
      sequence(
        properSubAleNumber
          .filter((number) => number !== 0),
        count(manyAtLeastOnce(ale)),
      ),
    ),
    properSubAleNumber,
  )
    .map<Array<[number, number]>>(([rest, last]) => [...rest, [last, 0]])
    // Ensure the ale is in decreasing order
    .filter((numbers) => {
      const sorted = numbers.every((number, i) => {
        if (i === numbers.length - 1) {
          return true;
        } else {
          const [_, firstAle] = number;
          const [_1, secondAle] = numbers[i + 1];
          return firstAle > secondAle;
        }
      });
      if (sorted) {
        return true;
      } else {
        throw new UnrecognizedError(
          'unordered "ale" places in nasin nanpa pona',
        );
      }
    })
    .map((numbers) => sumOf(numbers, ([sub, ale]) => sub * 100 ** ale)),
  sequence(
    count(many(ale)),
    subAleNumber,
  )
    .map(([ale, sub]) => ale * 100 + sub)
    .filter((number) => number !== 0),
);
const phrase: Parser<Phrase> = lazy(() =>
  choice<Phrase>(
    sequence(
      number,
      optionalEmphasis,
      modifiers,
      optionalEmphasis,
    )
      .map(([number, wordModifier, modifiers, phraseModifier]) => ({
        type: "default",
        headWord: { type: "number", number, emphasis: wordModifier },
        modifiers,
        emphasis: phraseModifier,
      })),
    binaryWords(preverbSet, "preveb").map(([preverb, phrase]) => ({
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
  sequence(
    specificToken("headed long glyph start")
      .filter((words) => {
        if (words.words.length !== 1) {
          throw new UnexpectedError(
            describe({ type: "combined glyphs", words: words.words }),
            "pi",
          );
        }
        if (words.words[0] !== "pi") {
          throw new UnexpectedError(`"${words.words[0]}"`, "pi");
        }
        return true;
      }),
    phrase,
    specificToken("headless long glyph end"),
  )
    .map(([_, phrase]) => phrase),
  specificWord("pi").with(phrase),
);
const modifiers = sequence(
  many(
    choice(
      sequence(number, optionalEmphasis)
        .map<Modifier>(([number, emphasis]) => ({
          type: "default",
          word: { type: "number", number, emphasis },
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
      .filter((words) => {
        if (words.words.length !== 1) {
          throw new UnexpectedError(
            describe({ type: "combined glyphs", words: words.words }),
            "pi",
          );
        }
        if (words.words[0] !== "anu") {
          throw new UnexpectedError(`"${words.words[0]}"`, "anu");
        }
        return true;
      })
      .with(phrase),
  ),
)
  .skip(specificToken("headless long glyph end"))
  .map(([phrase, morePhrase]) => [phrase, ...morePhrase]);
function nestedPhrasesOnly(
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return singlePhrase;
  } else {
    const [first, ...rest] = nestingRule;
    let type: "and conjunction" | "anu";
    if (["en", "li", "o", "e"].includes(first)) {
      type = "and conjunction";
    } else {
      type = "anu";
    }
    let longAnuParser: Parser<MultiplePhrases>;
    if (first === "anu") {
      longAnuParser = longAnu.map((phrases) => ({
        type: "anu",
        phrases: phrases.map((phrase) => ({ type: "single", phrase })),
      }));
    } else {
      longAnuParser = empty;
    }
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
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
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
  sequence(
    specificToken("headless long glyph start"),
    phrase,
    specificToken("headless long glyph end"),
  )
    .map(([_, phrase]) => ({
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
      .map((words) => {
        if (words.words.length > 2) {
          throw new UnrecognizedError(
            `combined glyphs of ${words.words.length} words`,
          );
        }
        const word = words.words[0];
        if (!prepositionSet.has(word)) {
          throw new UnrecognizedError(`"${word}" as preposition`);
        }
        return words.words;
      }),
    phrase,
    specificToken("headless long glyph end"),
  )
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
  nestingRule: Array<"li" | "o" | "anu">,
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
    .filter(([_, objects, prepositions]) =>
      objects != null || prepositions.length > 0
    )
    .sortBy(([_, _1, prepositions]) => -prepositions.length)
    .map(([predicates, objects, prepositions]) => ({
      type: "associated",
      predicates,
      objects,
      prepositions,
    }));
}
function multiplePredicates(
  nestingRule: Array<"li" | "o" | "anu">,
): Parser<Predicate> {
  if (nestingRule.length === 0) {
    return choice<Predicate>(
      associatedPredicates([]),
      phrase.map((predicate) => ({ type: "single", predicate })),
    );
  } else {
    const [first, ...rest] = nestingRule;
    let type: "and conjunction" | "anu";
    if (first === "li" || first === "o") {
      type = "and conjunction";
    } else {
      type = "anu";
    }
    let longAnuParser: Parser<Predicate>;
    if (first === "anu") {
      longAnuParser = longAnu.map((phrases) => ({
        type: "anu",
        predicates: phrases.map((predicate) => ({ type: "single", predicate })),
      }));
    } else {
      longAnuParser = empty;
    }
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
const clause = choice<Clause>(
  sequence(
    wordFrom(new Set(["mi", "sina"]), "mi/sina subject"),
    multiplePredicates(["li", "anu"]),
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
          alaQuestion: false,
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
    .filter((phrases) =>
      phrases.type !== "single" || phrases.phrase.type !== "quotation"
    )
    .map((phrases) => ({ type: "phrases", phrases })),
  subjectPhrases
    .skip(specificWord("o"))
    .map((phrases) => ({ type: "o vocative", phrases })),
  sequence(
    subjectPhrases,
    optionalComma
      .with(specificWord("li"))
      .with(multiplePredicates(["li", "anu"])),
  )
    .map(([subjects, predicates]) => ({
      type: "li clause",
      subjects,
      predicates,
      explicitLi: true,
    })),
  specificWord("o")
    .with(multiplePredicates(["o", "anu"]))
    .map((predicates) => ({ type: "o clause", subjects: null, predicates })),
  sequence(
    subjectPhrases,
    optionalComma
      .with(specificWord("o"))
      .with(multiplePredicates(["o", "anu"])),
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
  clause,
);
const la = choice(
  comma.with(specificWord("la")),
  specificWord("la").skip(comma),
  specificWord("la"),
);
const filler = choice<Filler>(
  specificToken("space long glyph")
    .map((longGlyph) => {
      if (longGlyph.words.length !== 1) {
        throw new UnexpectedError(
          describe({ type: "combined glyphs", words: longGlyph.words }),
          '"a"',
        );
      }
      return {
        type: "long word",
        word: longGlyph.words[0],
        length: longGlyph.spaceLength,
      };
    }),
  specificToken("multiple a")
    .map(({ count }) => ({ type: "multiple a", count })),
  specificToken("long word")
    .map(({ word, length }) => {
      if (!fillerSet.has(word)) {
        throw new UnrecognizedError(`"${word}" as filler`);
      }
      return { type: "long word", word, length };
    }),
  wordFrom(fillerSet, "filler")
    .map((word) => ({ type: "word", word })),
);
const sentence = choice<Sentence>(
  sequence(
    optional(
      wordUnit(new Set(["kin", "taso"]), "taso/kin").skip(optionalComma),
    ),
    many(contextClause.skip(la)),
    clause,
    optional(
      optionalComma
        .with(specificWord("anu"))
        .with(wordUnit(new Set(["seme"]), '"seme"')),
    ),
    optionalEmphasis,
    choice(
      punctuation,
      end.map(() => ""),
      lookAhead(sequence(filler, choice(punctuation, end))).map(() => ""),
    ),
  )
    .sortBy(([_, _1, _2, anuSeme]) => {
      if (anuSeme == null) {
        return 1;
      } else {
        return 0;
      }
    })
    .map<Sentence>(
      (
        [
          kinOrTaso,
          laClauses,
          finalClause,
          anuSeme,
          emphasis,
          punctuation,
        ],
      ) => {
        const sentence = {
          type: "default" as const,
          kinOrTaso,
          laClauses,
          finalClause,
          anuSeme,
          emphasis,
          punctuation,
          interrogative: null,
        };
        const wordUnits = everyWordUnitInSentence(sentence);
        let interrogative: null | "x ala x" | "seme" = null;
        if (wordUnits.some((wordUnit) => wordUnit.type === "x ala x")) {
          interrogative = "x ala x";
        } else if (
          wordUnits.some((wordUnit) =>
            (wordUnit.type === "default" ||
              wordUnit.type === "reduplication") &&
            wordUnit.word === "seme"
          )
        ) {
          interrogative = "seme";
        }
        return { ...sentence, interrogative };
      },
    ),
  sequence(filler, optional(punctuation))
    .map(([filler, punctuation]) => ({
      type: "filler",
      filler,
      punctuation: punctuation ?? "",
      interrogative: null,
    })),
)
  .filter(filter(SENTENCE_RULE));
const fullParser = spaces
  .with(choiceOnlyOne<MultipleSentences>(
    wordFrom(tokiPonaWordSet, "Toki Pona word")
      .skip(end)
      .map((word) => ({ type: "single word", word })),
    manyAtLeastOnce(sentence)
      .skip(end)
      .filter(filter(MULTIPLE_SENTENCES_RULE))
      .map((sentences) => ({ type: "sentences", sentences })),
  ));
export function parse(src: string): ArrayResult<MultipleSentences> {
  return ArrayResult.from(() => {
    if (src.trim().length > 500) {
      throw new UnrecognizedError("long text");
    } else {
      return fullParser.parse(src);
    }
  });
}

Parser.endCache();
