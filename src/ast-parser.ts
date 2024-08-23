/** Module for AST Parser. It is responsible for turning an array of token tree into AST. */

import {
  Clause,
  Emphasis,
  everyWordUnitInFullClause,
  FullClause,
  HeadedWordUnit,
  Modifier,
  MultiplePhrases,
  MultiplePredicates,
  MultipleSentences,
  Phrase,
  Preposition,
  Sentence,
  SimpleHeadedWordUnit,
  SimpleWordUnit,
  WordUnit,
} from "./ast.ts";
import { UnexpectedError, UnrecognizedError } from "./error.ts";
import { Output } from "./output.ts";
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
import {
  allAtLeastOnce,
  choice,
  choiceOnlyOne,
  count,
  eol,
  lazy,
  many,
  manyAtLeastOnce,
  optional,
  Parser,
  sequence,
} from "./parser-lib.ts";
import { describe, Token } from "./token.ts";
import { DICTIONARY } from "dictionary/dictionary.ts";
import { spaces, TOKEN } from "./lexer.ts";
import { fs } from "./misc.ts";

const CONTENT_WORD = new Set(
  Object
    .entries(DICTIONARY)
    .filter(([_, definitions]) =>
      definitions
        .some((definition) =>
          definition.type !== "filler" &&
          definition.type !== "particle definition"
        )
    )
    .map(([word]) => word),
);
const PREPOSITION = new Set(
  Object
    .entries(DICTIONARY)
    .filter(([_, definitions]) =>
      definitions.some((definition) => definition.type === "preposition")
    )
    .map(([word]) => word),
);
const PREVERB = new Set(
  Object
    .entries(DICTIONARY)
    .filter(([_, definitions]) =>
      definitions.some((definition) =>
        definition.type === "preverb as finite verb" ||
        definition.type === "preverb as linking verb" ||
        definition.type === "preverb as modal verb"
      )
    )
    .map(([word]) => word),
);
const TOKI_PONA_WORD = new Set(Object.keys(DICTIONARY));

/** Parses a specific type of token. */
function specificToken<T extends Token["type"]>(
  type: T,
): Parser<Token & { type: T }> {
  return TOKEN.map((token) => {
    if (token.type === type) {
      return token as Token & { type: T };
    } else {
      throw new UnexpectedError(describe(token), type);
    }
  });
}
/** Parses comma. */
function comma(): Parser<string> {
  return specificToken("punctuation")
    .map(({ punctuation }) => punctuation)
    .filter((punctuation) => punctuation === ",");
}
/** Parses an optional comma. */
function optionalComma(): Parser<null | string> {
  return optional(comma());
}
/** Parses a toki pona word. */
function word(): Parser<string> {
  return specificToken("word").map(({ word }) => word);
}
/** Parses proper words spanning multiple words. */
function properWords(): Parser<string> {
  return specificToken("proper word").map(({ words }) => words);
}
/** Parses a toki pona */
function punctuation(): Parser<string> {
  return specificToken("punctuation").map(({ punctuation }) => punctuation);
}
/** Parses word only from `set`. */
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word().filter((word) => {
    if (set.has(word)) {
      return true;
    } else {
      throw new UnrecognizedError(fs`"${word}" as ${description}`);
    }
  });
}
/** Parses a specific word. */
function specificWord(thatWord: string): Parser<string> {
  return word().filter((thisWord) => {
    if (thatWord === thisWord) return true;
    else throw new UnexpectedError(fs`"${thisWord}"`, fs`"${thatWord}"`);
  });
}
/** Parses an emphasis particle. */
function emphasis(): Parser<Emphasis> {
  return choice(
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
          throw new UnexpectedError(fs`"${word}"`, '"a" or "n"');
        }
        return {
          type: "long word",
          word,
          length: longGlyph.spaceLength,
        } as Emphasis;
      }),
    specificToken("multiple a")
      .map(({ count }) => ({ type: "multiple a", count }) as Emphasis),
    specificToken("long word")
      .map(({ word, length }) =>
        ({ type: "long word", word, length }) as Emphasis
      ),
    wordFrom(new Set(["a", "n"]), "a/n")
      .map((word) => ({ type: "word", word }) as Emphasis),
  );
}
function optionalEmphasis(): Parser<null | Emphasis> {
  return optional(emphasis());
}
/** Parses an X ala X construction. */
function xAlaX(
  word: Set<string>,
  description: string,
): Parser<SimpleWordUnit & { type: "x ala x" }> {
  return choice(
    sequence(
      specificToken("headless long glyph start"),
      wordFrom(CONTENT_WORD, "content word"),
      specificToken("inside long glyph")
        .filter((words) => {
          if (words.words.length !== 1) {
            throw new UnexpectedError(
              describe({ type: "combined glyphs", words: words.words }),
              '"ala"',
            );
          }
          if (words.words[0] !== "ala") {
            throw new UnexpectedError(fs`"${words.words[0]}"`, '"ala"');
          }
          return true;
        }),
      wordFrom(CONTENT_WORD, "content word"),
      specificToken("headless long glyph end"),
    )
      .map(([_, left, _1, right]) => {
        if (!word.has(left)) {
          throw new UnrecognizedError(fs`${left} as ${description}`);
        } else if (left !== right) {
          throw new UnexpectedError(fs`${right}`, fs`"${left}"`);
        } else {
          return { type: "x ala x", word: left } as WordUnit & {
            type: "x ala x";
          };
        }
      }),
    specificToken("x ala x")
      .map(({ word }) =>
        ({ type: "x ala x", word }) as WordUnit & { type: "x ala x" }
      ),
  );
}
function simpleWordUnit(
  word: Set<string>,
  description: string,
): Parser<SimpleHeadedWordUnit> {
  return choice(
    sequence(
      wordFrom(word, description)
        .then((word) =>
          count(manyAtLeastOnce(specificWord(word)))
            .map((count) => [word, count + 1] as [string, number])
        ),
    )
      .map(([[word, count]]) =>
        ({
          type: "reduplication",
          word,
          count,
        }) as SimpleHeadedWordUnit
      ),
    xAlaX(word, description),
    wordFrom(word, description)
      .map((word) => ({ type: "default", word }) as SimpleHeadedWordUnit),
  );
}
/** Parses word unit except numbers. */
function wordUnit(
  word: Set<string>,
  description: string,
): Parser<HeadedWordUnit> {
  return sequence(
    simpleWordUnit(word, description),
    optionalEmphasis(),
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
        fs`combined glyphs of ${`${words.length}`} words`,
      );
    } else if (!word.has(words[0])) {
      throw new UnrecognizedError(fs`"${words[0]}" as ${description}`);
    } else if (!CONTENT_WORD.has(words[1])) {
      throw new UnrecognizedError(fs`"${words[1]}" as content word`);
    } else {
      return words as [string, string];
    }
  });
}
/** Parses a word unit or a combined glyphs. */
function optionalCombined(
  word: Set<string>,
  description: string,
): Parser<[WordUnit, Array<Modifier>]> {
  return choice(
    wordUnit(word, description)
      .map((wordUnit) => [wordUnit, []] as [WordUnit, Array<Modifier>]),
    binaryWords(word, description)
      .map(([first, second]) =>
        [
          { type: "default", word: first },
          [{
            type: "default",
            word: { type: "default", word: second },
          }],
        ] as [WordUnit, Array<Modifier>]
      ),
  );
}
function wordToNumber(word: string): number {
  return DICTIONARY[word]
    .filter((definition) => definition.type === "numeral")[0]
    .numeral;
}
/** Parses number words in order other than "ale" and "ala". This can parse
 * nothing and return 0.
 */
function subAleNumber(): Parser<number> {
  return sequence(
    many(specificWord("mute")),
    many(specificWord("luka")),
    many(specificWord("tu")),
    many(specificWord("wan")),
  )
    .map((array) => array.flat())
    .map((array) =>
      array.reduce((number, word) => number + wordToNumber(word), 0)
    );
}
/** Parses "ale" or "ali". */
function ale(): Parser<string> {
  return choice(specificWord("ale"), specificWord("ali"));
}
/** Parses number words including "nasin nanpa pona". */
function number(): Parser<number> {
  return choice(
    specificWord("ala").map(() => 0),
    sequence(
      manyAtLeastOnce(
        sequence(
          subAleNumber().filter((number) => number !== 0),
          count(manyAtLeastOnce(ale())),
        ),
      ),
      subAleNumber(),
    )
      .map(([rest, last]) =>
        [...rest, [last, 0]].reduce(
          (result, [sub, ale]) => result + sub * 100 ** ale,
          0,
        )
      ),
    sequence(
      count(many(ale())),
      subAleNumber(),
    )
      .map(([ale, sub]) => ale * 100 + sub)
      .filter((number) => number !== 0),
  );
}
/** Parses a "pi" construction. */
function pi(): Parser<Modifier & { type: "pi" }> {
  return choice(
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
            throw new UnexpectedError(fs`"${words.words[0]}"`, "pi");
          }
          return true;
        }),
      phrase(),
      specificToken("headless long glyph end"),
    )
      .map(([_, phrase]) => phrase),
    specificWord("pi").with(phrase()),
  )
    .map((phrase) => ({ type: "pi", phrase }) as Modifier & { type: "pi" })
    .filter(filter(MODIFIER_RULES));
}
/** Parses multiple modifiers. */
function modifiers(): Parser<Array<Modifier>> {
  return sequence(
    many(
      choice(
        sequence(number(), optionalEmphasis())
          .map(([number, emphasis]) =>
            ({
              type: "default",
              word: { type: "number", number, emphasis },
            }) as Modifier
          )
          .filter(filter(MODIFIER_RULES)),
        wordUnit(CONTENT_WORD, "modifier")
          .map((word) => ({ type: "default", word }) as Modifier)
          .filter(filter(MODIFIER_RULES)),
        properWords()
          .map((words) => ({ type: "proper words", words }) as Modifier)
          .filter(filter(MODIFIER_RULES)),
      ),
    ),
    many(
      sequence(wordUnit(new Set(["nanpa"]), '"nanpa"'), phrase())
        .map(([nanpa, phrase]) =>
          ({ type: "nanpa", nanpa, phrase }) as Modifier
        )
        .filter(filter(MODIFIER_RULES)),
    ),
    many(pi()),
  )
    .sortBy(([_, nanpaModifiers, _1]) => -nanpaModifiers.length)
    .map(([modifiers, nanpaModifiers, piModifiers]) => [
      ...modifiers,
      ...nanpaModifiers,
      ...piModifiers,
    ])
    .filter(filter(MULTIPLE_MODIFIERS_RULES));
}
/** Parses phrases. */
function phrase_(): Parser<Phrase> {
  return choice(
    sequence(
      number(),
      optionalEmphasis(),
      modifiers(),
      optionalEmphasis(),
    )
      .map(([number, wordModifier, modifiers, phraseModifier]) =>
        ({
          type: "default",
          headWord: { type: "number", number, emphasis: wordModifier },
          modifiers,
          emphasis: phraseModifier,
        }) as Phrase
      ),
    binaryWords(PREVERB, "preveb").map(([preverb, phrase]) =>
      ({
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
      }) as Phrase
    ),
    sequence(
      optionalCombined(PREVERB, "preverb"),
      modifiers(),
      phrase(),
      optionalEmphasis(),
    )
      .map(([[preverb, modifier], modifiers, phrase, emphasis]) =>
        ({
          type: "preverb",
          preverb,
          modifiers: [...modifier, ...modifiers],
          phrase,
          emphasis,
        }) as Phrase
      ),
    preposition()
      .map((preposition) =>
        ({ ...preposition, type: "preposition" }) as Phrase
      ),
    sequence(
      optionalCombined(CONTENT_WORD, "content word"),
      modifiers(),
      optionalEmphasis(),
    )
      .map(([[headWord, modifier], modifiers, emphasis]) =>
        ({
          type: "default",
          headWord,
          modifiers: [...modifier, ...modifiers],
          emphasis,
        }) as Phrase
      ),
  )
    .filter(filter(PHRASE_RULE));
}
function phrase(): Parser<Phrase> {
  return lazy(phrase_);
}
/**
 * Parses nested phrases with given nesting rule, only accepting the top level
 * operation.
 */
function nestedPhrasesOnly(
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return phrase()
      .map((phrase) => ({ type: "single", phrase }) as MultiplePhrases);
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
        optionalComma()
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
    return phrase()
      .map((phrase) => ({ type: "single", phrase }) as MultiplePhrases);
  } else {
    return choice(
      nestedPhrasesOnly(nestingRule),
      nestedPhrases(nestingRule.slice(1)),
    );
  }
}
/** Parses phrases separated by "en" or "anu". */
function subjectPhrases(): Parser<MultiplePhrases> {
  return choice(
    nestedPhrasesOnly(["en", "anu"]),
    nestedPhrasesOnly(["anu", "en"]),
    phrase().map((phrase) => ({ type: "single", phrase })),
  );
}
/** Parses prepositional phrase. */
function preposition(): Parser<Preposition> {
  return choice(
    sequence(
      specificToken("headless long glyph start"),
      phrase(),
      specificToken("headless long glyph end"),
    )
      .map(([_, phrase]) =>
        ({
          preposition: {
            type: "default",
            word: "lon",
            emphasis: null,
          },
          modifiers: [],
          phrases: { type: "single", phrase },
          emphasis: null,
        }) as Preposition
      ),
    sequence(
      specificToken("headed long glyph start")
        .map((words) => {
          if (words.words.length > 2) {
            throw new UnrecognizedError(
              fs`combined glyphs of ${`${words.words.length}`} words`,
            );
          }
          const word = words.words[0];
          if (!PREPOSITION.has(word)) {
            throw new UnrecognizedError(fs`"${word}" as preposition`);
          }
          return words.words;
        }),
      phrase(),
      specificToken("headless long glyph end"),
    )
      .map(([words, phrase]) => {
        const modifiers = words
          .slice(1)
          .map((word) =>
            ({ type: "default", word: { type: "default", word } }) as Modifier
          );
        return {
          preposition: { type: "default", word: words[0] },
          modifiers,
          phrases: { type: "single", phrase },
        } as Preposition;
      }),
    binaryWords(PREPOSITION, "preposition").map(([preposition, phrase]) =>
      ({
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
      }) as Preposition
    ),
    sequence(
      optionalCombined(PREPOSITION, "preposition"),
      modifiers(),
      nestedPhrases(["anu"]),
      optionalEmphasis(),
    )
      .map(([[preposition, modifier], modifiers, phrases, emphasis]) =>
        ({
          preposition,
          modifiers: [...modifier, ...modifiers],
          phrases,
          emphasis,
        }) as Preposition
      ),
  )
    .filter(filter(PREPOSITION_RULE));
}
/**
 * Parses associated predicates whose predicates only uses top level operator.
 */
function associatedPredicates(
  nestingRule: Array<"li" | "o" | "anu">,
): Parser<MultiplePredicates> {
  return sequence(
    nestedPhrasesOnly(nestingRule),
    optional(
      optionalComma()
        .with(specificWord("e"))
        .with(nestedPhrases(["e", "anu"])),
    ),
    many(optionalComma().with(preposition())),
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
): Parser<MultiplePredicates> {
  if (nestingRule.length === 0) {
    return choice(
      associatedPredicates([]),
      phrase().map((predicate) =>
        ({ type: "single", predicate }) as MultiplePredicates
      ),
    );
  } else {
    const [first, ...rest] = nestingRule;
    let type: "and conjunction" | "anu";
    if (first === "li" || first === "o") {
      type = "and conjunction";
    } else {
      type = "anu";
    }
    return choice(
      associatedPredicates(nestingRule),
      sequence(
        choice(
          associatedPredicates(nestingRule),
          multiplePredicates(rest),
        ),
        manyAtLeastOnce(
          optionalComma()
            .with(specificWord(first))
            .with(
              choice(
                associatedPredicates(nestingRule),
                multiplePredicates(rest),
              ),
            ),
        ),
      )
        .map(([group, moreGroups]) =>
          ({ type, predicates: [group, ...moreGroups] }) as MultiplePredicates
        ),
      multiplePredicates(rest),
    );
  }
}
/** Parses a single clause. */
function clause(): Parser<Clause> {
  return choice(
    sequence(
      wordFrom(new Set(["mi", "sina"]), "mi/sina subject"),
      multiplePredicates(["li", "anu"]),
    )
      .map(([subject, predicates]) =>
        ({
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
        }) as Clause
      ),
    sequence(
      preposition(),
      many(optionalComma().with(preposition())),
    )
      .map(([preposition, morePreposition]) =>
        ({
          type: "prepositions",
          prepositions: [preposition, ...morePreposition],
        }) as Clause
      ),
    subjectPhrases()
      .filter((phrases) =>
        phrases.type !== "single" || phrases.phrase.type !== "quotation"
      )
      .map((phrases) => ({ type: "phrases", phrases }) as Clause),
    subjectPhrases()
      .skip(specificWord("o"))
      .map((phrases) => ({ type: "o vocative", phrases }) as Clause),
    sequence(
      subjectPhrases(),
      optionalComma()
        .with(specificWord("li"))
        .with(multiplePredicates(["li", "anu"])),
    )
      .map(([subjects, predicates]) =>
        ({
          type: "li clause",
          subjects,
          predicates,
          explicitLi: true,
        }) as Clause
      ),
    specificWord("o")
      .with(multiplePredicates(["o", "anu"]))
      .map((predicates) =>
        ({ type: "o clause", subjects: null, predicates }) as Clause
      ),
    sequence(
      subjectPhrases(),
      optionalComma()
        .with(specificWord("o"))
        .with(multiplePredicates(["o", "anu"])),
    )
      .map(([subjects, predicates]) =>
        ({ type: "o clause", subjects, predicates }) as Clause
      ),
  )
    .filter(filter(CLAUSE_RULE));
}
/** Parses a single clause including preclause and postclause. */
function fullClause(): Parser<FullClause> {
  return choice(
    sequence(
      optional(emphasis().skip(optionalComma())),
      optional(
        wordUnit(new Set(["kin", "taso"]), "taso/kin").skip(optionalComma()),
      ),
      clause(),
      optional(
        optionalComma()
          .with(specificWord("anu"))
          .with(wordUnit(new Set(["seme"]), '"seme"')),
      ),
      optional(optionalComma().with(emphasis())),
    )
      .map(([startingParticle, kinOrTaso, clause, anuSeme, endingParticle]) =>
        ({
          type: "default",
          startingParticle,
          kinOrTaso,
          clause,
          anuSeme,
          endingParticle,
        }) as FullClause
      )
      .sort((clause) => {
        if ((clause as FullClause & { type: "default" }).anuSeme == null) {
          return 1;
        } else {
          return 0;
        }
      }),
    emphasis()
      .map((emphasis) => ({ type: "filler", emphasis }) as FullClause),
  )
    .filter(filter(FULL_CLAUSE_RULE));
}
/** parses "la" with optional comma around. */
function la(): Parser<string> {
  return choice(
    comma().with(specificWord("la")),
    specificWord("la").skip(comma()),
    specificWord("la"),
  );
}
/** Parses a single full sentence with optional punctuations. */
function sentence(): Parser<Sentence> {
  return sequence(
    many(fullClause().skip(la())),
    fullClause(),
    choice(
      eol().map(() => ""),
      punctuation(),
    ),
  )
    .map(([laClauses, finalClause, punctuation]) => {
      const wordUnits = [...laClauses, finalClause]
        .flatMap(everyWordUnitInFullClause);
      let interrogative = null;
      if (wordUnits.some((wordUnit) => wordUnit.type === "x ala x")) {
        interrogative = "x ala x" as const;
      } else if (
        wordUnits.some((wordUnit) =>
          (wordUnit.type === "default" || wordUnit.type === "reduplication") &&
          wordUnit.word === "seme"
        )
      ) {
        interrogative = "seme" as const;
      }
      return {
        laClauses,
        finalClause,
        interrogative,
        punctuation,
      };
    })
    .filter(filter(SENTENCE_RULE));
}
/** A multiple sentence parser for final parser. */
const FULL_PARSER = spaces()
  .with(choiceOnlyOne(
    wordFrom(TOKI_PONA_WORD, "Toki Pona word")
      .skip(eol())
      .map((word) => ({ type: "single word", word }) as MultipleSentences),
    allAtLeastOnce(sentence())
      .skip(eol())
      .filter(filter(MULTIPLE_SENTENCES_RULE))
      .map((sentences) =>
        ({ type: "sentences", sentences }) as MultipleSentences
      ),
  ));
/** Turns string into Toki Pona AST. */
export function parse(src: string): Output<MultipleSentences> {
  if (/\n/.test(src.trim())) {
    return new Output(new UnrecognizedError("multiline text"));
  }
  return FULL_PARSER.parse(src);
}
