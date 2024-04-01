/**
 * A generic module for parser and parser combinator. It is used by both lexer
 * and AST parser.
 */

import { OutputError } from "./error.ts";
import { Output } from "./output.ts";

/** A single parsing result. */
export type ValueRest<T, U> = { rest: T; value: U };
/** A special kind of Output that parsers returns. */
export type ParserOutput<T, U> = Output<ValueRest<T, U>>;

/** Wrapper of parser function with added methods for convenience. */
export class Parser<T, U> {
  constructor(public readonly parser: (src: T) => ParserOutput<T, U>) {}
  /**
   * Maps the parsing result. For convenience, the mapper function can throw
   * an OutputError; Other kinds of error are ignored.
   */
  map<V>(mapper: (value: U) => V): Parser<T, V> {
    return new Parser((src) =>
      this.parser(src).map(({ value, rest }) => ({
        value: mapper(value),
        rest,
      }))
    );
  }
  /** TODO better comment. */
  flatMapValue<V>(mapper: (value: U) => Output<V>): Parser<T, V> {
    return new Parser((src) =>
      this.parser(src).flatMap(({ value, rest }) =>
        mapper(value).map((value) => ({ value, rest }))
      )
    );
  }
  /**
   * Filters outputs. Instead of returning false, OutputError must be thrown
   * instead.
   */
  filter(mapper: (value: U) => boolean): Parser<T, U> {
    return new Parser((src) =>
      this.parser(src).filter(({ value }) => mapper(value))
    );
  }
  /**
   * Parses `this` then passes the parsing result in the mapper. The resulting
   * parser is then also parsed.
   */
  then<V>(mapper: (value: U) => Parser<T, V>): Parser<T, V> {
    return new Parser((src) =>
      this.parser(src).flatMap(({ value, rest }) => mapper(value).parser(rest))
    );
  }
  /** Takes another parser and discards the parsing result of `this`. */
  with<V>(parser: Parser<T, V>): Parser<T, V> {
    return sequence<T, [U, V]>(this, parser).map(([_, output]) => output);
  }
  /** Takes another parser and discards its parsing result. */
  skip<V>(parser: Parser<T, V>): Parser<T, U> {
    return sequence<T, [U, V]>(this, parser).map(([output, _]) => output);
  }
  parse(src: T): Output<U> {
    return this.parser(src).map(({ value }) => value);
  }
}
/** Parser that always outputs an error. */
export function error<T>(error: OutputError): Parser<T, never> {
  return new Parser(() => new Output(error));
}
/** Parser that always outputs an empty output. */
export function empty<T>(): Parser<T, never> {
  return new Parser(() => new Output());
}
/** Parses nothing and leaves the source string intact. */
export function nothing<T>(): Parser<T, null> {
  return new Parser((src) => new Output([{ value: null, rest: src }]));
}
/** Parses without consuming the source string */
export function lookAhead<T, U>(parser: Parser<T, U>): Parser<T, U> {
  return new Parser((src) =>
    parser.parser(src).map(({ value }) => ({ value, rest: src }))
  );
}
/**
 * Lazily evaluates the parser function only when needed. Useful for recursive
 * parsers.
 */
export function lazy<T, U>(parser: () => Parser<T, U>): Parser<T, U> {
  return new Parser((src) => parser().parser(src));
}
/**
 * Evaluates all parsers on the same source string and sums it all on a single
 * Output.
 */
export function choice<T, U>(...choices: Array<Parser<T, U>>): Parser<T, U> {
  return new Parser((src) =>
    new Output(choices).flatMap((parser) => parser.parser(src))
  );
}
/**
 * Tries to evaluate each parsers one at a time and only only use the output of
 * the parser that is successful.
 */
export function choiceOnlyOne<T, U>(
  ...choices: Array<Parser<T, U>>
): Parser<T, U> {
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
/** Combines `parser` and the `nothing` parser, and output `null | T`. */
export function optional<T, U>(parser: Parser<T, U>): Parser<T, null | U> {
  return choice(parser, nothing());
}
/**
 * Like `optional` but when the parser is successful, it doesn't consider
 * parsing nothing.
 */
export function optionalAll<T, U>(parser: Parser<T, U>): Parser<T, null | U> {
  return choiceOnlyOne(parser, nothing());
}
/** Takes all parsers and applies them one after another. */
// Typescript really struggles with inferring types when using this function
export function sequence<T, U extends Array<unknown>>(
  ...sequence: { [I in keyof U]: Parser<T, U[I]> } & { length: U["length"] }
): Parser<T, U> {
  // We resorted to using `any` types here, make sure it works properly
  // deno-lint-ignore no-explicit-any
  return (sequence as Array<any>).reduceRight(
    (newParser, parser) =>
      // deno-lint-ignore no-explicit-any
      parser.then((value: any) =>
        // deno-lint-ignore no-explicit-any
        newParser.map((newValue: any) => [value, ...newValue])
      ),
    nothing().map(() => []),
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
export function many<T, U>(parser: Parser<T, U>): Parser<T, Array<U>> {
  return choice<T, Array<U>>(
    sequence<T, [U, Array<U>]>(parser, lazy(() => many(parser))).map((
      [first, rest],
    ) => [first, ...rest]),
    nothing<T>().map(() => []),
  );
}
/**
 * Like `many` but parses at least once.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
export function manyAtLeastOnce<T, U>(
  parser: Parser<T, U>,
): Parser<T, Array<U>> {
  return sequence<T, [U, Array<U>]>(parser, many(parser)).map((
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
export function all<T, U>(parser: Parser<T, U>): Parser<T, Array<U>> {
  return choiceOnlyOne<T, Array<U>>(
    sequence<T, [U, Array<U>]>(parser, lazy(() => all(parser))).map((
      [first, rest],
    ) => [first, ...rest]),
    nothing<T>().map(() => []),
  );
}
/**
 * Like `all` but parses at least once.
 *
 * ## ⚠️ Warning
 *
 * Will cause infinite recursion if the parser can parse nothing.
 */
export function allAtLeastOnce<T, U>(
  parser: Parser<T, U>,
): Parser<T, Array<U>> {
  return sequence<T, [U, Array<U>]>(parser, all(parser)).map((
    [first, rest],
  ) => [first, ...rest]);
}
