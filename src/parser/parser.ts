import { memoize } from "@std/cache/memoize";
import {
  contentWordSet,
  fillerSet,
  numeralSet,
  prepositionSet,
  preverbSet,
  tokiPonaWordSet,
} from "../dictionary.ts";
import { lazy as lazyEval, nullableAsArray, throwError } from "../misc/misc.ts";
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
} from "./ast.ts";
import { everyWordUnitInSentence } from "./extract.ts";
import {
  CLAUSE_RULES,
  CONTEXT_CLAUSE_RULES,
  filter,
  MODIFIER_RULES,
  MULTIPLE_MODIFIERS_RULES,
  MULTIPLE_SENTENCES_RULES,
  NANPA_RULES,
  PHRASE_RULES,
  PREPOSITION_RULES,
  SENTENCE_RULES,
  WORD_UNIT_RULES,
} from "./filter.ts";
import { token } from "./lexer.ts";
import {
  allRest,
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
} from "./parser_lib.ts";
import { describe, Token } from "./token.ts";

const spaces = match(/\s*/, "spaces");

const specificToken = memoize(
  <T extends Token["type"]>(type: T) =>
    token.map((token) =>
      token.type === type
        ? token as Token & { type: T }
        : throwError(new UnexpectedError(describe(token), type))
    ),
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
const properWords = specificToken("name").map(({ words }) => words);

function wordFrom(set: Set<string>, description: string) {
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
function filterCombinedGlyphs(words: ReadonlyArray<string>, expected: string) {
  const description = `"${expected}"`;
  if (words.length !== 1) {
    throw new UnexpectedError(
      describe({ type: "combined glyphs", words }),
      description,
    );
  } else if (words[0] !== expected) {
    throw new UnexpectedError(`"${word}"`, description);
  } else {
    return true;
  }
}
const emphasis = choice(
  specificToken("space long glyph")
    .filter(({ words }) => filterCombinedGlyphs(words, "a"))
    .map(({ spaceLength }): Emphasis => ({
      type: "long word",
      word: "a",
      length: spaceLength,
    })),
  specificToken("long word")
    .map(({ word, length }): Emphasis =>
      word === "a"
        ? { type: "long word", word, length }
        : throwError(new UnexpectedError(`"${word}"`, '"a"'))
    ),
  specificWord("a").map((word): Emphasis => ({ type: "word", word })),
);
const optionalEmphasis = optional(emphasis);

const alaXLongGlyph = memoize((word: string) =>
  specificWord(word)
    .skip(specificToken("headless long glyph end"))
    .map((): SimpleHeadedWordUnit => ({ type: "x ala x", word }))
);
const alaX = memoize((word: string) =>
  sequence(specificWord("ala"), specificWord(word))
    .map((): SimpleHeadedWordUnit => ({ type: "x ala x", word }))
);
function xAlaX(useWord: Set<string>, description: string) {
  return choice(
    specificToken("headless long glyph start")
      .with(wordFrom(useWord, description))
      .skip(
        specificToken("inside long glyph")
          .filter(({ words }) => filterCombinedGlyphs(words, "ala")),
      )
      .then(alaXLongGlyph),
    word
      .then(alaX),
  );
}
const reduplicateRest = memoize((word: string) =>
  count(manyAtLeastOnce(specificWord(word)))
    .map((count): SimpleHeadedWordUnit => ({
      type: "reduplication",
      word,
      count: count + 1,
    }))
);
function simpleWordUnit(word: Set<string>, description: string) {
  return choice(
    wordFrom(word, description)
      .then(reduplicateRest),
    xAlaX(word, description),
    wordFrom(word, description)
      .map((word): SimpleHeadedWordUnit => ({ type: "simple", word })),
  );
}
function wordUnit(word: Set<string>, description: string) {
  return sequence(
    simpleWordUnit(word, description),
    optionalEmphasis,
  )
    .map(([wordUnit, emphasis]): HeadedWordUnit => ({
      ...wordUnit,
      emphasis,
    }))
    .filter(filter(WORD_UNIT_RULES));
}
function binaryWords(word: Set<string>, description: string) {
  return specificToken("combined glyphs").map(({ words }) => {
    if (words.length > 2) {
      throw new UnrecognizedError(`combined glyphs of ${words.length} words`);
    } else if (!word.has(words[0])) {
      throw new UnrecognizedError(`"${words[0]}" as ${description}`);
    } else if (!contentWordSet.has(words[1])) {
      throw new UnrecognizedError(`"${words[1]}" as content word`);
    } else {
      return words as readonly [bottom: string, top: string];
    }
  });
}
type Combined = readonly [HeadedWordUnit, null | Modifier];
function optionalCombined(word: Set<string>, description: string) {
  return choice(
    wordUnit(word, description)
      .map((wordUnit): Combined => [wordUnit, null]),
    binaryWords(word, description)
      .map(([first, second]): Combined => [
        { type: "simple", word: first, emphasis: null },
        {
          type: "simple",
          word: { type: "simple", word: second, emphasis: null },
        },
      ]),
  );
}
const number = manyAtLeastOnce(wordFrom(numeralSet, "numeral"));
const phrase: Parser<Phrase> = lazy(lazyEval(() =>
  choice(
    sequence(
      number,
      optionalEmphasis,
      modifiers,
      optionalEmphasis,
    )
      .map(([words, wordModifier, modifiers, phraseModifier]): Phrase => ({
        type: "simple",
        headWord: { type: "number", words, emphasis: wordModifier },
        modifiers,
        emphasis: phraseModifier,
      })),
    binaryWords(preverbSet, "preverb").map(([preverb, phrase]): Phrase => ({
      type: "preverb",
      preverb: { type: "simple", word: preverb, emphasis: null },
      modifiers: [],
      phrase: {
        type: "simple",
        headWord: { type: "simple", word: phrase, emphasis: null },
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
      .map(([[preverb, modifier], modifiers, phrase, emphasis]): Phrase => ({
        type: "preverb",
        preverb,
        modifiers: [...nullableAsArray(modifier), ...modifiers],
        phrase,
        emphasis,
      })),
    preposition
      .map((preposition): Phrase => ({ ...preposition, type: "preposition" })),
    sequence(
      optionalCombined(contentWordSet, "content word"),
      modifiers,
      optionalEmphasis,
    )
      .map(([[headWord, modifier], modifiers, emphasis]): Phrase => ({
        type: "simple",
        headWord,
        modifiers: [...nullableAsArray(modifier), ...modifiers],
        emphasis,
      })),
  )
    .filter(filter(PHRASE_RULES))
));
const nanpa = sequence(wordUnit(new Set(["nanpa"]), '"nanpa"'), phrase)
  .map(([nanpa, phrase]): Nanpa => ({ nanpa, phrase }))
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
        .map(([words, emphasis]): Modifier => ({
          type: "simple",
          word: { type: "number", words, emphasis },
        }))
        .filter(filter(MODIFIER_RULES)),
      wordUnit(contentWordSet, "modifier")
        .map((word): Modifier => ({ type: "simple", word }))
        .filter(filter(MODIFIER_RULES)),
      properWords
        .map((words): Modifier => ({ type: "name", words }))
        .filter(filter(MODIFIER_RULES)),
    ),
  ),
  many(nanpa.map((nanpa): Modifier => ({ ...nanpa, type: "nanpa" }))),
  many(
    pi
      .map((phrase): Modifier => ({ type: "pi", phrase }))
      .filter(filter(MODIFIER_RULES)),
  ),
)
  .map(([modifiers, nanpaModifiers, piModifiers]) => [
    ...modifiers,
    ...nanpaModifiers,
    ...piModifiers,
  ])
  .filter(filter(MULTIPLE_MODIFIERS_RULES))
  .sortBy((modifiers) =>
    -modifiers.filter(({ type }) => type === "nanpa").length
  );
const singlePhrase = phrase
  .map((phrase): MultiplePhrases => ({ type: "simple", phrase }));
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
) {
  if (nestingRule.length === 0) {
    return singlePhrase;
  } else {
    const [first, ...rest] = nestingRule;
    const type = first === "anu" ? "anu" : "and";
    const longAnuParser = type === "anu"
      ? longAnu.map((phrases): MultiplePhrases => ({
        type: "anu",
        phrases: phrases.map((phrase): MultiplePhrases => ({
          type: "simple",
          phrase,
        })),
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
        .map(([group, moreGroups]): MultiplePhrases => ({
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
const preposition = choice(
  specificToken("headless long glyph start")
    .with(phrase)
    .skip(specificToken("headless long glyph end"))
    .map((phrase): Preposition => ({
      preposition: {
        type: "simple",
        word: "lon",
        emphasis: null,
      },
      modifiers: [],
      phrases: { type: "simple", phrase },
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
    .map(([words, phrase]): Preposition => {
      const modifiers = words
        .slice(1)
        .map((word): Modifier => ({
          type: "simple",
          word: { type: "simple", word, emphasis: null },
        }));
      return {
        preposition: { type: "simple", word: words[0], emphasis: null },
        modifiers,
        phrases: { type: "simple", phrase },
        emphasis: null,
      };
    }),
  binaryWords(prepositionSet, "preposition")
    .map(([preposition, phrase]): Preposition => ({
      preposition: {
        type: "simple",
        word: preposition,
        emphasis: null,
      },
      modifiers: [],
      phrases: {
        type: "simple",
        phrase: {
          type: "simple",
          headWord: {
            type: "simple",
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
      MultiplePhrases & { type: "simple" | "anu" }
    >,
    optionalEmphasis,
  )
    .map(
      (
        [[preposition, modifier], modifiers, phrases, emphasis],
      ): Preposition => ({
        preposition,
        modifiers: [...nullableAsArray(modifier), ...modifiers],
        phrases,
        emphasis,
      }),
    ),
)
  .filter(filter(PREPOSITION_RULES));

function associatedPredicates(nestingRule: ReadonlyArray<"li" | "o" | "anu">) {
  return sequence(
    nestedPhrasesOnly(nestingRule),
    optional(
      optionalComma
        .with(specificWord("e"))
        .with(nestedPhrases(["e", "anu"])),
    ),
    many(optionalComma.with(preposition)),
  )
    .map(
      (
        [predicates, objects, prepositions],
      ): Predicate & { type: "associated" } => ({
        type: "associated",
        predicates,
        objects,
        prepositions,
      }),
    )
    .filter(({ objects, prepositions }) =>
      objects != null || prepositions.length > 0
    )
    .sortBy(({ prepositions }) => -prepositions.length);
}
function multiplePredicates(
  nestingRule: ReadonlyArray<"li" | "o" | "anu">,
): Parser<Predicate> {
  if (nestingRule.length === 0) {
    return choice(
      associatedPredicates([]),
      phrase.map((predicate): Predicate => ({ type: "simple", predicate })),
    );
  } else {
    const [first, ...rest] = nestingRule;
    const type = first === "anu" ? "anu" : "and";
    const longAnuParser: Parser<Predicate> = type === "anu"
      ? longAnu.map((phrases): Predicate => ({
        type: "anu",
        predicates: phrases.map((predicate): Predicate => ({
          type: "simple",
          predicate,
        })),
      }))
      : empty;
    return choice(
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
        .map(([group, moreGroups]): Predicate => ({
          type,
          predicates: [group, ...moreGroups],
        })),
      multiplePredicates(rest),
    );
  }
}
const liPredicates = multiplePredicates(["li", "anu"]);
const oPredicates = multiplePredicates(["o", "anu"]);
const clause = choice(
  sequence(
    wordFrom(new Set(["mi", "sina"]), "mi/sina subject"),
    liPredicates,
  )
    .map(([subject, predicates]): Clause => ({
      type: "li clause",
      subjects: {
        type: "simple",
        phrase: {
          type: "simple",
          headWord: {
            type: "simple",
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
  subjectPhrases
    .map((phrases): Clause => ({ type: "phrases", phrases })),
  subjectPhrases
    .skip(specificWord("o"))
    .map((phrases): Clause => ({ type: "o vocative", phrases })),
  sequence(
    subjectPhrases,
    optionalComma
      .with(specificWord("li"))
      .with(liPredicates),
  )
    .map(([subjects, predicates]): Clause => ({
      type: "li clause",
      subjects,
      predicates,
      explicitLi: true,
    })),
  specificWord("o")
    .with(oPredicates)
    .map((predicates): Clause => ({
      type: "o clause",
      subjects: null,
      predicates,
    })),
  sequence(
    subjectPhrases,
    optionalComma
      .with(specificWord("o"))
      .with(oPredicates),
  )
    .map(([subjects, predicates]): Clause => ({
      type: "o clause",
      subjects,
      predicates,
    })),
)
  .filter(filter(CLAUSE_RULES));
const contextClause = choice(
  wordUnit(new Set(["anu"]), '"anu"')
    .map((anu): ContextClause => ({ type: "anu", anu })),
  nanpa.map((nanpa): ContextClause => ({ ...nanpa, type: "nanpa" })),
  sequence(
    preposition,
    many(optionalComma.with(preposition)),
  )
    .map(([preposition, morePreposition]) => [preposition, ...morePreposition])
    .sortBy((prepositions) => -prepositions.length)
    .map((prepositions): ContextClause => ({
      type: "prepositions",
      prepositions,
    })),
  clause,
)
  .filter(filter(CONTEXT_CLAUSE_RULES));
const la = choice(
  comma.with(specificWord("la")),
  specificWord("la").skip(comma),
  specificWord("la"),
);
const filler = choice(
  specificToken("space long glyph")
    .map(({ words, spaceLength }): Filler =>
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
  specificToken("reduplicated a")
    .map(({ count }): Filler => ({ type: "reduplicated a", count })),
  specificToken("long word")
    .map(({ word, length }): Filler =>
      fillerSet.has(word)
        ? { type: "long word", word, length }
        : throwError(new UnrecognizedError(`"${word}" as filler`))
    ),
  wordFrom(fillerSet, "filler")
    .map((word): Filler => ({ type: "word", word })),
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
const sentence = choice(
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
    .map(([
      startingParticle,
      contextClauses,
      finalClause,
      anuSeme,
      emphasis,
      punctuation,
    ]): Sentence & { type: "simple" } => {
      const sentence: Sentence & { type: "simple" } = {
        type: "simple",
        startingParticle,
        contextClauses,
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
            (wordUnit.type === "simple" ||
              wordUnit.type === "reduplication") &&
            wordUnit.word === "seme"
          )
        ? "seme"
        : null;
      return { ...sentence, interrogative };
    })
    .sortBy(({ anuSeme }) => anuSeme == null ? 1 : 0),
  sequence(filler, optional(punctuation))
    .map(([filler, punctuation]): Sentence => ({
      type: "filler",
      filler,
      punctuation: punctuation ?? "",
      interrogative: null,
    })),
)
  .filter(filter(SENTENCE_RULES));
export const parser: Parser<MultipleSentences> = spaces
  .with(
    lookAhead(allRest.filter((source) =>
      source.trimEnd().length <= 500 ||
      throwError(new UnrecognizedError("long text"))
    )),
  )
  .with(choiceOnlyOne(
    wordFrom(tokiPonaWordSet, "Toki Pona word")
      .skip(end)
      .map((word): MultipleSentences => ({ type: "single word", word })),
    manyAtLeastOnce(sentence)
      .skip(end)
      .filter(filter(MULTIPLE_SENTENCES_RULES))
      .map((sentences): MultipleSentences => ({
        type: "sentences",
        sentences,
      })),
  ));
