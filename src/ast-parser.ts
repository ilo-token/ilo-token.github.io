/** Module for AST Parser. It is responsible for turning an array of token tress into AST. */

import {
  Clause,
  FullClause,
  Modifier,
  ModifyingParticle,
  MultiplePhrases,
  MultiplePredicates,
  MultipleSentences,
  Phrase,
  Postclause,
  Preclause,
  Preposition,
  Quotation,
  Sentence,
  WordUnit,
} from "./ast.ts";
import { CoveredError, UnexpectedError, UnrecognizedError } from "./error.ts";
import { Output } from "./output.ts";
import {
  CONTENT_WORD,
  PREPOSITION,
  PREVERB,
  TOKI_PONA_WORD,
} from "./dictionary.ts";
import {
  CLAUSE_RULE,
  filter,
  FULL_CLAUSE_RULE,
  MODIFIER_RULES,
  MODIFIERS_RULES,
  PHRASE_RULE,
  PREPOSITION_RULE,
  SENTENCES_RULE,
  WORD_UNIT_RULES,
} from "./filter.ts";
import {
  all,
  allAtLeastOnce,
  choice,
  choiceOnlyOne,
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
  return specificTokenTree("comma").map(() => ",");
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
function modifyingParticle(): AstParser<ModifyingParticle> {
  return choice(
    specificTokenTree("multiple a")
      .map(({ count }) => ({ type: "multiple a", count }) as ModifyingParticle),
    specificTokenTree("long word")
      .map(({ word, length }) =>
        ({ type: "long word", word, length }) as ModifyingParticle
      ),
    wordFrom(new Set(["a", "n", "kin"]), "a/n/kin")
      .map((word) => ({ type: "word", word }) as ModifyingParticle),
  );
}
function xAlaX(
  word: Set<string>,
  description: string,
): AstParser<WordUnit & { type: "x ala x" }> {
  return choice(
    specificTokenTree("long glyph").map((longGlyph) => {
      // TODO: reduce code duplication
      if (longGlyph.words.length !== 1 || longGlyph.words[0] !== "ala") {
        throw new UnexpectedError(
          describe({ type: "combined glyphs", words: longGlyph.words }),
          '"ala"',
        );
      }
      if (longGlyph.before.length !== 1) {
        if (longGlyph.before.length === 0) {
          throw new UnexpectedError(
            "forward long glyph",
            "long glyph on both sides",
          );
        } else {
          throw new UnexpectedError(
            describe(longGlyph.before[0]),
            "end of long glyph",
          );
        }
      }
      const leftGlyph = longGlyph.before[0];
      if (leftGlyph.type !== "word") {
        throw new UnexpectedError(describe(leftGlyph), "word");
      }
      const word = leftGlyph.word;
      if (longGlyph.after.length !== 1) {
        if (longGlyph.after.length === 0) {
          throw new UnexpectedError(
            "backwards long glyph",
            "long glyph on both sides",
          );
        } else {
          throw new UnexpectedError(
            describe(longGlyph.after[0]),
            "end of long glyph",
          );
        }
      }
      const rightGlyph = longGlyph.after[0];
      if (rightGlyph.type !== "word" || rightGlyph.word !== word) {
        throw new UnexpectedError(describe(leftGlyph), `"${word}"`);
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
/** Parses word unit without numbers. */
function wordUnit(word: Set<string>, description: string): AstParser<WordUnit> {
  return choice(
    wordFrom(word, description).then((word) =>
      manyAtLeastOnce(specificWord(word)).map((words) =>
        ({
          type: "reduplication",
          word,
          count: words.length + 1,
        }) as WordUnit
      )
    ),
    xAlaX(word, description),
    sequence(wordFrom(word, description), optional(modifyingParticle()))
      .map(([word, modifyingParticle]) =>
        ({ type: "default", word, modifyingParticle }) as WordUnit
      ),
  )
    .filter(filter(WORD_UNIT_RULES));
}
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
/** Parses number words in order. */
function number(): AstParser<Array<string>> {
  return sequence(
    many(choice(specificWord("ale"), specificWord("ali"))),
    many(specificWord("mute")),
    many(specificWord("luka")),
    many(specificWord("tu")),
    many(specificWord("wan")),
  )
    .map((array) => {
      const output = array.flat();
      if (output.length >= 2) {
        return output;
      } else {
        throw new CoveredError();
      }
    });
}
function pi(): AstParser<Modifier & { type: "pi" }> {
  return choice(
    specificTokenTree("long glyph").flatMapValue<Phrase>(
      (longGlyph) => {
        if (longGlyph.before.length !== 0) {
          return new Output(
            new UnexpectedError("reverse long glyph", "long pi"),
          );
        }
        if (longGlyph.words.length !== 1 || longGlyph.words[0] !== "pi") {
          return new Output(
            new UnexpectedError(
              describe({ type: "combined glyphs", words: longGlyph.words }),
              "pi",
            ),
          );
        }
        return INNER_PHRASE_PARSER.parse(longGlyph.after);
      },
    )
      .map((phrase) => ({ type: "pi", phrase }) as Modifier & { type: "pi" }),
    specificWord("pi")
      .with(phrase())
      .map((phrase) => ({ type: "pi", phrase }) as Modifier & { type: "pi" }),
  )
    .filter(filter(MODIFIER_RULES));
}
/** Parses multiple modifiers. */
function modifiers(): AstParser<Array<Modifier>> {
  return sequence(
    many(
      choice(
        wordUnit(CONTENT_WORD, "modifier")
          .map((word) => ({ type: "default", word }) as Modifier)
          .filter(filter(MODIFIER_RULES)),
        properWords()
          .map((words) => ({ type: "proper words", words }) as Modifier)
          .filter(filter(MODIFIER_RULES)),
        number()
          .map((numbers) =>
            ({
              type: "default",
              word: { type: "numbers", numbers },
            }) as Modifier
          )
          .filter(filter(MODIFIER_RULES)),
        quotation()
          .map((quotation) => ({ type: "quotation", quotation }) as Modifier)
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
    .map(([modifiers, nanpaModifiers, piModifiers]) => [
      ...modifiers,
      ...nanpaModifiers,
      ...piModifiers,
    ])
    .filter(filter(MODIFIERS_RULES));
}
const INNER_PHRASE_PARSER = phrase().skip(eol("end of long glyph"));
/** Parses phrases. */
function phrase(): AstParser<Phrase> {
  return choice(
    sequence(number(), lazy(modifiers), optional(modifyingParticle()))
      .map(([numbers, modifiers, modifyingParticle]) =>
        ({
          type: "default",
          headWord: { type: "numbers", numbers },
          modifiers,
          modifyingParticle,
        }) as Phrase
      ),
    binaryWords(PREVERB, "preveb").map(([preverb, phrase]) =>
      ({
        type: "preverb",
        preverb: { type: "default", word: preverb, modifyingParticle: null },
        modifiers: [],
        phrase: {
          type: "default",
          headWord: { type: "default", word: phrase, modifyingParticle: null },
          modifiers: [],
          modifyingParticle: null,
        },
        modifyingParticle: null,
      }) as Phrase
    ),
    sequence(
      optionalCombined(PREVERB, "preverb"),
      lazy(modifiers),
      lazy(phrase),
      optional(modifyingParticle()),
    )
      .map(([[preverb, modifier], modifiers, phrase, modifyingParticle]) =>
        ({
          type: "preverb",
          preverb,
          modifiers: [...modifier, ...modifiers],
          phrase,
          modifyingParticle,
        }) as Phrase
      ),
    lazy(preposition)
      .map((preposition) => ({ type: "preposition", preposition }) as Phrase),
    sequence(
      optionalCombined(CONTENT_WORD, "content word"),
      lazy(modifiers),
      optional(modifyingParticle()),
    )
      .map(([[headWord, modifier], modifiers, modifyingParticle]) =>
        ({
          type: "default",
          headWord,
          modifiers: [...modifier, ...modifiers],
          modifyingParticle,
        }) as Phrase
      ),
    quotation()
      .map((quotation) => ({ type: "quotation", quotation }) as Phrase),
  )
    .filter(filter(PHRASE_RULE));
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
        optionalComma().with(specificWord(first)).with(
          nestedPhrases(rest),
        ),
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
            modifyingParticle: null,
          },
          modifiers: [],
          phrases: { type: "single", phrase },
          modifyingParticle: null,
        }) as Preposition
      ),
    specificTokenTree("long glyph").flatMapValue((tokenTrees) => {
      if (tokenTrees.before.length !== 0) {
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
          modifyingParticle: null,
        },
        modifiers: [],
        phrases: {
          type: "single",
          phrase: {
            type: "default",
            headWord: {
              type: "default",
              word: phrase,
              modifyingParticle: null,
            },
            modifiers: [],
            modifyingParticle: null,
          },
        },
        modifyingParticle: null,
      }) as Preposition
    ),
    sequence(
      optionalCombined(PREPOSITION, "preposition"),
      modifiers(),
      nestedPhrases(["anu"]),
      optional(modifyingParticle()),
    )
      .map(([[preposition, modifier], modifiers, phrases, modifyingParticle]) =>
        ({
          preposition,
          modifiers: [...modifier, ...modifiers],
          phrases,
          modifyingParticle,
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
      optionalComma().with(specificWord("e")).with(
        nestedPhrases(["e", "anu"]),
      ),
    ),
    many(optionalComma().with(preposition())),
  )
    .map(([predicates, objects, prepositions]) => {
      if (!objects && prepositions.length === 0) {
        throw new CoveredError();
      } else {
        return { type: "associated", predicates, objects, prepositions };
      }
    });
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
          optionalComma().with(specificWord(first)).with(
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
                modifyingParticle: null,
              },
              alaQuestion: false,
              modifiers: [],
              modifyingParticle: null,
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
    subjectPhrases().map((phrases) => {
      if (phrases.type === "single" && phrases.phrase.type === "quotation") {
        throw new CoveredError();
      } else {
        return { type: "phrases", phrases } as Clause;
      }
    }),
    subjectPhrases()
      .skip(specificWord("o"))
      .map((phrases) => ({ type: "o vocative", phrases }) as Clause),
    sequence(
      subjectPhrases(),
      optionalComma().with(specificWord("li")).with(
        multiplePredicates(["li", "anu"]),
      ),
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
      optionalComma().with(specificWord("o")).with(
        multiplePredicates(["o", "anu"]),
      ),
    )
      .map(([subjects, predicates]) =>
        ({ type: "o clause", subjects, predicates }) as Clause
      ),
    quotation().map((quotation) =>
      ({ type: "quotation", quotation }) as Clause
    ),
  )
    .filter(filter(CLAUSE_RULE));
}
function preclause(): AstParser<Preclause> {
  return choice(
    modifyingParticle()
      .map((modifyingParticle) =>
        ({ type: "modifying particle", modifyingParticle }) as Preclause
      ),
    wordUnit(new Set(["taso"]), '"taso"')
      .map((taso) => ({ type: "taso", taso }) as Preclause),
  );
}
function postclause(): AstParser<Postclause> {
  return choice(
    modifyingParticle()
      .map((modifyingParticle) =>
        ({ type: "modifying particle", modifyingParticle }) as Postclause
      ),
    specificWord("anu")
      .with(wordUnit(new Set(["seme"]), '"seme"'))
      .map((seme) => ({ type: "anu seme", seme }) as Postclause),
  );
}
/** Parses a single clause including preclause and postclause. */
function fullClause(): AstParser<FullClause> {
  return choice(
    sequence(
      optional(preclause().skip(optionalComma())),
      clause(),
      optional(optionalComma().with(postclause())),
    )
      .map(([preclause, clause, postclause]) =>
        ({ type: "default", preclause, clause, postclause }) as FullClause
      ),
    modifyingParticle()
      .map((modifyingParticle) =>
        ({ type: "modifying particle", modifyingParticle }) as FullClause
      ),
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
    }));
}
const INNER_QUOTATION_PARSER = all(sentence())
  .skip(eol("end of sentence"))
  .filter(filter(SENTENCES_RULE));
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
const FULL_PARSER = choiceOnlyOne(
  wordFrom(TOKI_PONA_WORD, "Toki Pona word")
    .skip(eol("end of sentence"))
    .map((word) => ({ type: "single word", word }) as MultipleSentences),
  allAtLeastOnce(sentence())
    .skip(eol("end of sentence"))
    .filter(filter(SENTENCES_RULE))
    .map((sentences) =>
      ({ type: "sentences", sentences }) as MultipleSentences
    ),
);
/** A multiple Toki Pona sentence parser. */
export function parse(src: string): Output<MultipleSentences> {
  return lex(src).flatMap((src) => FULL_PARSER.parse(src));
}
