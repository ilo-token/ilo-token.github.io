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
  /** Suppresses all error. */
  silent(): Parser<T, U> {
    return new Parser((src) => new Output(this.parser(src).output));
  }
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
 * Tries to evaluate each parsers one at a time and only returns the first
 * Output without error.
 */
export function choiceOnlyOne<T, U>(
  ...choices: Array<Parser<T, U>>
): Parser<T, U> {
  return new Parser((src) =>
    choices.reduce((output, parser) => {
      if (output.isError()) return parser.parser(src);
      else return output;
    }, new Output<ValueRest<T, U>>())
  );
}
/** Combines `parser` and the `nothing` parser, and output `null | T`. */
export function optional<T, U>(parser: Parser<T, U>): Parser<T, null | U> {
  return choice(parser, nothing());
}
/** Takes all parsers and applies them one after another. */
// Typescript really struggles with inferring types when using this function
export function sequence<T, U extends Array<unknown>>(
  ...sequence: { [I in keyof U]: Parser<T, U[I]> } & { length: U["length"] }
): Parser<T, U> {
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
      new Output<ValueRest<T, any>>([{ value: [], rest: src }]),
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
