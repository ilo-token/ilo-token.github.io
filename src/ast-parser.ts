/** Module for AST Parser. It is responsible for turning an array of token trees into AST. */

import {
  Clause,
  Emphasis,
  FullClause,
  Modifier,
  MultiplePhrases,
  MultiplePredicates,
  MultipleSentences,
  Phrase,
  Preposition,
  Quotation,
  Sentence,
  SimpleWordUnit,
  WordUnit,
} from "./ast.ts";
import { UnexpectedError, UnrecognizedError } from "./error.ts";
import { Output } from "./output.ts";
import {
  CONTENT_WORD,
  NUMERAL_DEFINITION,
  PREPOSITION,
  PREVERB,
  TOKI_PONA_WORD,
} from "./dictionary.ts";
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
  all,
  allAtLeastOnce,
  choice,
  choiceOnlyOne,
  count,
  lazy,
  many,
  manyAtLeastOnce,
  optional,
  Parser,
  sequence as rawSequence,
} from "./parser-lib.ts";
import { describe, TokenTree } from "./token-tree.ts";
import { lex } from "./lexer.ts";

export type AstParser<T> = Parser<Array<TokenTree>, T>;

/** Takes all parsers and applies them one after another. */
// Had to redeclare this function, Typescript really struggles with inferring
// types when using `sequence`.
function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: AstParser<T[I]> } & { length: T["length"] }
): AstParser<T> {
  // deno-lint-ignore no-explicit-any
  return rawSequence<Array<TokenTree>, T>(...sequence as any);
}
/** Parses the end of line (or the end of sentence in context of Toki Pona) */
function eol(description: string): AstParser<null> {
  return new Parser((src) => {
    if (src.length === 0) {
      return new Output([{ value: null, rest: [] }]);
    } else {
      return new Output(
        new UnexpectedError(describe(src[0]), description),
      );
    }
  });
}
/** Parses a single token tree. */
function tokenTree(description: string): AstParser<TokenTree> {
  return new Parser((src) => {
    if (src.length === 0) {
      return new Output(new UnexpectedError("end of sentence", description));
    } else {
      return new Output([{ rest: src.slice(1), value: src[0] }]);
    }
  });
}
/** Parses a specific type of token tree. */
function specificTokenTree<T extends TokenTree["type"]>(
  type: T,
): AstParser<TokenTree & { type: T }> {
  return tokenTree(type).map((tokenTree) => {
    if (tokenTree.type === type) {
      return tokenTree as TokenTree & { type: T };
    } else {
      throw new UnexpectedError(describe(tokenTree), type);
    }
  });
}
/** Parses comma. */
function comma(): AstParser<string> {
  return specificTokenTree("punctuation")
    .map(({ punctuation }) => punctuation)
    .filter((punctuation) => punctuation === ",");
}
/** Parses an optional comma. */
function optionalComma(): AstParser<null | string> {
  return optional(comma());
}
/** Parses a toki pona word. */
function word(): AstParser<string> {
  return specificTokenTree("word").map(({ word }) => word);
}
/** Parses proper words spanning multiple words. */
function properWords(): AstParser<string> {
  return specificTokenTree("proper word").map(({ words }) => words);
}
/** Parses a toki pona */
function punctuation(): AstParser<string> {
  return specificTokenTree("punctuation").map(({ punctuation }) => punctuation);
}
/** Parses word only from `set`. */
function wordFrom(set: Set<string>, description: string): AstParser<string> {
  return word().filter((word) => {
    if (set.has(word)) {
      return true;
    } else {
      throw new UnrecognizedError(`"${word}" as ${description}`);
    }
  });
}
/** Parses a specific word. */
function specificWord(thatWord: string): AstParser<string> {
  return word().filter((thisWord) => {
    if (thatWord === thisWord) return true;
    else throw new UnexpectedError(`"${thisWord}"`, `"${thatWord}"`);
  });
}
/** Parses an emphasis particle. */
function emphasis(): AstParser<Emphasis> {
  return choice(
    specificTokenTree("long glyph space").map((longGlyph) => {
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
      } as Emphasis;
    }),
    specificTokenTree("multiple a")
      .map(({ count }) => ({ type: "multiple a", count }) as Emphasis),
    specificTokenTree("long word")
      .map(({ word, length }) =>
        ({ type: "long word", word, length }) as Emphasis
      ),
    wordFrom(new Set(["a", "n"]), "a/n")
      .map((word) => ({ type: "word", word }) as Emphasis),
  );
}
function optionalEmphasis(): AstParser<null | Emphasis> {
  return optional(emphasis());
}
/** Parses a side of long X ala X construction. */
function parseXAlaXSide(tokenTrees: Array<TokenTree>, name: string): TokenTree {
  if (tokenTrees.length !== 1) {
    if (tokenTrees.length === 0) {
      throw new UnexpectedError(name, "long glyph on both sides");
    } else {
      throw new UnexpectedError(
        describe(tokenTrees[0]),
        "end of long glyph",
      );
    }
  }
  return tokenTrees[0];
}
/** Parses an X ala X construction. */
function xAlaX(
  word: Set<string>,
  description: string,
): AstParser<SimpleWordUnit & { type: "x ala x" }> {
  return choice(
    specificTokenTree("long glyph").map((longGlyph) => {
      if (longGlyph.words.length !== 1) {
        throw new UnexpectedError(
          describe({ type: "combined glyphs", words: longGlyph.words }),
          '"ala"',
        );
      }
      if (longGlyph.words[0] !== "ala") {
        throw new UnexpectedError(`"${longGlyph.words[0]}"`, '"ala"');
      }
      const leftGlyph = parseXAlaXSide(longGlyph.before, "backward long glyph");
      if (leftGlyph.type !== "word") {
        throw new UnexpectedError(describe(leftGlyph), "word");
      }
      const { word } = leftGlyph;
      const rightGlyph = parseXAlaXSide(longGlyph.after, "forward long glyph");
      if (rightGlyph.type !== "word" || rightGlyph.word !== word) {
        throw new UnexpectedError(describe(rightGlyph), `"${word}"`);
      }
      return { type: "x ala x", word } as WordUnit & { type: "x ala x" };
    }),
    specificTokenTree("x ala x")
      .map(({ word }) =>
        ({ type: "x ala x", word }) as WordUnit & { type: "x ala x" }
      ),
    wordFrom(word, description)
      .then((word) => specificWord("ala").with(specificWord(word)))
      .map((word) =>
        ({ type: "x ala x", word }) as WordUnit & { type: "x ala x" }
      ),
  );
}
function simpleWordUnit(
  word: Set<string>,
  description: string,
): AstParser<SimpleWordUnit> {
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
        }) as SimpleWordUnit
      ),
    xAlaX(word, description),
    wordFrom(word, description)
      .map((word) => ({ type: "default", word }) as WordUnit),
  );
}
/** Parses word unit except numbers. */
function wordUnit(word: Set<string>, description: string): AstParser<WordUnit> {
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
): AstParser<[string, string]> {
  return specificTokenTree("combined glyphs").map(({ words }) => {
    if (words.length > 2) {
      throw new UnrecognizedError(`combined glyphs of ${words.length} words`);
    } else if (!word.has(words[0])) {
      throw new UnrecognizedError(`"${words[0]}" as ${description}`);
    } else if (!CONTENT_WORD.has(words[1])) {
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
): AstParser<[WordUnit, Array<Modifier>]> {
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
/** Parses number words in order other than "ale" and "ala". This can parse
 * nothing and return 0.
 */
function subAleNumber(): AstParser<number> {
  return sequence(
    many(specificWord("mute")),
    many(specificWord("luka")),
    many(specificWord("tu")),
    many(specificWord("wan")),
  )
    .map((array) => array.flat())
    .map((array) =>
      array.reduce((number, word) => number + NUMERAL_DEFINITION[word], 0)
    );
}
/** Parses "ale" or "ali". */
function ale(): AstParser<string> {
  return choice(specificWord("ale"), specificWord("ali"));
}
/** Parses number words including "nasin nanpa pona". */
function number(): AstParser<number> {
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
function pi(): AstParser<Modifier & { type: "pi" }> {
  return choice(
    specificTokenTree("long glyph").flatMapValue(
      (longGlyph) => {
        if (longGlyph.before.length > 0) {
          return new Output(
            new UnexpectedError("reverse long glyph", "long pi"),
          );
        }
        if (longGlyph.words.length !== 1) {
          return new Output(
            new UnexpectedError(
              describe({ type: "combined glyphs", words: longGlyph.words }),
              "pi",
            ),
          );
        }
        if (longGlyph.words[0] !== "pi") {
          return new Output(
            new UnexpectedError(`"${longGlyph.words[0]}"`, "pi"),
          );
        }
        return INNER_PHRASE_PARSER.parse(longGlyph.after);
      },
    ),
    specificWord("pi").with(phrase()),
  )
    .map((phrase) => ({ type: "pi", phrase }) as Modifier & { type: "pi" })
    .filter(filter(MODIFIER_RULES));
}
/** Parses multiple modifiers. */
function modifiers(): AstParser<Array<Modifier>> {
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
        quotation()
          .map((quotation) => ({ type: "quotation", ...quotation }) as Modifier)
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
/** Phrase parser intended for phrases inside long glyphs. */
const INNER_PHRASE_PARSER = phrase_().skip(eol("end of long glyph"));
/** Parses phrases. */
function phrase_(): AstParser<Phrase> {
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
    quotation()
      .map((quotation) => ({ ...quotation, type: "quotation" }) as Phrase),
  )
    .filter(filter(PHRASE_RULE));
}
function phrase(): AstParser<Phrase> {
  return lazy(phrase_);
}
/**
 * Parses nested phrases with given nesting rule, only accepting the top level
 * operation.
 */
function nestedPhrasesOnly(
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
): AstParser<MultiplePhrases> {
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
): AstParser<MultiplePhrases> {
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
function subjectPhrases(): AstParser<MultiplePhrases> {
  return choice(
    nestedPhrasesOnly(["en", "anu"]),
    nestedPhrasesOnly(["anu", "en"]),
    phrase().map((phrase) => ({ type: "single", phrase })),
  );
}
/** Parses prepositional phrase. */
function preposition(): AstParser<Preposition> {
  return choice(
    specificTokenTree("underline lon")
      .flatMapValue((tokenTrees) => INNER_PHRASE_PARSER.parse(tokenTrees.words))
      .map((phrase) =>
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
    specificTokenTree("long glyph").flatMapValue((tokenTrees) => {
      if (tokenTrees.before.length > 0) {
        return new Output(
          new UnexpectedError("reverse long glyph", "forward long glyph"),
        );
      }
      if (tokenTrees.words.length > 2) {
        return new Output(
          new UnrecognizedError(
            `combined glyphs of ${tokenTrees.words.length} words`,
          ),
        );
      }
      const word = tokenTrees.words[0];
      if (!PREPOSITION.has(word)) {
        return new Output(
          new UnrecognizedError(`"${word}" as preposition`),
        );
      }
      const modifiers = tokenTrees.words
        .slice(1)
        .map((word) =>
          ({ type: "default", word: { type: "default", word } }) as Modifier
        );
      return INNER_PHRASE_PARSER
        .parse(tokenTrees.after)
        .map((phrase) =>
          ({
            preposition: { type: "default", word },
            modifiers,
            phrases: { type: "single", phrase },
          }) as Preposition
        );
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
): AstParser<MultiplePredicates> {
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
): AstParser<MultiplePredicates> {
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
function clause(): AstParser<Clause> {
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
    quotation().map((quotation) =>
      ({ ...quotation, type: "quotation" }) as Clause
    ),
  )
    .filter(filter(CLAUSE_RULE));
}
/** Parses a single clause including preclause and postclause. */
function fullClause(): AstParser<FullClause> {
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
      ),
    emphasis()
      .map((emphasis) => ({ type: "filler", emphasis }) as FullClause),
  )
    .filter(filter(FULL_CLAUSE_RULE));
}
/** parses "la" with optional comma around. */
function la(): AstParser<string> {
  return choice(
    comma().with(specificWord("la")),
    specificWord("la").skip(comma()),
    specificWord("la"),
  );
}
/** Parses a single full sentence with optional punctuations. */
function sentence(): AstParser<Sentence> {
  return sequence(
    many(fullClause().skip(la())),
    fullClause(),
    choice(
      eol("end of sentence").map(() => ""),
      punctuation(),
    ),
  )
    .map(([laClauses, finalClause, punctuation]) => ({
      laClauses,
      finalClause,
      punctuation,
    }))
    .filter(filter(SENTENCE_RULE));
}
/** Parses a sentence inside quotation. */
const INNER_QUOTATION_PARSER = all(sentence())
  .skip(eol("end of sentence"))
  .filter(filter(MULTIPLE_SENTENCES_RULE));
/** Parses a quotation. */
export function quotation(): AstParser<Quotation> {
  return specificTokenTree("quotation").flatMapValue((tokenTree) =>
    INNER_QUOTATION_PARSER
      .parse(tokenTree.tokenTree)
      .map((value) =>
        ({
          sentences: value,
          leftMark: tokenTree.leftMark,
          rightMark: tokenTree.rightMark,
        }) as Quotation
      )
  );
}
/** A multiple sentence parser for final parser. */
const FULL_PARSER = choiceOnlyOne(
  wordFrom(TOKI_PONA_WORD, "Toki Pona word")
    .skip(eol("end of sentence"))
    .map((word) => ({ type: "single word", word }) as MultipleSentences),
  allAtLeastOnce(sentence())
    .skip(eol("end of sentence"))
    .filter(filter(MULTIPLE_SENTENCES_RULE))
    .map((sentences) =>
      ({ type: "sentences", sentences }) as MultipleSentences
    ),
);
/** Turns string into Toki Pona AST. */
export function parse(src: string): Output<MultipleSentences> {
  return lex(src).flatMap((src) => FULL_PARSER.parse(src));
}
