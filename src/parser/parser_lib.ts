import { memoize } from "@std/cache/memoize";
import { ArrayResult, ArrayResultError } from "../array_result.ts";
import { Cache, Clearable, Lazy } from "../cache.ts";

export type ValueRest<T> = Readonly<{ rest: string; value: T }>;
export type ParserResult<T> = ArrayResult<ValueRest<T>>;

export class Parser<T> {
  readonly unmemoizedParser: (src: string) => ParserResult<T>;
  readonly rawParser: (src: string) => ParserResult<T>;
  static cache: null | Cache = null;
  constructor(parser: (src: string) => ParserResult<T>) {
    this.unmemoizedParser = (src: string) =>
      ArrayResult.from(() => parser(src));
    if (Parser.cache != null) {
      const cache = new Map<string, ParserResult<T>>();
      Parser.addToCache(cache);
      this.rawParser = memoize(this.unmemoizedParser, { cache });
    } else {
      this.rawParser = this.unmemoizedParser;
    }
  }
  parser(): (src: string) => ArrayResult<T> {
    const { rawParser } = this;
    return (src) => rawParser(src).map(({ value }) => value);
  }
  map<U>(mapper: (value: T) => U): Parser<U> {
    const { unmemoizedParser } = this;
    return new Parser((src) =>
      unmemoizedParser(src)
        .map(({ value, rest }) => ({ value: mapper(value), rest }))
    );
  }
  filter(mapper: (value: T) => boolean): Parser<T> {
    const { unmemoizedParser } = this;
    return new Parser((src) =>
      unmemoizedParser(src).filter(({ value }) => mapper(value))
    );
  }
  then<U>(mapper: (value: T) => Parser<U>): Parser<U> {
    const { cache } = Parser;
    const { unmemoizedParser } = this;
    return new Parser((src) => {
      const parser = Parser.inContext(() => unmemoizedParser(src), cache);
      return parser.flatMap(({ value, rest }) => mapper(value).rawParser(rest));
    });
  }
  sort(comparer: (left: T, right: T) => number): Parser<T> {
    const { unmemoizedParser } = this;
    return new Parser((src) =>
      unmemoizedParser(src).sort((left, right) =>
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
  static startCache(cache: Cache = new Cache()): void {
    Parser.cache = cache;
  }
  static endCache(): void {
    Parser.cache = null;
  }
  static startOrEndCache(cache: null | Cache = null): void {
    Parser.cache = cache;
  }
  static inContext<T>(fn: () => T, cache: null | Cache = null): T {
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
  return new Parser(() => {
    throw error;
  });
}
export const empty = new Parser<never>(() => new ArrayResult());
export const nothing = new Parser((src) =>
  new ArrayResult([{ value: null, rest: src }])
);
export const emptyArray = nothing.map(() => []);
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((src) =>
    parser.unmemoizedParser(src).map(({ value }) => ({ value, rest: src }))
  );
}
export function lazy<T>(parser: () => Parser<T>): Parser<T> {
  const { cache } = Parser;
  if (Parser.cache != null) {
    const cachedParser = new Lazy(() => Parser.inContext(parser, cache));
    Parser.addToCache(cachedParser);
    return new Parser((src) => cachedParser.getValue().unmemoizedParser(src));
  } else {
    return new Parser((src) =>
      Parser.inContext(parser, cache).unmemoizedParser(src)
    );
  }
}
export function choice<T>(...choices: ReadonlyArray<Parser<T>>): Parser<T> {
  return new Parser((src) =>
    new ArrayResult(choices).flatMap((parser) => parser.rawParser(src))
  );
}
export function choiceOnlyOne<T>(
  ...choices: ReadonlyArray<Parser<T>>
): Parser<T> {
  return choices.reduceRight(
    (right, left) =>
      new Parser((src) => {
        const arrayResult = left.rawParser(src);
        if (arrayResult.isError()) {
          return ArrayResult.concat(arrayResult, right.rawParser(src));
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
  ...sequence: { [I in keyof T]: Parser<T[I]> } & { length: T["length"] }
): Parser<T> {
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
export const everything = new Parser((src) =>
  new ArrayResult([{ value: src, rest: "" }])
);
export const character = match(/./us, "character");
export const end = new Parser((src) => {
  if (src === "") {
    return new ArrayResult([{ value: null, rest: "" }]);
  }
  throw new UnexpectedError(describeSource(src), "end of text");
});
export function withSource<T>(
  parser: Parser<T>,
): Parser<readonly [value: T, source: string]> {
  return new Parser((src) =>
    parser.unmemoizedParser(src).map((value) => ({
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
