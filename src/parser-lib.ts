/**
 * A generic module for parser and parser combinator. It is used by both lexer
 * and AST parser.
 */

import { UnexpectedError } from "./error.ts";
import { fs } from "./misc.ts";
import { Output, OutputError } from "./output.ts";

/** A single parsing result. */
export type ValueRest<T> = { rest: string; value: T };
/** A special kind of Output that parsers returns. */
export type ParserOutput<T> = Output<ValueRest<T>>;

/** Wrapper of parser function with added methods for convenience. */
export class Parser<T> {
  constructor(public readonly parser: (src: string) => ParserOutput<T>) {}
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
    return sequence(this, parser).map(([output, _]) => output);
  }
  parse(src: string): Output<T> {
    return this.parser(src).map(({ value }) => value);
  }
}
/** Parser that always outputs an error. */
export function error(error: OutputError): Parser<never> {
  return new Parser(() => new Output(error));
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
 * Evaluates the parser only during parsing, useful for parser the may change
 * e.g. due to settings.
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
    let cachedParser: Parser<T>;
    if (cached != null) {
      cachedParser = cached;
    } else {
      cachedParser = cached = parser();
    }
    return cachedParser.parser(src);
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
 * the parser that is successful.
 */
export function choiceOnlyOne<T>(
  ...choices: Array<Parser<T>>
): Parser<T> {
  return choices.reduceRight((newParser, parser) =>
    new Parser((src) => {
      const output = parser.parser(src);
      if (output.isError()) {
        return Output.concat(output, newParser.parser(src));
      } else {
        return output;
      }
    }), empty());
}
/** Combines `parser` and the `nothing` parser, and output fs`null | T`. */
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
    // deno-lint-ignore no-explicit-any
    (newParser: Parser<any>, parser) =>
      parser.then((value) => newParser.map((newValue) => [value, ...newValue])),
    nothing().map(() => []),
    // deno-lint-ignore no-explicit-any
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
 * Parses `parser` multiple times and returns an fs`Array<T>`. This function is
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
function describeSrc(src: string, expected: string): OutputError {
  if (src === "") {
    return new UnexpectedError("end of text", expected);
  } else {
    const token = src.match(/[^\s]*/)![0];
    let tokenDescription: string;
    if (token === "") {
      tokenDescription = "space";
    } else {
      tokenDescription = fs`"${token}"`;
    }
    return new UnexpectedError(tokenDescription, expected);
  }
}
/**
 * Uses Regular Expression to create parser. The parser outputs
 * RegExpMatchArray, which is what `string.match( ... )` returns.
 */
export function match(
  regex: RegExp,
  description: string,
): Parser<RegExpMatchArray> {
  const newRegex = new RegExp(fs`^${regex.source}`, regex.flags);
  return new Parser((src) => {
    const match = src.match(newRegex);
    if (match != null) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    } else {
      return new Output(describeSrc(src, description));
    }
  });
}
/** parses a string of consistent length. */
export function slice(length: number, description: string): Parser<string> {
  return new Parser((src) => {
    if (src.length < length) {
      if (src.length === 0) {
        return new Output(new UnexpectedError("end of text", description));
      } else {
        return new Output(describeSrc(src, description));
      }
    } else {
      return new Output([{
        rest: src.slice(length),
        value: src.slice(0, length),
      }]);
    }
  });
}
/** Parses a string that exactly matches the given string. */
export function matchString(
  match: string,
  description?: null | undefined | string,
): Parser<string> {
  return slice(match.length, fs`"${match}"`).map((slice) => {
    if (slice === match) {
      return match;
    } else {
      throw new UnexpectedError(fs`"${slice}"`, description ?? fs`"${match}"`);
    }
  });
}
/** Parses the end of line (or the end of sentence in context of Toki Pona) */
export function eol(): Parser<null> {
  return new Parser((src) => {
    if (src === "") {
      return new Output([{ value: null, rest: "" }]);
    } else {
      return new Output(describeSrc(src, "end of text"));
    }
  });
}
export function withSource<T>(parser: Parser<T>): Parser<[T, string]> {
  return new Parser((src) =>
    parser.parser(src).map((value) => ({
      value: [value.value, src.slice(0, src.length - value.rest.length)],
      rest: value.rest,
    }))
  );
}
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
