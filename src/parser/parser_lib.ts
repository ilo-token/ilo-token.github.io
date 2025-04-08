import { assert } from "@std/assert/assert";
import { MemoizationCacheResult, memoize } from "@std/cache/memoize";
import { ArrayResult, ArrayResultError } from "../array_result.ts";

type Source = Readonly<{ source: string; position: number }>;
type ParserResult<T> = ArrayResult<Readonly<{ value: T; size: number }>>;
type InnerParser<T> = (input: Source) => ParserResult<T>;

class SourceMemo<T> {
  #source = "";
  readonly #map: Map<number, T> = new Map();
  set(key: Source, value: T): void {
    if (this.#source !== key.source) {
      this.#source = key.source;
      this.clear();
    }
    this.#map.set(key.position, value);
  }
  get(key: Source): undefined | T {
    if (this.#source === key.source) {
      return this.#map.get(key.position);
    } else {
      return undefined;
    }
  }
  has(key: Source): boolean {
    return this.#source === key.source && this.#map.has(key.position);
  }
  delete(key: Source): void {
    if (this.#source === key.source) {
      this.#map.delete(key.position);
    }
  }
  clear(): void {
    this.#map.clear();
  }
}
type SourceMemoResult<T> = SourceMemo<MemoizationCacheResult<ParserResult<T>>>;

const caches: Set<WeakRef<SourceMemo<unknown>>> = new Set();

export function clearCache(): void {
  for (const memo of caches) {
    const ref = memo.deref();
    if (ref == null) {
      caches.delete(memo);
    } else {
      ref.clear();
    }
  }
}
export class Parser<T> {
  readonly rawParser: InnerParser<T>;
  constructor(parser: InnerParser<T>) {
    // TODO: remove assertion
    const ensureParser: InnerParser<T> = (source) => {
      assert(source.source.length >= source.position);
      return parser(source);
    };
    const cache: SourceMemoResult<T> = new SourceMemo();
    caches.add(new WeakRef(cache));
    this.rawParser = memoize<InnerParser<T>, Source, SourceMemoResult<T>>(
      ensureParser,
      { cache },
    );
  }
  generateParser(): (source: string) => ArrayResult<T> {
    return (source) =>
      this.rawParser({ source, position: 0 })
        .map(({ value }) => value);
  }
  map<U>(mapper: (value: T) => U): Parser<U> {
    return new Parser((source) =>
      this.rawParser(source)
        .map(({ value, size }) => ({ value: mapper(value), size }))
    );
  }
  filter(mapper: (value: T) => boolean): Parser<T> {
    return new Parser((source) =>
      this.rawParser(source).filter(({ value }) => mapper(value))
    );
  }
  then<U>(mapper: (value: T) => Parser<U>): Parser<U> {
    return new Parser((source) =>
      this
        .rawParser(source)
        .flatMap(({ value, size }) =>
          mapper(value)
            .rawParser({
              source: source.source,
              position: source.position + size,
            })
            .map(({ value, size: addedSize }) => ({
              value,
              size: size + addedSize,
            }))
        )
    );
  }
  sort(comparer: (left: T, right: T) => number): Parser<T> {
    return new Parser((source) =>
      this.rawParser(source)
        .sort((left, right) => comparer(left.value, right.value))
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
export const nothing = new Parser(() =>
  new ArrayResult([{ value: null, size: 0 }])
);
export const emptyArray = nothing.map(() => []);
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((source) =>
    parser.rawParser(source)
      .map(({ value }) => ({ value, size: 0 }))
  );
}
export function lazy<T>(parser: () => Parser<T>): Parser<T> {
  return new Parser((source) => parser().rawParser(source));
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
  return new Parser(({ source, position }) => {
    const sourceString = source.slice(position);
    const match = sourceString.match(newRegex);
    if (match != null) {
      return new ArrayResult([{ value: match, size: match[0].length }]);
    } else {
      return new ArrayResult(
        new UnexpectedError(describeSource(sourceString), description),
      );
    }
  });
}
export function match(regex: RegExp, description: string): Parser<string> {
  return matchCapture(regex, description).map(([matched]) => matched);
}
export function matchString(
  match: string,
  description = `"${match}"`,
): Parser<string> {
  return new Parser(({ source, position }) => {
    if (
      source.length - position >= match.length &&
      source.slice(position, position + match.length) === match
    ) {
      return new ArrayResult([{
        value: match,
        size: match.length,
      }]);
    } else {
      return new ArrayResult(
        new UnexpectedError(
          describeSource(source.slice(position)),
          description,
        ),
      );
    }
  });
}
export const everything = new Parser(({ source, position }) =>
  new ArrayResult([{
    value: source.slice(position),
    size: source.length - position,
  }])
);
export const character = match(/./us, "character");
export const end = new Parser((source) =>
  source.position === source.source.length
    ? new ArrayResult([{ value: null, size: 0 }])
    : new ArrayResult(
      new UnexpectedError(
        describeSource(source.source.slice(source.position)),
        "end of text",
      ),
    )
);
export function withSource<T>(
  parser: Parser<T>,
): Parser<readonly [value: T, source: string]> {
  return new Parser((source) =>
    parser.rawParser(source).map(({ value, size }) => ({
      value: [
        value,
        source.source.slice(source.position, source.position + size),
      ] as const,
      size,
    }))
  );
}
export function sourceOnly(parser: Parser<unknown>): Parser<string> {
  return withSource(parser).map(([_, source]) => source);
}
