/**
 * Module for AST Parser. It is responsible for turning an array of token tree
 * into AST.
 */

import { ArrayResult } from "../array-result.ts";
import {
  contentWordSet,
  dictionary,
  MissingEntryError,
  prepositionSet,
  preverbSet,
  tokiPonaWordSet,
} from "../dictionary.ts";
import { nullableAsArray } from "../misc.ts";
import {
  Clause,
  Emphasis,
  FullClause,
  HeadedWordUnit,
  Modifier,
  MultiplePhrases,
  MultipleSentences,
  Phrase,
  Predicate,
  Preposition,
  SimpleHeadedWordUnit,
  SimpleWordUnit,
} from "./ast.ts";
import { CACHE } from "./cache.ts";
import { everyWordUnitInFullClause } from "./extract.ts";
import {
  CLAUSE_RULE,
  filter,
  FULL_CLAUSE_RULE,
  MODIFIER_RULES,
  MULTIPLE_MODIFIERS_RULES,
  MULTIPLE_SENTENCES_RULE,
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
  end,
  lazy,
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

Parser.startCache(CACHE);

/** Parses a specific type of token. */
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
/** Parses comma. */
const comma = specificToken("punctuation")
  .map(({ punctuation }) => punctuation)
  .filter((punctuation) => punctuation === ",");
/** Parses an optional comma. */
const optionalComma = optional(comma);
/** Parses a toki pona word. */
const word = specificToken("word").map(({ word }) => word);
/** Parses proper words spanning multiple words. */
const properWords = specificToken("proper word").map(({ words }) => words);
/** Parses a toki pona */
const punctuation = specificToken("punctuation").map(({ punctuation }) =>
  punctuation
);
/** Parses word only from `set`. */
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word.filter((word) => {
    if (set.has(word)) {
      return true;
    } else {
      throw new UnrecognizedError(`"${word}" as ${description}`);
    }
  });
}
/** Parses a specific word. */
function specificWord(thatWord: string): Parser<string> {
  return word.filter((thisWord) => {
    if (thatWord === thisWord) {
      return true;
    } else {
      throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
    }
  });
}
/** Parses an emphasis particle. */
const emphasis = choice<Emphasis>(
  specificToken("space long glyph")
    .map((longGlyph) => {
      if (longGlyph.words.length !== 1) {
        throw new UnexpectedError(
          describe({ type: "combined glyphs", words: longGlyph.words }),
          '"ala"',
        );
      }
      const word = longGlyph.words[0];
      if (word !== "n" && word !== "a") {
        throw new UnexpectedError(`"${word}"`, '"a" or "n"');
      }
      return {
        type: "long word",
        word,
        length: longGlyph.spaceLength,
      };
    }),
  specificToken("multiple a")
    .map(({ count }) => ({ type: "multiple a", count })),
  specificToken("long word")
    .map(({ word, length }) => ({ type: "long word", word, length })),
  wordFrom(new Set(["a", "n"]), "a/n")
    .map((word) => ({ type: "word", word })),
);
const optionalEmphasis = optional(emphasis);
/** Parses an X ala X construction. */
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
/** Parses word unit except numbers. */
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
/** Parses a binary combined glyphs. */
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
/** Parses a word unit or a combined glyphs. */
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
/** Parses number words in order other than "ale" and "ala". This can parse
 * nothing and return 0.
 */
const subAleNumber = sequence(
  many(specificWord("mute")),
  many(specificWord("luka")),
  many(specificWord("tu")),
  many(specificWord("wan")),
)
  .map((array) => array.flat())
  .map((array) =>
    array.reduce((number, word) => number + wordToNumber(word), 0)
  );
const properSubAleNumber = subAleNumber.filter((number) => {
  if (number > 100) {
    throw new UnrecognizedError(
      'numbers after "ale" exceeding 100 in nasin nanpa pona',
    );
  } else {
    return true;
  }
});
/** Parses "ale" or "ali". */
const ale = choice(specificWord("ale"), specificWord("ali"));
/** Parses number words including "nasin nanpa pona". */
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
    .map((numbers) =>
      numbers.reduce((result, [sub, ale]) => result + sub * 100 ** ale, 0)
    ),
  sequence(
    count(many(ale)),
    subAleNumber,
  )
    .map(([ale, sub]) => ale * 100 + sub)
    .filter((number) => number !== 0),
);
/** Parses phrases. */
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
/** Parses a "pi" construction. */
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
/** Parses multiple modifiers. */
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
  many(
    sequence(wordUnit(new Set(["nanpa"]), '"nanpa"'), phrase)
      .map<Modifier>(([nanpa, phrase]) => ({ type: "nanpa", nanpa, phrase }))
      .filter(filter(MODIFIER_RULES)),
  ),
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
/**
 * Parses nested phrases with given nesting rule, only accepting the top level
 * operation.
 */
function nestedPhrasesOnly(
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return phrase
      .map((phrase) => ({ type: "single", phrase }));
  } else {
    const [first, ...rest] = nestingRule;
    let type: "and conjunction" | "anu";
    if (["en", "li", "o", "e"].includes(first)) {
      type = "and conjunction";
    } else {
      type = "anu";
    }
    return sequence(
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
      }));
  }
}
/** Parses nested phrases with given nesting rule. */
function nestedPhrases(
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return phrase
      .map((phrase) => ({ type: "single", phrase }));
  } else {
    return choice(
      nestedPhrasesOnly(nestingRule),
      nestedPhrases(nestingRule.slice(1)),
    );
  }
}
/** Parses phrases separated by "en" or "anu". */
const subjectPhrases = choice(
  nestedPhrasesOnly(["en", "anu"]),
  nestedPhrasesOnly(["anu", "en"]),
  phrase.map<MultiplePhrases>((phrase) => ({ type: "single", phrase })),
);
/** Parses prepositional phrase. */
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
/**
 * Parses associated predicates whose predicates only uses top level operator.
 */
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
/** Parses multiple predicates without "li" nor "o" at the beginning. */
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
    return choice<Predicate>(
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
/** Parses a single clause. */
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
/** Parses a single clause including preclause and postclause. */
const fullClause = choice<FullClause>(
  sequence(
    optional(emphasis.skip(optionalComma)),
    optional(
      wordUnit(new Set(["kin", "taso"]), "taso/kin").skip(optionalComma),
    ),
    clause,
    optional(
      optionalComma
        .with(specificWord("anu"))
        .with(wordUnit(new Set(["seme"]), '"seme"')),
    ),
    optional(optionalComma.with(emphasis)),
  )
    .map<FullClause & { type: "default" }>(
      ([startingParticle, kinOrTaso, clause, anuSeme, endingParticle]) => ({
        type: "default",
        startingParticle,
        kinOrTaso,
        clause,
        anuSeme,
        endingParticle,
      }),
    )
    .sortBy((clause) => {
      if (clause.anuSeme == null) {
        return 1;
      } else {
        return 0;
      }
    }),
  emphasis
    .map((emphasis) => ({ type: "filler", emphasis })),
)
  .filter(filter(FULL_CLAUSE_RULE));
/** parses "la" with optional comma around. */
const la = choice(
  comma.with(specificWord("la")),
  specificWord("la").skip(comma),
  specificWord("la"),
);
/** Parses a single full sentence with optional punctuations. */
const sentence = sequence(
  many(fullClause.skip(la)),
  fullClause,
  choice(
    end.map(() => ""),
    punctuation,
  ),
)
  .map(([laClauses, finalClause, punctuation]) => {
    const wordUnits = [...laClauses, finalClause]
      .flatMap(everyWordUnitInFullClause);
    let interrogative: null | "x ala x" | "seme" = null;
    if (wordUnits.some((wordUnit) => wordUnit.type === "x ala x")) {
      interrogative = "x ala x";
    } else if (
      wordUnits.some((wordUnit) =>
        (wordUnit.type === "default" || wordUnit.type === "reduplication") &&
        wordUnit.word === "seme"
      )
    ) {
      interrogative = "seme";
    }
    return {
      laClauses,
      finalClause,
      interrogative,
      punctuation,
    };
  })
  .filter(filter(SENTENCE_RULE));
const spaces = match(/\s*/, "spaces");
/** A multiple sentence parser for final parser. */
const FULL_PARSER = spaces
  .with(choiceOnlyOne<MultipleSentences>(
    wordFrom(tokiPonaWordSet, "Toki Pona word")
      .skip(end)
      .map((word) => ({ type: "single word", word })),
    manyAtLeastOnce(sentence)
      .skip(end)
      .filter(filter(MULTIPLE_SENTENCES_RULE))
      .map((sentences) => ({ type: "sentences", sentences })),
  ));
/** Turns string into Toki Pona AST. */
export function parse(src: string): ArrayResult<MultipleSentences> {
  return ArrayResult.from(() => {
    if (src.trim().length > 500) {
      throw new UnrecognizedError("long text");
    } else {
      return FULL_PARSER.parse(src);
    }
  });
}

Parser.endCache();
