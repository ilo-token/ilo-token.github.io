import {
  Clause,
  FullClause,
  Modifier,
  Phrase,
  Predicate,
  Preposition,
  Sentence,
  SimplePhrase,
} from "./ast.ts";
import { UnreachableError, UnrecognizedError } from "./error.ts";
import { Output } from "./output.ts";
import {
  CONTENT_WORD,
  PREPOSITION,
  PREVERB,
  SPECIAL_SUBJECT,
} from "./vocabulary.ts";

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
  map<U>(mapper: (x: T) => U): Parser<U> {
    return new Parser((src) =>
      this.parser(src).map(({ value, rest }) => ({
        value: mapper(value),
        rest,
      }))
    );
  }
  /** Takes another parser and discards the first parsing result. */
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
      return new Output(new UnreachableError());
    } else {
      const token = src.match(/(.*)(?:\s|$)/)?.[1];
      if (token) {
        return new Output(new UnrecognizedError(`"${token}"`));
      } else {
        return new Output(new UnreachableError());
      }
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
    if (src === "") {
      return new Output([{ value: null, rest: "" }]);
    } else {
      return new Output(new UnrecognizedError(`"${src}"`));
    }
  });
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
      if (output.isError()) {
        return parser.parser(src);
      } else {
        return output;
      }
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
 */
function many<T>(parser: Parser<T>): Parser<Array<T>> {
  return choice(
    sequence(parser, lazy(() => many(parser))).map((
      [first, rest],
    ) => [first, ...rest]),
    nothing().map(() => []),
  );
}
/** Like `many` but parses at least once. */
function manyAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, many(parser)).map(([first, rest]) => [
    first,
    ...rest,
  ]);
}
/**
 * Parses `parser` multiple times and returns an `Array<T>`. This function is
 * exhaustive.
 */
function all<T>(parser: Parser<T>): Parser<Array<T>> {
  return choiceOnlyOne(
    sequence(parser, lazy(() => all(parser))).map((
      [first, rest],
    ) => [first, ...rest]),
    nothing().map(() => []),
  );
}
/** Like `all` but parses at least once. */
function allAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, all(parser)).map(([first, rest]) => [
    first,
    ...rest,
  ]);
}
/** Parses whitespaces. */
function allSpace(): Parser<string> {
  return match(/\s*/).map(([space]) => space);
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
  return allAtLeastOnce(match(/([A-Z][a-z]*)\s*/).map(([_, word]) => word))
    .map(
      (array) => array.join(" "),
    );
}
/** Parses word only from `set`. */
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word().map((word) => {
    if (set.has(word)) {
      return word;
    } else {
      throw new UnrecognizedError(`"${word}" as ${description}`);
    }
  });
}
/** Parses a specific word. */
function specificWord(thatWord: string): Parser<string> {
  return word().map((thisWord) => {
    if (thatWord === thisWord) {
      return thisWord;
    } else {
      throw new UnrecognizedError(`"${thisWord}" instead of "${thatWord}"`);
    }
  });
}
/** Parses headword. */
function headWord(): Parser<string> {
  return wordFrom(CONTENT_WORD, "headword");
}
/** Parses number words in order. */
function number(): Parser<Array<string>> {
  return sequence(
    all(specificWord("ale")),
    all(specificWord("mute")),
    all(specificWord("luka")),
    all(specificWord("tu")),
    all(specificWord("wan")),
  ).map((array) => {
    const output = array.flat();
    if (output.length === 0) {
      throw new UnreachableError();
    } else {
      return output;
    }
  });
}
/** Parses a single modifier. */
function modifier(): Parser<Modifier> {
  return choice(
    specificWord("nanpa")
      .with(phrase())
      .map((phrase) => ({
        type: "nanpa ordinal",
        phrase,
      })),
    wordFrom(CONTENT_WORD, "modifier").map(
      (word) => ({
        type: "word",
        word,
      } as Modifier),
    ),
    properWords().map((words) => ({
      type: "proper words",
      words,
    })),
    specificWord("pi")
      .with(phrase())
      .map((phrase) => ({
        type: "pi",
        phrase,
      })),
    number().map((number) => ({ type: "cardinal", number })),
  );
}
/** Parses phrase. */
function simplePhrase(): Parser<SimplePhrase> {
  return choice(
    number().map((number) => ({
      type: "cardinal",
      number,
    } as SimplePhrase)),
    sequence(headWord(), many(modifier())).map(
      ([headWord, modifiers]) => ({
        type: "default",
        headWord,
        modifiers,
      }),
    ),
  );
}
/** Parses phrases including preverbial phrases. */
function phrase(): Parser<Phrase> {
  return sequence(
    optional(wordFrom(PREVERB, "preverb")),
    lazy(simplePhrase),
  ).map(([preverb, phrase]) => {
    if (preverb) {
      return {
        type: "preverb",
        preverb,
        phrase,
      };
    } else {
      return {
        type: "default",
        phrase,
      };
    }
  });
}
/** Parses prepositional phrase. */
function preposition(): Parser<Preposition> {
  return sequence(wordFrom(PREPOSITION, "preposition"), phrase()).map(
    ([preposition, phrase]) => ({
      preposition,
      phrase,
    }),
  );
}
/** Parses phrases separated by _en_. */
function enPhrases(): Parser<Array<Phrase>> {
  return sequence(
    phrase(),
    many(specificWord("en").with(phrase())),
  ).map(([first, rest]) => [first, ...rest]);
}
/** Parses a single predicate. */
function predicate(): Parser<Predicate> {
  return choice(
    preposition().map((preposition) => ({ type: "preposition", preposition })),
    phrase().map(
      (predicate) => ({ type: "default", predicate } as Predicate),
    ),
  );
}
/** Parses a single clause. */
function clause(): Parser<Clause> {
  return choice(
    sequence(
      wordFrom(SPECIAL_SUBJECT, "mi/sina subject"),
      predicate(),
      many(specificWord("li").with(predicate())),
      many(preposition()),
    ).map(([subject, predicate, morePredicates, prepositions]) => ({
      type: "li clause",
      subjects: [
        {
          type: "default",
          phrase: { type: "default", headWord: subject, modifiers: [] },
        },
      ],
      predicates: [predicate, ...morePredicates],
      prepositions,
    })),
    manyAtLeastOnce(preposition()).map((prepositions) => ({
      type: "prepositions",
      prepositions,
    })),
    enPhrases().map(
      (phrases) => ({
        type: "en phrases",
        phrases,
      } as Clause),
    ),
    enPhrases()
      .skip(specificWord("o"))
      .map((phrases) => ({
        type: "o vocative",
        phrases,
      })),
    sequence(
      enPhrases(),
      manyAtLeastOnce(specificWord("li").with(predicate())),
      many(preposition()),
    ).map(([subjects, predicates, prepositions]) => ({
      type: "li clause",
      subjects,
      predicates,
      prepositions,
    })),
    sequence(
      optional(enPhrases()),
      manyAtLeastOnce(specificWord("o").with(predicate())),
      many(preposition()),
    ).map(([subjects, predicates, prepositions]) => ({
      type: "o clause",
      subjects: subjects ?? [],
      predicates,
      prepositions,
    })),
  );
}
/** Parses a single clause including precaluse and postclause. */
function fullClause(): Parser<FullClause> {
  return sequence(optional(specificWord("taso")), clause()).map(
    ([taso, clause]) => ({
      taso: !!taso,
      clause,
    }),
  );
}
/** Parses a single full sentence without punctuations. */
function sentence(): Parser<Sentence> {
  return choice(
    fullClause().map(
      (clause) => ({ type: "single clause", clause } as Sentence),
    ),
    sequence(fullClause().skip(specificWord("la")), lazy(sentence)).map(
      ([left, right]) => ({ type: "la clauses", left, right }),
    ),
  );
}
/** The full parser. */
function fullSentence(): Parser<Sentence> {
  return allSpace()
    .with(sentence())
    .skip(optional(match(/\./)))
    .skip(allSpace())
    .skip(eol());
}
/** The full parser. */
export function parser(src: string): Output<Sentence> {
  return fullSentence()
    .parser(src)
    .map(({ value }) => value);
}
