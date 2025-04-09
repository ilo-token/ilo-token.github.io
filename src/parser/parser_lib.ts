import { assertGreater } from "@std/assert/greater";
import { assertLessOrEqual } from "@std/assert/less-or-equal";
import { MemoizationCacheResult, memoize } from "@std/cache/memoize";
import { ArrayResult, ArrayResultError } from "../array_result.ts";

type Input = Readonly<{ source: string; position: number }>;
type ParserResult<T> = ArrayResult<Readonly<{ value: T; length: number }>>;
type InnerParser<T> = (input: Input) => ParserResult<T>;

let source = "";
const allMemo: Set<WeakRef<SourceMemo<unknown>>> = new Set();

function clearCache(): void {
  for (const memo of allMemo) {
    const ref = memo.deref();
    if (ref == null) {
      allMemo.delete(memo);
    } else {
      ref.clear();
    }
  }
}
class SourceMemo<T> {
  readonly #map: Map<number, T> = new Map();
  constructor() {
    allMemo.add(new WeakRef(this));
  }
  set(key: Input, value: T): void {
    if (source !== key.source) {
      source = key.source;
      clearCache();
    }
    this.#map.set(key.position, value);
  }
  get(key: Input): undefined | T {
    if (source === key.source) {
      return this.#map.get(key.position);
    } else {
      return undefined;
    }
  }
  has(key: Input): boolean {
    return source === key.source && this.#map.has(key.position);
  }
  delete(key: Input): void {
    if (source === key.source) {
      this.#map.delete(key.position);
    }
  }
  clear(): void {
    this.#map.clear();
  }
}
export class Parser<T> {
  readonly rawParser: InnerParser<T>;
  constructor(parser: InnerParser<T>) {
    this.rawParser = memoize<
      InnerParser<T>,
      Input,
      SourceMemo<MemoizationCacheResult<ParserResult<T>>>
    >(
      (input) => {
        // TODO: remove assertion
        assertLessOrEqual(input.position, input.source.length);
        return parser(input);
      },
      { cache: new SourceMemo() },
    );
  }
  generateParser(): (source: string) => ArrayResult<T> {
    return (input) => {
      clearCache();
      return this.rawParser({ source: input, position: 0 })
        .map(({ value }) => value);
    };
  }
  map<U>(mapper: (value: T) => U): Parser<U> {
    return new Parser((input) =>
      this.rawParser(input)
        .map(({ value, length }) => ({ value: mapper(value), length }))
    );
  }
  filter(mapper: (value: T) => boolean): Parser<T> {
    return new Parser((input) =>
      this.rawParser(input).filter(({ value }) => mapper(value))
    );
  }
  then<U>(mapper: (value: T) => Parser<U>): Parser<U> {
    return new Parser((input) =>
      this.rawParser(input)
        .flatMap(({ value, length }) =>
          mapper(value)
            .rawParser({
              source: input.source,
              position: input.position + length,
            })
            .map(({ value, length: addedLength }) => ({
              value,
              length: length + addedLength,
            }))
        )
    );
  }
  sort(comparer: (left: T, right: T) => number): Parser<T> {
    return new Parser((input) =>
      this.rawParser(input)
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
  new ArrayResult([{ value: null, length: 0 }])
);
export const emptyArray = nothing.map(() => []);
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((input) =>
    parser.rawParser(input)
      .map(({ value }) => ({ value, length: 0 }))
  );
}
export function lazy<T>(parser: () => Parser<T>): Parser<T> {
  return new Parser((input) => parser().rawParser(input));
}
export function choice<T>(...choices: ReadonlyArray<Parser<T>>): Parser<T> {
  assertGreater(
    choices.length,
    1,
    "`choice` called with less than 2 arguments",
  );
  return new Parser((input) =>
    new ArrayResult(choices).flatMap((parser) => parser.rawParser(input))
  );
}
export function choiceOnlyOne<T>(
  ...choices: ReadonlyArray<Parser<T>>
): Parser<T> {
  assertGreater(
    choices.length,
    1,
    "`choiceOnlyOne` called with less than 2 arguments",
  );
  return choices.reduceRight(
    (right, left) =>
      new Parser((input) => {
        const arrayResult = left.rawParser(input);
        if (arrayResult.isError()) {
          return ArrayResult.concat(arrayResult, right.rawParser(input));
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
  assertGreater(
    sequence.length,
    1,
    "`sequence` called with less than 2 arguments",
  );
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
      return new ArrayResult([{ value: match, length: match[0].length }]);
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
        length: match.length,
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
    length: source.length - position,
  }])
);
export const character = match(/./us, "character");
export const end = new Parser((input) =>
  input.position === input.source.length
    ? new ArrayResult([{ value: null, length: 0 }])
    : new ArrayResult(
      new UnexpectedError(
        describeSource(input.source.slice(input.position)),
        "end of text",
      ),
    )
);
export function withSource<T>(
  parser: Parser<T>,
): Parser<readonly [value: T, source: string]> {
  return new Parser((input) =>
    parser.rawParser(input).map(({ value, length }) => ({
      value: [
        value,
        input.source.slice(input.position, input.position + length),
      ] as const,
      length,
    }))
  );
}
export function sourceOnly(parser: Parser<unknown>): Parser<string> {
  return withSource(parser).map(([_, source]) => source);
}
