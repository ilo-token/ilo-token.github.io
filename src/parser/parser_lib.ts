import { assert } from "@std/assert/assert";
import { MemoizationCacheResult, memoize } from "@std/cache/memoize";
import { ArrayResult, ArrayResultError } from "../array_result.ts";
import { Clearable, ClearableCacheSet, Lazy } from "../cache.ts";

export type ValueRest<T> = Readonly<{ rest: string; value: T }>;
export type ParserResult<T> = ArrayResult<ValueRest<T>>;

export class Parser<T> {
  readonly nonMemoizedParser: (source: string) => ParserResult<T>;
  readonly rawParser: (source: string) => ParserResult<T>;
  static cache: null | ClearableCacheSet = null;
  constructor(parser: (source: string) => ParserResult<T>) {
    this.nonMemoizedParser = parser;
    if (Parser.cache != null) {
      const cache: Map<string, MemoizationCacheResult<ParserResult<T>>> =
        new Map();
      Parser.addToCache(cache);
      this.rawParser = memoize(this.nonMemoizedParser, { cache });
    } else {
      this.rawParser = this.nonMemoizedParser;
    }
  }
  parser(): (source: string) => ArrayResult<T> {
    const { rawParser } = this;
    return (source) => rawParser(source).map(({ value }) => value);
  }
  map<U>(mapper: (value: T) => U): Parser<U> {
    const { nonMemoizedParser } = this;
    return new Parser((source) =>
      nonMemoizedParser(source)
        .map(({ value, rest }) => ({ value: mapper(value), rest }))
    );
  }
  filter(mapper: (value: T) => boolean): Parser<T> {
    const { nonMemoizedParser } = this;
    return new Parser((source) =>
      nonMemoizedParser(source).filter(({ value }) => mapper(value))
    );
  }
  then<U>(mapper: (value: T) => Parser<U>): Parser<U> {
    const { cache } = Parser;
    const { nonMemoizedParser } = this;
    return new Parser((source) => {
      const parser = Parser.inContext(() => nonMemoizedParser(source), cache);
      return parser.flatMap(({ value, rest }) => mapper(value).rawParser(rest));
    });
  }
  sort(comparer: (left: T, right: T) => number): Parser<T> {
    const { nonMemoizedParser } = this;
    return new Parser((source) =>
      nonMemoizedParser(source).sort((left, right) =>
        comparer(left.value, right.value)
      )
    );
  }
  sortBy(mapper: (value: T) => number): Parser<T> {
    return this.sort((left, right) => mapper(left) - mapper(right));
  }
  with<U>(parser: Parser<U>): Parser<U> {
    return sequence(this, parser).map(([_, arrayResult]) => arrayResult);
  }
  skip<U>(parser: Parser<U>): Parser<T> {
    return sequence(this, parser).map(([arrayResult]) => arrayResult);
  }
  static addToCache(cache: Clearable): void {
    Parser.cache?.add(cache);
  }
  static startCache(cache: ClearableCacheSet = new ClearableCacheSet()): void {
    Parser.cache = cache;
  }
  static endCache(): void {
    Parser.cache = null;
  }
  static startOrEndCache(cache: null | ClearableCacheSet = null): void {
    Parser.cache = cache;
  }
  static inContext<T>(fn: () => T, cache: null | ClearableCacheSet = null): T {
    const previousCache = Parser.cache;
    Parser.startOrEndCache(cache);
    const value = fn();
    Parser.startOrEndCache(previousCache);
    return value;
  }
}
export class UnexpectedError extends ArrayResultError {
  constructor(unexpected: string, expected: string) {
    super(`unexpected ${unexpected}. ${expected} were expected instead`);
    this.name = "UnexpectedError";
  }
}
export class UnrecognizedError extends ArrayResultError {
  constructor(element: string) {
    super(`${element} is unrecognized`);
    this.name = "UnrecognizedError";
  }
}
export function error(error: ArrayResultError): Parser<never> {
  return new Parser(() => new ArrayResult(error));
}
export const empty = new Parser<never>(() => new ArrayResult());
export const nothing = new Parser((source) =>
  new ArrayResult([{ value: null, rest: source }])
);
export const emptyArray = nothing.map(() => []);
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((source) =>
    parser.nonMemoizedParser(source).map(({ value }) => ({
      value,
      rest: source,
    }))
  );
}
export function lazy<T>(parser: () => Parser<T>): Parser<T> {
  const { cache } = Parser;
  if (Parser.cache != null) {
    const cachedParser = new Lazy(() => Parser.inContext(parser, cache));
    Parser.addToCache(cachedParser);
    return new Parser((source) =>
      cachedParser.getValue().nonMemoizedParser(source)
    );
  } else {
    return new Parser((source) =>
      Parser.inContext(parser, cache).nonMemoizedParser(source)
    );
  }
}
export function choice<T>(...choices: ReadonlyArray<Parser<T>>): Parser<T> {
  assert(choices.length > 1, "`choice` called with less than 2 arguments");
  return new Parser((source) =>
    new ArrayResult(choices).flatMap((parser) => parser.rawParser(source))
  );
}
export function choiceOnlyOne<T>(
  ...choices: ReadonlyArray<Parser<T>>
): Parser<T> {
  assert(
    choices.length > 1,
    "`choiceOnlyOne` called with less than 2 arguments",
  );
  return choices.reduceRight(
    (right, left) =>
      new Parser((source) => {
        const arrayResult = left.rawParser(source);
        if (arrayResult.isError()) {
          return ArrayResult.concat(arrayResult, right.rawParser(source));
        } else {
          return arrayResult;
        }
      }),
    empty,
  );
}
export function optional<T>(parser: Parser<T>): Parser<null | T> {
  return choice(parser, nothing);
}
export function optionalAll<T>(parser: Parser<T>): Parser<null | T> {
  return choiceOnlyOne(parser, nothing);
}
export function sequence<T extends ReadonlyArray<unknown>>(
  ...sequence:
    & Readonly<{ [I in keyof T]: Parser<T[I]> }>
    & Readonly<{ length: T["length"] }>
): Parser<T> {
  assert(sequence.length > 1, "`sequence` called with less than 2 arguments");
  // We resorted to using `any` types here, make sure it works properly
  return sequence.reduceRight(
    (right: Parser<any>, left) =>
      left.then((value) => right.map((newValue) => [value, ...newValue])),
    emptyArray,
  ) as Parser<any>;
}
export const many = memoize(<T>(parser: Parser<T>): Parser<ReadonlyArray<T>> =>
  choice(
    sequence(parser, lazy(() => many(parser)))
      .map(([first, rest]) => [first, ...rest]),
    emptyArray,
  )
);
export function manyAtLeastOnce<T>(
  parser: Parser<T>,
): Parser<ReadonlyArray<T>> {
  return sequence(parser, many(parser))
    .map(([first, rest]) => [first, ...rest]);
}
export const all = memoize(<T>(parser: Parser<T>): Parser<ReadonlyArray<T>> =>
  choiceOnlyOne(
    sequence(parser, lazy(() => all(parser)))
      .map(([first, rest]) => [first, ...rest]),
    emptyArray,
  )
);
export function allAtLeastOnce<T>(parser: Parser<T>): Parser<ReadonlyArray<T>> {
  return sequence(parser, all(parser))
    .map(([first, rest]) => [first, ...rest]);
}
export function count(parser: Parser<{ length: number }>): Parser<number> {
  return parser.map(({ length }) => length);
}
function describeSource(source: string): string {
  if (source === "") {
    return "end of text";
  } else {
    const [token] = source.match(/\S*/)!;
    if (token === "") {
      if (/^\r?\n/.test(source)) {
        return "newline";
      } else {
        return "space";
      }
    } else {
      return `"${token}"`;
    }
  }
}
export function matchCapture(
  regex: RegExp,
  description: string,
): Parser<RegExpMatchArray> {
  const newRegex = new RegExp(`^${regex.source}`, regex.flags);
  return new Parser((source) => {
    const match = source.match(newRegex);
    if (match != null) {
      return new ArrayResult([{
        value: match,
        rest: source.slice(match[0].length),
      }]);
    } else {
      return new ArrayResult(
        new UnexpectedError(describeSource(source), description),
      );
    }
  });
}
export function match(regex: RegExp, description: string): Parser<string> {
  return matchCapture(regex, description).map(([matched]) => matched);
}
export function slice(length: number, description: string): Parser<string> {
  return new Parser((source) =>
    source.length >= length
      ? new ArrayResult([{
        rest: source.slice(length),
        value: source.slice(0, length),
      }])
      : new ArrayResult(
        new UnexpectedError(describeSource(source), description),
      )
  );
}
export function matchString(
  match: string,
  description = `"${match}"`,
): Parser<string> {
  return new Parser((source) =>
    source.length >= match.length && source.slice(0, match.length) === match
      ? new ArrayResult([{
        rest: source.slice(match.length),
        value: match,
      }])
      : new ArrayResult(
        new UnexpectedError(describeSource(source), description),
      )
  );
}
export const everything = new Parser((source) =>
  new ArrayResult([{ value: source, rest: "" }])
);
export const character = match(/./us, "character");
export const end = new Parser((source) =>
  source === ""
    ? new ArrayResult([{ value: null, rest: "" }])
    : new ArrayResult(
      new UnexpectedError(describeSource(source), "end of text"),
    )
);
export function withSource<T>(
  parser: Parser<T>,
): Parser<readonly [value: T, source: string]> {
  return new Parser((source) =>
    parser.nonMemoizedParser(source).map(({ value, rest }) => ({
      value: [value, source.slice(0, source.length - rest.length)],
      rest,
    }))
  );
}
export function sourceOnly(parser: Parser<unknown>): Parser<string> {
  return withSource(parser).map(([_, source]) => source);
}
