/**
 * A generic module for parser and parser combinator. It is used by both lexer
 * and AST parser.
 */

import { memoize } from "@std/cache/memoize";
import { ArrayResult, ArrayResultError } from "../array-result.ts";
import { Cache, Clearable, Lazy } from "../cache.ts";

/** A single parsing result. */
export type ValueRest<T> = Readonly<{ rest: string; value: T }>;
/** A special kind of ArrayResult that parsers returns. */
export type ParserResult<T> = ArrayResult<ValueRest<T>>;

/** Wrapper of parser function with added methods for convenience. */
export class Parser<T> {
  readonly #parser: (src: string) => ParserResult<T>;
  static cache: null | Cache = null;
  constructor(parser: (src: string) => ParserResult<T>) {
    const cache = new Map<string, ParserResult<T>>();
    if (Parser.cache != null) {
      Parser.cache.add(cache);
    }
    this.#parser = memoize(parser, { cache });
  }
  parser(src: string): ParserResult<T> {
    return ArrayResult.from(() => this.#parser(src));
  }
  /**
   * Maps the parsing result. For convenience, the mapper function can throw
   * an ArrayResultError; Other kinds of error are ignored.
   */
  map<U>(mapper: (value: T) => U): Parser<U> {
    return new Parser((src) =>
      this
        .parser(src)
        .map(({ value, rest }) => ({ value: mapper(value), rest }))
    );
  }
  /**
   * Filters ArrayResults. Instead of returning false, ArrayResultError must be thrown
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
    return sequence(this, parser).map(([_, arrayResult]) => arrayResult);
  }
  /** Takes another parser and discards its parsing result. */
  skip<U>(parser: Parser<U>): Parser<T> {
    return sequence(this, parser).map(([arrayResult]) => arrayResult);
  }
  parse(src: string): ArrayResult<T> {
    return this.parser(src).map(({ value }) => value);
  }
  static addToCache(cache: Clearable): void {
    Parser.cache?.add(cache);
  }
  static startCache(cache: Cache): void {
    Parser.cache = cache;
  }
  static endCache(): void {
    Parser.cache = null;
  }
  static startOrEndCache(cache: null | Cache = null): void {
    Parser.cache = cache;
  }
}
/** Represents Error with unexpected and expected elements. */
export class UnexpectedError extends ArrayResultError {
  constructor(unexpected: string, expected: string) {
    super(`unexpected ${unexpected}. ${expected} were expected instead`);
    this.name = "UnexpectedError";
  }
}
/** Represents Error caused by unrecognized elements. */
export class UnrecognizedError extends ArrayResultError {
  constructor(element: string) {
    super(`${element} is unrecognized`);
    this.name = "UnrecognizedError";
  }
}
/** Parser that always outputs an error. */
export function error(error: ArrayResultError): Parser<never> {
  return new Parser(() => {
    throw error;
  });
}
/** Parser that always outputs an empty ArrayResult. */
export const empty = new Parser<never>(() => new ArrayResult());
/** Parses nothing and leaves the source string intact. */
export const nothing = new Parser((src) =>
  new ArrayResult([{ value: null, rest: src }])
);
export const emptyArray = nothing.map(() => []);
/** Parses without consuming the source string */
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((src) =>
    parser.parser(src).map(({ value }) => ({ value, rest: src }))
  );
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
  const { cache } = Parser;
  const cachedParser = new Lazy(() => {
    const previousCache = Parser.cache;
    Parser.startOrEndCache(cache);
    const useParser = parser();
    Parser.startOrEndCache(previousCache);
    return useParser;
  });
  Parser.addToCache(cachedParser);
  return new Parser((src) => cachedParser.getValue().parser(src));
}
/**
 * Evaluates all parsers on the same source string and sums it all on a single
 * ArrayResult.
 */
export function choice<T>(...choices: Array<Parser<T>>): Parser<T> {
  return new Parser((src) =>
    new ArrayResult(choices).flatMap((parser) => parser.parser(src))
  );
}
/**
 * Tries to evaluate each parsers one at a time and only only use the ArrayResult of
 * the first parser that is successful.
 */
export function choiceOnlyOne<T>(
  ...choices: Array<Parser<T>>
): Parser<T> {
  return choices.reduceRight(
    (right, left) =>
      new Parser((src) => {
        const arrayResult = left.parser(src);
        if (arrayResult.isError()) {
          return ArrayResult.concat(arrayResult, right.parser(src));
        } else {
          return arrayResult;
        }
      }),
    empty,
  );
}
/** Combines `parser` and the `nothing` parser, and output `null | T`. */
export function optional<T>(parser: Parser<T>): Parser<null | T> {
  return choice(parser, nothing);
}
/**
 * Like `optional` but when the parser is successful, it doesn't consider
 * parsing nothing.
 */
export function optionalAll<T>(parser: Parser<T>): Parser<null | T> {
  return choiceOnlyOne(parser, nothing);
}
/** Takes all parsers and applies them one after another. */
export function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: Parser<T[I]> } & { length: T["length"] }
): Parser<T> {
  // We resorted to using `any` types here, make sure it works properly
  return sequence.reduceRight(
    (right: Parser<any>, left) =>
      left.then((value) => right.map((newValue) => [value, ...newValue])),
    nothing.map(() => []),
  ) as Parser<any>;
}
/**
 * Parses `parser` multiple times and returns an `Array<T>`. The resulting
 * ArrayResult includes all ArrayResult from parsing nothing to parsing as many as
 * possible.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
export function many_<T>(parser: Parser<T>): Parser<Array<T>> {
  return choice(
    sequence(parser, lazy(() => many(parser)))
      .map(([first, rest]) => [first, ...rest]),
    emptyArray,
  );
}
export const many = memoize(many_);
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
export function all_<T>(parser: Parser<T>): Parser<Array<T>> {
  return choiceOnlyOne(
    sequence(parser, lazy(() => all(parser)))
      .map(([first, rest]) => [first, ...rest]),
    emptyArray,
  );
}
export const all = memoize(all_);
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
function describeSource(src: string): string {
  if (src === "") {
    return "end of text";
  } else {
    const [token] = src.match(/\S*/)!;
    if (token === "") {
      if (/^[\n\r]/.test(src)) {
        return "newline";
      } else {
        return "space";
      }
    } else {
      return `"${token}"`;
    }
  }
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
      return new ArrayResult([{
        value: match,
        rest: src.slice(match[0].length),
      }]);
    }
    throw new UnexpectedError(describeSource(src), description);
  });
}
export function match(regex: RegExp, description: string): Parser<string> {
  return matchCapture(regex, description).map(([matched]) => matched);
}
/** parses a string of consistent length. */
export function slice(length: number, description: string): Parser<string> {
  return new Parser((src) => {
    if (src.length >= length) {
      return new ArrayResult([{
        rest: src.slice(length),
        value: src.slice(0, length),
      }]);
    }
    throw new UnexpectedError(describeSource(src), description);
  });
}
/** Parses a string that exactly matches the given string. */
export function matchString(
  match: string,
  description: string = `"${match}"`,
): Parser<string> {
  return new Parser((src) => {
    if (src.length >= match.length && src.slice(0, match.length) === match) {
      return new ArrayResult([{ rest: src.slice(match.length), value: match }]);
    }
    throw new UnexpectedError(describeSource(src), description);
  });
}
export const character = match(/./us, "character");
/** Parses the end of text */
export const end = new Parser((src) => {
  if (src === "") {
    return new ArrayResult([{ value: null, rest: "" }]);
  }
  throw new UnexpectedError(describeSource(src), "end of text");
});
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
export function sourceOnly<T>(
  parser: Parser<T>,
): Parser<string> {
  return withSource(parser).map(([_, source]) => source);
}
