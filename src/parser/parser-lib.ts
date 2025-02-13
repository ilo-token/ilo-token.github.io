/**
 * A generic module for parser and parser combinator. It is used by both lexer
 * and AST parser.
 */

import { NEWLINE_LIST } from "../misc.ts";
import { Output, OutputError } from "../output.ts";

/** A single parsing result. */
export type ValueRest<T> = Readonly<{ rest: string; value: T }>;
/** A special kind of Output that parsers returns. */
export type ParserOutput<T> = Output<ValueRest<T>>;

/** Wrapper of parser function with added methods for convenience. */
export class Parser<T> {
  readonly #parser: (src: string) => ParserOutput<T>;
  constructor(parser: (src: string) => ParserOutput<T>) {
    this.#parser = parser;
  }
  parser(src: string): ParserOutput<T> {
    return Output.from(() => this.#parser(src));
  }
  /**
   * Maps the parsing result. For convenience, the mapper function can throw
   * an OutputError; Other kinds of error are ignored.
   */
  map<U>(mapper: (value: T) => U): Parser<U> {
    return new Parser((src) =>
      this
        .parser(src)
        .map(({ value, rest }) => ({ value: mapper(value), rest }))
    );
  }
  /**
   * Filters outputs. Instead of returning false, OutputError must be thrown
   * instead.
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
  sort(comparer: (left: T, right: T) => number): Parser<T> {
    return new Parser((src) =>
      this.parser(src).sort((left, right) => comparer(left.value, right.value))
    );
  }
  sortBy(mapper: (value: T) => number): Parser<T> {
    return this.sort((left, right) => mapper(left) - mapper(right));
  }
  /** Takes another parser and discards the parsing result of `this`. */
  with<U>(parser: Parser<U>): Parser<U> {
    return sequence(this, parser).map(([_, output]) => output);
  }
  /** Takes another parser and discards its parsing result. */
  skip<U>(parser: Parser<U>): Parser<T> {
    return sequence(this, parser).map(([output]) => output);
  }
  parse(src: string): Output<T> {
    return this.parser(src).map(({ value }) => value);
  }
}
/** Represents Error with unexpected and expected elements. */
export class UnexpectedError extends OutputError {
  constructor(unexpected: string, expected: string) {
    super(`unexpected ${unexpected}. ${expected} were expected instead`);
    this.name = "UnexpectedError";
  }
}
/** Represents Error caused by unrecognized elements. */
export class UnrecognizedError extends OutputError {
  constructor(element: string) {
    super(`${element} is unrecognized`);
    this.name = "UnrecognizedError";
  }
}
/** Parser that always outputs an error. */
export function error(error: OutputError): Parser<never> {
  return new Parser(() => {
    throw error;
  });
}
/** Parser that always outputs an empty output. */
export function empty(): Parser<never> {
  return new Parser(() => new Output());
}
/** Parses nothing and leaves the source string intact. */
export function nothing(): Parser<null> {
  return new Parser((src) => new Output([{ value: null, rest: src }]));
}
/** Parses without consuming the source string */
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((src) =>
    parser.parser(src).map(({ value }) => ({ value, rest: src }))
  );
}
/**
 * Evaluates the parser only during parsing, useful for parser that may change
 * e.g. due to settings. Could also be used for non-changing recursive parser
 * but consider using `lazy` instead.
 */
export function variable<T>(parser: () => Parser<T>): Parser<T> {
  return new Parser((src) => parser().parser(src));
}
/**
 * Lazily evaluates the parser function only when needed. Useful for recursive
 * parsers.
 *
 * # Notes
 *
 * This combinator contains memoization, for it to be effective:
 *
 * - Don't use it for combinators, use `variable` instead.
 * - Declare the parser as global constant.
 */
export function lazy<T>(parser: () => Parser<T>): Parser<T> {
  let cached: null | Parser<T> = null;
  return new Parser((src) => {
    if (cached == null) {
      cached = parser();
    }
    return cached.parser(src);
  });
}
/**
 * Evaluates all parsers on the same source string and sums it all on a single
 * Output.
 */
export function choice<T>(...choices: Array<Parser<T>>): Parser<T> {
  return new Parser((src) =>
    new Output(choices).flatMap((parser) => parser.parser(src))
  );
}
/**
 * Tries to evaluate each parsers one at a time and only only use the output of
 * the first parser that is successful.
 */
export function choiceOnlyOne<T>(
  ...choices: Array<Parser<T>>
): Parser<T> {
  return choices.reduceRight(
    (right, left) =>
      new Parser((src) => {
        const output = left.parser(src);
        if (output.isError()) {
          return Output.concat(output, right.parser(src));
        } else {
          return output;
        }
      }),
    empty(),
  );
}
/** Combines `parser` and the `nothing` parser, and output `null | T`. */
export function optional<T>(parser: Parser<T>): Parser<null | T> {
  return choice(parser, nothing());
}
/**
 * Like `optional` but when the parser is successful, it doesn't consider
 * parsing nothing.
 */
export function optionalAll<T>(parser: Parser<T>): Parser<null | T> {
  return choiceOnlyOne(parser, nothing());
}
/** Takes all parsers and applies them one after another. */
export function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: Parser<T[I]> } & { length: T["length"] }
): Parser<T> {
  // We resorted to using `any` types here, make sure it works properly
  return sequence.reduceRight(
    (right: Parser<any>, left) =>
      left.then((value) => right.map((newValue) => [value, ...newValue])),
    nothing().map(() => []),
  ) as Parser<any>;
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
export function many<T>(parser: Parser<T>): Parser<Array<T>> {
  return choice(
    sequence(parser, variable(() => many(parser)))
      .map(([first, rest]) => [first, ...rest]),
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
export function manyAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, many(parser))
    .map(([first, rest]) => [first, ...rest]);
}
/**
 * Parses `parser` multiple times and returns an `Array<T>`. This function is
 * exhaustive unlike `many`.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
export function all<T>(parser: Parser<T>): Parser<Array<T>> {
  return choiceOnlyOne(
    sequence(parser, variable(() => all(parser)))
      .map(([first, rest]) => [first, ...rest]),
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
export function allAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, all(parser))
    .map(([first, rest]) => [first, ...rest]);
}
export function count<T>(parser: Parser<Array<T>>): Parser<number> {
  return parser.map((array) => array.length);
}
function throwWithSourceDescription(src: string, expected: string): never {
  let tokenDescription: string;
  if (src === "") {
    tokenDescription = "end of text";
  } else {
    const [token] = src.match(/\S*/)!;
    if (token === "") {
      if (NEWLINE_LIST.includes(src[0])) {
        tokenDescription = "newline";
      } else {
        tokenDescription = "space";
      }
    } else {
      tokenDescription = `"${token}"`;
    }
  }
  throw new UnexpectedError(tokenDescription, expected);
}
/**
 * Uses Regular Expression to create parser. The parser outputs
 * RegExpMatchArray, which is what `string.match( ... )` returns.
 */
export function matchCapture(
  regex: RegExp,
  description: string,
): Parser<RegExpMatchArray> {
  const newRegex = new RegExp(`^${regex.source}`, regex.flags);
  return new Parser((src) => {
    const match = src.match(newRegex);
    if (match != null) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    }
    throwWithSourceDescription(src, description);
  });
}
export function match(regex: RegExp, description: string): Parser<string> {
  return matchCapture(regex, description).map(([matched]) => matched);
}
/** parses a string of consistent length. */
export function slice(length: number, description: string): Parser<string> {
  return new Parser((src) => {
    if (src.length >= length) {
      return new Output([{
        rest: src.slice(length),
        value: src.slice(0, length),
      }]);
    }
    throwWithSourceDescription(src, description);
  });
}
/** Parses a string that exactly matches the given string. */
export function matchString(
  match: string,
  description: string = `"${match}"`,
): Parser<string> {
  return new Parser((src) => {
    if (src.length >= length && src.slice(0, match.length) === match) {
      return new Output([{ rest: src.slice(match.length), value: match }]);
    }
    throwWithSourceDescription(src, description);
  });
}
export function character(): Parser<string> {
  return match(/./us, "character");
}
/** Parses the end of text */
export function end(): Parser<null> {
  return new Parser((src) => {
    if (src === "") {
      return new Output([{ value: null, rest: "" }]);
    }
    throwWithSourceDescription(src, "end of text");
  });
}
export function withSource<T>(
  parser: Parser<T>,
): Parser<[value: T, source: string]> {
  return new Parser((src) =>
    parser.parser(src).map((value) => ({
      value: [value.value, src.slice(0, src.length - value.rest.length)],
      rest: value.rest,
    }))
  );
}
/**
 * Enables memoization, for it to be effective:
 *
 * - Don't use it for combinators.
 * - Declare the parser as global constant.
 * - It must not contain variable parsers e.g. with `variable`.
 */
export function cached<T>(parser: Parser<T>): Parser<T> {
  const cache: { [word: string]: ParserOutput<T> } = {};
  return new Parser((src) => {
    if (Object.hasOwn(cache, src)) {
      return cache[src];
    } else {
      return cache[src] = parser.parser(src);
    }
  });
}
