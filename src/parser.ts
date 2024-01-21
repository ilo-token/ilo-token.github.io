import {
  Clause,
  FullClause,
  Modifier,
  MultiplePhrases,
  MultiplePredicates,
  Phrase,
  Preposition,
  Quotation,
  Sentence,
  WordUnit,
} from "./ast.ts";
import { UnreachableError, UnrecognizedError } from "./error.ts";
import { Output } from "./output.ts";
import {
  CONTENT_WORD,
  PREPOSITION,
  PREVERB,
  SPECIAL_SUBJECT,
} from "./vocabulary.ts";
import {
  filter,
  MODIFIER_RULES,
  MODIFIERS_RULES,
  WORD_UNIT_RULES,
} from "./filter.ts";

/** A single parsing result. */
type ValueRest<T> = { value: T; rest: string };
/** A special kind of Output that parsers returns. */
type ParserOutput<T> = Output<ValueRest<T>>;

/** Wrapper of parser function with added methods for convenience. */
class Parser<T> {
  constructor(public readonly parser: (src: string) => ParserOutput<T>) {}
  /**
   * Maps the parsing result. For convenience, the mapper function can throw
   * an OutputError; Other kinds of error are ignored.
   */
  map<U>(mapper: (value: T) => U): Parser<U> {
    return new Parser((src) =>
      this.parser(src).map(({ value, rest }) => ({
        value: mapper(value),
        rest,
      }))
    );
  }
  /**
   * Filters outputs. The mapper may throw OutputError as well in place of
   * returning false.
   */
  filter(mapper: (value: T) => boolean): Parser<T> {
    return new Parser((src) =>
      this.parser(src).filter(({ value }) => mapper(value))
    );
  }
  /**
   * Parses `this` then passes the parsing result in the mapper. The resulting
   * parser is then also parsed.
   */
  then<U>(mapper: (value: T) => Parser<U>): Parser<U> {
    return new Parser((src) =>
      this.parser(src).flatMap(({ value, rest }) => mapper(value).parser(rest))
    );
  }
  /** Takes another parser and discards the parsing result of `this`. */
  with<U>(parser: Parser<U>): Parser<U> {
    return sequence(this, parser).map(([_, output]) => output);
  }
  /** Takes another parser and discards its parsing result. */
  skip<U>(parser: Parser<U>): Parser<T> {
    return sequence(this, parser).map(([output, _]) => output);
  }
}
/**
 * Uses Regular Expression to create parser. The parser outputs
 * RegExpMatchArray, which is what `string.match( ... )` returns.
 */
function match(regex: RegExp): Parser<RegExpMatchArray> {
  const newRegex = new RegExp("^" + regex.source, regex.flags);
  return new Parser((src) => {
    const match = src.match(newRegex);
    if (match) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    } else if (src === "") {
      return new Output(new UnrecognizedError("Unexpected end of sentence"));
    } else {
      const token = src.match(/(.*)(?:\s|$)/)?.[1];
      if (token) return new Output(new UnrecognizedError(`"${token}"`));
      else return new Output(new UnreachableError());
    }
  });
}
/** Parses nothing and leaves the source string intact. */
function nothing(): Parser<null> {
  return new Parser((src) => new Output([{ value: null, rest: src }]));
}
/** Parses the end of line (or the end of sentence in context of Toki Pona) */
function eol(): Parser<null> {
  return new Parser((src) => {
    if (src === "") return new Output([{ value: null, rest: "" }]);
    else return new Output(new UnrecognizedError(`"${src}"`));
  });
}
/** Parses without consuming the source string */
function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((src) =>
    parser.parser(src).map(({ value }) => ({ value, rest: src }))
  );
}
/**
 * Lazily evaluates the parser function only when needed. Useful for recursive
 * parsers.
 */
function lazy<T>(parser: () => Parser<T>): Parser<T> {
  return new Parser((src) => parser().parser(src));
}
/**
 * Evaluates all parsers on the same source string and sums it all on a single
 * Output.
 */
function choice<T>(...choices: Array<Parser<T>>): Parser<T> {
  return new Parser((src) =>
    new Output(choices).flatMap((parser) => parser.parser(src))
  );
}
/**
 * Tries to evaluate each parsers one at a time and only returns the first
 * Output without error.
 */
function choiceOnlyOne<T>(...choices: Array<Parser<T>>): Parser<T> {
  return new Parser((src) =>
    choices.reduce((output, parser) => {
      if (output.isError()) return parser.parser(src);
      else return output;
    }, new Output<ValueRest<T>>())
  );
}
/** Combines `parser` and the `nothing` parser, and output `null | T`. */
function optional<T>(parser: Parser<T>): Parser<null | T> {
  return choice(parser, nothing());
}
/** Takes all parsers and applies them one after another. */
function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: Parser<T[I]> } & { length: T["length"] }
): Parser<T> {
  // We resorted to using `any` types here, make sure it works properly
  return new Parser((src) =>
    sequence.reduce(
      (output, parser) =>
        output.flatMap(({ value, rest }) =>
          parser.parser(rest).map(({ value: newValue, rest }) => ({
            value: [...value, newValue],
            rest,
          }))
        ),
      // deno-lint-ignore no-explicit-any
      new Output<ValueRest<any>>([{ value: [], rest: src }]),
    )
  );
}
/**
 * Parses `parser` multiple times and returns an `Array<T>`. The resulting
 * output includes all outputs from parsing nothing to parsing as many as
 * possible.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
function many<T>(parser: Parser<T>): Parser<Array<T>> {
  return choice(
    sequence(parser, lazy(() => many(parser))).map((
      [first, rest],
    ) => [first, ...rest]),
    nothing().map(() => []),
  );
}
/**
 * Like `many` but parses at least once.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
function manyAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, many(parser)).map((
    [first, rest],
  ) => [first, ...rest]);
}
/**
 * Parses `parser` multiple times and returns an `Array<T>`. This function is
 * exhaustive unlike `many`.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
function all<T>(parser: Parser<T>): Parser<Array<T>> {
  return choiceOnlyOne(
    sequence(parser, lazy(() => all(parser))).map((
      [first, rest],
    ) => [first, ...rest]),
    nothing().map(() => []),
  );
}
/**
 * Like `all` but parses at least once.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
function allAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, all(parser)).map(([first, rest]) => [first, ...rest]);
}
/** Parses comma. */
function comma(): Parser<string> {
  return match(/,\s*/).map(() => ",");
}
/** Parses an optional comma. */
function optionalComma(): Parser<null | string> {
  return optional(comma());
}
/** Parses lowercase word. */
function word(): Parser<string> {
  return match(/([a-z]+)\s*/).map(([_, word]) => word);
}
/**
 * Parses all at least one uppercase words and combines them all into single
 * string. This function is exhaustive like `all`.
 */
function properWords(): Parser<string> {
  return allAtLeastOnce(match(/([A-Z][a-z]*)\s*/).map(([_, word]) => word)).map(
    (array) => array.join(" "),
  );
}
/** Parses word only from `set`. */
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word().filter((word) => {
    if (set.has(word)) return true;
    else throw new UnrecognizedError(`"${word}" as ${description}`);
  });
}
/** Parses a specific word. */
function specificWord(thatWord: string): Parser<string> {
  return word().filter((thisWord) => {
    if (thatWord === thisWord) return true;
    else throw new UnrecognizedError(`"${thisWord}" instead of "${thatWord}"`);
  });
}
/** Parses word unit without numbers. */
function wordUnit(word: Parser<string>): Parser<WordUnit> {
  return choice(
    word.then((word) =>
      manyAtLeastOnce(specificWord(word)).map((words) => ({
        type: "reduplication",
        word,
        count: words.length + 1,
      } as WordUnit))
    ),
    word.then((word) => specificWord("ala").with(specificWord(word))).map((
      word,
    ) => ({ type: "x ala x", word } as WordUnit)),
    word.map((word) => ({ type: "default", word } as WordUnit)),
  ).filter(filter(WORD_UNIT_RULES));
}
/** Parses number words in order. */
function number(): Parser<Array<string>> {
  return sequence(
    many(choice(specificWord("ale"), specificWord("ali"))),
    many(specificWord("mute")),
    many(specificWord("luka")),
    many(specificWord("tu")),
    many(specificWord("wan")),
  ).map((array) => {
    const output = array.flat();
    if (output.length >= 2) return output;
    else throw new UnreachableError();
  });
}
/** Parses multiple modifiers */
function modifiers(): Parser<Array<Modifier>> {
  return sequence(
    many(
      choice(
        wordUnit(wordFrom(CONTENT_WORD, "modifier")).map((word) => ({
          type: "default",
          word,
        } as Modifier)).filter(filter(MODIFIER_RULES)),
        properWords().map((
          words,
        ) => ({ type: "proper words", words } as Modifier)).filter(
          filter(MODIFIER_RULES),
        ),
        number().map((
          numbers,
        ) => ({
          type: "default",
          word: { type: "numbers", numbers },
        } as Modifier)).filter(filter(MODIFIER_RULES)),
        quotation().map((
          quotation,
        ) => ({ type: "quotation", quotation } as Modifier)).filter(
          filter(MODIFIER_RULES),
        ),
      ),
    ),
    many(
      sequence(wordUnit(specificWord("nanpa")), phrase()).map((
        [nanpa, phrase],
      ) => ({
        type: "nanpa",
        nanpa,
        phrase,
      } as Modifier)).filter(filter(MODIFIER_RULES)),
    ),
    many(
      specificWord("pi").with(phrase()).map((phrase) => ({
        type: "pi",
        phrase,
      } as Modifier)).filter(filter(MODIFIER_RULES)),
    ),
  ).map((
    [modifiers, nanpaModifiers, piModifiers],
  ) => [...modifiers, ...nanpaModifiers, ...piModifiers]).filter(
    filter(MODIFIERS_RULES),
  );
}
/** Parses phrases including preverbial phrases. */
function phrase(): Parser<Phrase> {
  return choice(
    sequence(number(), lazy(modifiers)).map((
      [numbers, modifiers],
    ) => ({
      type: "default",
      headWord: { type: "numbers", numbers },
      modifiers,
    } as Phrase)),
    sequence(
      wordUnit(wordFrom(PREVERB, "preverb")),
      lazy(modifiers),
      lazy(phrase),
    ).map((
      [preverb, modifiers, phrase],
    ) => ({
      type: "preverb",
      preverb,
      modifiers,
      phrase,
    } as Phrase)),
    lazy(preposition).map((preposition) => ({
      type: "preposition",
      preposition,
    })),
    sequence(
      wordUnit(wordFrom(CONTENT_WORD, "headword")),
      lazy(modifiers),
    ).map(([headWord, modifiers]) => ({
      type: "default",
      headWord,
      modifiers,
    })),
    quotation().map((quotation) => ({ type: "quotation", quotation })),
  );
}
/**
 * Parses nested phrases with given nesting rule, only accepting the top level
 * operation.
 */
function nestedPhrasesOnly(
  nestingRule: Array<"en" | "li" | "o" | "e" | "anu">,
): Parser<MultiplePhrases> {
  if (nestingRule.length === 0) {
    return phrase().map(
      (phrase) => ({ type: "single", phrase } as MultiplePhrases),
    );
  } else {
    const [first, ...rest] = nestingRule;
    let type: "and conjunction" | "anu";
    if (["en", "li", "o", "e"].indexOf(first) !== -1) {
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
    ).map(([group, moreGroups]) => ({
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
    return phrase().map(
      (phrase) => ({ type: "single", phrase } as MultiplePhrases),
    );
  } else {
    return choice(
      lazy(() => nestedPhrasesOnly(nestingRule)),
      lazy(() => nestedPhrases(nestingRule.slice(1))),
    );
  }
}
/** Parses phrases separated by _en_ or _anu_. */
function subjectPhrases(): Parser<MultiplePhrases> {
  return choice(
    nestedPhrases(["en", "anu"]),
    nestedPhrases(["anu", "en"]).filter((phrase) => phrase.type !== "single"),
  );
}
/** Parses prepositional phrase. */
function preposition(): Parser<Preposition> {
  return sequence(
    wordUnit(wordFrom(PREPOSITION, "preposition")),
    modifiers(),
    nestedPhrases(["anu"]),
  ).map(([preposition, modifiers, phrases]) => ({
    preposition,
    modifiers,
    phrases,
  }));
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
      optionalComma().with(specificWord("e")).with(
        nestedPhrases(["e", "anu"]),
      ),
    ),
    many(preposition()),
  ).map(([predicates, objects, prepositions]) => {
    if (!objects && prepositions.length === 0) {
      throw new UnreachableError();
    } else {
      return {
        type: "associated",
        predicates,
        objects,
        prepositions,
      };
    }
  });
}
/** Parses multiple predicates without _li_ nor _o_ at the beginning. */
function multiplePredicates(
  nestingRule: Array<"li" | "o" | "anu">,
): Parser<MultiplePredicates> {
  if (nestingRule.length === 0) {
    return choice(
      associatedPredicates([]),
      phrase().map((
        predicate,
      ) => ({ type: "single", predicate } as MultiplePredicates)),
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
          lazy(() => multiplePredicates(rest)),
        ),
        manyAtLeastOnce(
          optionalComma().with(specificWord(first)).with(
            choice(
              associatedPredicates(nestingRule),
              lazy(() => multiplePredicates(rest)),
            ),
          ),
        ),
      ).map(([group, moreGroups]) => ({
        type,
        predicates: [group, ...moreGroups],
      } as MultiplePredicates)),
      lazy(() => multiplePredicates(rest)),
    );
  }
}
/** Parses a single clause. */
function clause(): Parser<Clause> {
  return choice(
    sequence(
      wordFrom(SPECIAL_SUBJECT, "mi/sina subject"),
      multiplePredicates(["li", "anu"]),
    ).map(([subject, predicates]) => ({
      type: "li clause",
      subjects: {
        type: "single",
        phrase: {
          type: "default",
          headWord: { type: "default", word: subject },
          alaQuestion: false,
          modifiers: [],
        },
      },
      predicates,
    } as Clause)),
    manyAtLeastOnce(optionalComma().with(preposition())).map((
      prepositions,
    ) => ({ type: "prepositions", prepositions })),
    subjectPhrases().map((phrases) => {
      if (
        phrases.type === "single" &&
        (phrases.phrase.type === "preposition" ||
          phrases.phrase.type === "quotation")
      ) {
        throw new UnreachableError();
      } else {
        return { type: "phrases", phrases } as Clause;
      }
    }),
    subjectPhrases().skip(specificWord("o")).map((phrases) => ({
      type: "o vocative",
      phrases,
    })),
    sequence(
      subjectPhrases(),
      optionalComma().with(specificWord("li")).with(
        multiplePredicates(["li", "anu"]),
      ),
    ).map(([subjects, predicates]) => ({
      type: "li clause",
      subjects,
      predicates,
    })),
    sequence(
      specificWord("o").with(multiplePredicates(["o", "anu"])),
    ).map(([predicates]) => ({
      type: "o clause",
      subjects: null,
      predicates,
    })),
    sequence(
      subjectPhrases(),
      optionalComma().with(specificWord("o")).with(
        multiplePredicates(["o", "anu"]),
      ),
    ).map(([subjects, predicates]) => ({
      type: "o clause",
      subjects: subjects,
      predicates,
    })),
    quotation().map((quotation) => ({
      type: "quotation",
      quotation,
    })),
  );
}
/** Parses a single clause including precaluse and postclause. */
function fullClause(): Parser<FullClause> {
  return sequence(
    optional(wordUnit(specificWord("taso")).skip(optionalComma())),
    clause(),
    optional(
      optionalComma().with(specificWord("anu")).with(
        wordUnit(specificWord("seme")),
      ),
    ),
  ).map(([taso, clause, anuSeme]) => ({
    taso,
    anuSeme,
    clause,
  }));
}
/** parses _la_ with optional comma around. */
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
    fullClause(),
    many(la().with(fullClause())),
    choice(
      eol().map(() => ""),
      lookAhead(closeQuotationMark()).map(() => ""),
      match(/([.,:;?!])\s*/).map(([_, punctuation]) => punctuation),
    ),
  ).map(([clause, moreClauses, punctuation]) => ({
    laClauses: [clause, ...moreClauses],
    punctuation,
  }));
}
/** Parses opening quotation mark */
function openQuotationMark(): Parser<string> {
  return match(/(["“«「])\s*/).map(([_, mark]) => mark);
}
/** Parses closing quotation mark */
function closeQuotationMark(): Parser<string> {
  return match(/(["”»」])\s*/).map(([_, mark]) => mark);
}
/** Parses multiple sentences inside quotation mark */
function quotation(): Parser<Quotation> {
  return sequence(
    openQuotationMark(),
    many(lazy(sentence)),
    closeQuotationMark(),
  ).map(([leftMark, sentences, rightMark]) => {
    if (leftMark === '"' || leftMark === "“") {
      if (rightMark !== '"' && rightMark !== "”") {
        throw new UnrecognizedError("Mismatched quotation marks");
      }
    } else if (leftMark === "«") {
      if (rightMark !== "»") {
        throw new UnrecognizedError("Mismatched quotation marks");
      }
    } else if (leftMark === "「") {
      if (rightMark !== "」") {
        throw new UnrecognizedError("Mismatched quotation marks");
      }
    } else throw new UnreachableError();
    return { sentences, leftMark, rightMark };
  });
}
/** A multiple Toki Pona sentence parser. */
export function parser(src: string): Output<Array<Sentence>> {
  return match(/\s*/).with(allAtLeastOnce(sentence())).skip(eol()).parser(src)
    .map(({ value }) => value);
}
