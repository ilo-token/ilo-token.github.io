import { assertGreater } from "@std/assert/greater";
import { MemoizationCacheResult, memoize } from "@std/cache/memoize";
import { lazy as lazyEval } from "../../misc/misc.ts";
import { ArrayResult, ResultError } from "../compound.ts";

type ValueLength<T> = Readonly<{ value: T; length: number }>;
type ParserResult<T> = ArrayResult<ValueLength<T>>;
type RawParser<T> = (input: number) => ParserResult<T>;
type Cache<T> = Map<number, MemoizationCacheResult<ParserResult<T>>>;

let currentSource = "";
const allCache: Set<WeakRef<Cache<unknown>>> = new Set();

export class Parser<T> {
  readonly rawParser: RawParser<T>;
  constructor(parser: RawParser<T>) {
    const cache: Cache<T> = new Map();
    allCache.add(new WeakRef(cache));
    this.rawParser = memoize<RawParser<T>, number, Cache<T>>(
      parser,
      { cache },
    );
  }
  parse(source: string): ArrayResult<T> {
    currentSource = source;
    for (const memo of allCache) {
      const ref = memo.deref();
      if (ref == null) {
        allCache.delete(memo);
      } else {
        ref.clear();
      }
    }
    return this.rawParser(0).map(({ value }) => value);
  }
  map<U>(mapper: (value: T) => U): Parser<U> {
    return new Parser((input) =>
      this.rawParser(input)
        .map(({ value, length }): ValueLength<U> => ({
          value: mapper(value),
          length,
        }))
    );
  }
  mapWithPositionedError<U>(mapper: (value: T) => U): Parser<U> {
    return withPosition(this)
      .map((value) => withPositionedError(() => mapper(value.value), value));
  }
  filter(mapper: (value: T) => boolean): Parser<T> {
    return new Parser((input) =>
      this.rawParser(input).filter(({ value }) => mapper(value))
    );
  }
  filterWithPositionedError(mapper: (value: T) => boolean): Parser<T> {
    return withPosition(this)
      .filter((value) => withPositionedError(() => mapper(value.value), value))
      .map(({ value }) => value);
  }
  then<U>(mapper: (value: T) => Parser<U>): Parser<U> {
    return new Parser((position) =>
      this.rawParser(position)
        .flatMap(({ value, length }) =>
          mapper(value)
            .rawParser(position + length)
            .map(({ value, length: addedLength }): ValueLength<U> => ({
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
export type Position = Readonly<{ position: number; length: number }>;
export class PositionedError extends ResultError {
  public position: null | Position;
  override name = "PositionedError";
  constructor(message: string, position?: Position) {
    super(message);
    this.position = position ?? null;
  }
}
function withPositionedError<T>(fn: () => T, position: Position) {
  try {
    return fn();
  } catch (error) {
    if (typeof error === "string") {
      throw new PositionedError(error, position);
    } else {
      throw error;
    }
  }
}
export class UnexpectedError extends PositionedError {
  override name = "UnexpectedError";
  constructor(unexpected: string, expected: string, position?: Position) {
    super(
      `unexpected ${unexpected}. ${expected} were expected instead`,
      position,
    );
  }
}
export class UnrecognizedError extends PositionedError {
  override name = "UnrecognizedError";
  constructor(element: string, position?: Position) {
    super(`${element} is unrecognized`, position);
  }
}
export function error(error: ResultError): Parser<never> {
  return new Parser(() => ArrayResult.errors([error]));
}
export const empty: Parser<never> = new Parser(() => ArrayResult.empty());
export const nothing: Parser<null> = new Parser(() =>
  new ArrayResult([{ value: null, length: 0 }])
);
export const emptyArray: Parser<ReadonlyArray<never>> = nothing.map(() => []);
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser((input) =>
    parser.rawParser(input)
      .map(({ value }): ValueLength<T> => ({ value, length: 0 }))
  );
}
export function lazy<T>(parser: () => Parser<T>): Parser<T> {
  return new Parser((input) => parser().rawParser(input));
}
export function choice<T>(
  ...choices: ReadonlyArray<Parser<T>>
): Parser<T> {
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
  // we resorted to using `any` types here, make sure it works properly
  return sequence.reduceRight(
    (right: Parser<any>, left) =>
      left.then((value) => right.map((newValue) => [value, ...newValue])),
    emptyArray,
  ) as Parser<any>;
}
export const many = memoize(<T>(
  parser: Parser<T>,
): Parser<ReadonlyArray<T>> =>
  choice(
    sequence(parser, lazy(lazyEval(() => many(parser))))
      .map(([first, rest]): ReadonlyArray<T> => [first, ...rest]),
    emptyArray,
  )
);
export function manyAtLeastOnce<T>(
  parser: Parser<T>,
): Parser<ReadonlyArray<T>> {
  return sequence(parser, many(parser))
    .map(([first, rest]) => [first, ...rest]);
}
export const all = memoize(<T>(
  parser: Parser<T>,
): Parser<ReadonlyArray<T>> =>
  choiceOnlyOne(
    sequence(parser, lazy(lazyEval(() => all(parser))))
      .map(([first, rest]): ReadonlyArray<T> => [first, ...rest]),
    emptyArray,
  )
);
export function allAtLeastOnce<T>(
  parser: Parser<T>,
): Parser<ReadonlyArray<T>> {
  return sequence(parser, all(parser))
    .map(([first, rest]) => [first, ...rest]);
}
export function count(
  parser: Parser<Readonly<{ length: number }>>,
): Parser<number> {
  return parser.map(({ length }) => length);
}
function generateError(position: number, expected: string) {
  let unexpected: string;
  let length: number;
  if (position === currentSource.length) {
    unexpected = "end of text";
    length = 0;
  } else {
    const sourceString = currentSource.slice(position);
    const [token] = sourceString.match(/^\S*/)!;
    if (token === "") {
      if (/^\r?\n/.test(sourceString)) {
        unexpected = "newline";
        length = 0;
      } else {
        const [token] = sourceString.match(/^\s+?(?=\S|\r?\n|$)/)!;
        unexpected = "space";
        length = token.length;
      }
    } else {
      unexpected = `"${token}"`;
      length = token.length;
    }
  }
  return ArrayResult.errors([
    new UnexpectedError(unexpected, expected, { position, length }),
  ]);
}
export function matchCapture(
  regex: RegExp,
  description: string,
): Parser<RegExpMatchArray> {
  const newRegex = new RegExp(`^${regex.source}`, regex.flags);
  return new Parser((position) => {
    const match = currentSource.slice(position).match(newRegex);
    if (match != null) {
      return new ArrayResult([{ value: match, length: match[0].length }]);
    } else {
      return generateError(position, description);
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
  return new Parser((position) => {
    if (
      currentSource.length - position >= match.length &&
      currentSource.slice(position, position + match.length) === match
    ) {
      return new ArrayResult([{
        value: match,
        length: match.length,
      }]);
    } else {
      return generateError(position, description);
    }
  });
}
export const allRest: Parser<string> = new Parser((position) =>
  new ArrayResult([{
    value: currentSource.slice(position),
    length: currentSource.length - position,
  }])
);
export const end: Parser<null> = new Parser((position) =>
  position === currentSource.length
    ? new ArrayResult([{ value: null, length: 0 }])
    : generateError(position, "end of text")
);
export const notEnd: Parser<null> = new Parser((position) =>
  position < currentSource.length
    ? new ArrayResult([{ value: null, length: 0 }])
    : ArrayResult.errors([
      new UnexpectedError(
        "end of text",
        "not end of text",
        { position, length: currentSource.length - position },
      ),
    ])
);
export type WithSource<T> = readonly [value: T, source: string];
export function withSource<T>(parser: Parser<T>): Parser<WithSource<T>> {
  return new Parser((position) =>
    parser.rawParser(position).map(
      ({ value, length }): ValueLength<WithSource<T>> => ({
        value: [
          value,
          currentSource.slice(position, position + length),
        ],
        length,
      }),
    )
  );
}
export type WithPosition<T> = Readonly<{ value: T }> & Position;
export function withPosition<T>(parser: Parser<T>): Parser<WithPosition<T>> {
  return new Parser((position) =>
    parser.rawParser(position).map(
      ({ value, length }): ValueLength<WithPosition<T>> => ({
        value: { value, position, length },
        length,
      }),
    )
  );
}
export class CheckedParser<T> {
  constructor(public check: Parser<unknown>, public parser: Parser<T>) {}
  map<U>(mapper: (value: T) => U): CheckedParser<U> {
    return new CheckedParser(this.check, this.parser.map(mapper));
  }
  mapWithPositionedError<U>(mapper: (value: T) => U): CheckedParser<U> {
    return new CheckedParser(
      this.check,
      this.parser.mapWithPositionedError(mapper),
    );
  }
  filter(check: (value: T) => boolean): CheckedParser<T> {
    return new CheckedParser(this.check, this.parser.filter(check));
  }
  filterWithPositionedError(check: (value: T) => boolean): CheckedParser<T> {
    return new CheckedParser(
      this.check,
      this.parser.filterWithPositionedError(check),
    );
  }
}
export function checkedSequence<T, U>(
  check: Parser<T>,
  rest: Parser<U>,
): CheckedParser<readonly [T, U]> {
  return new CheckedParser(check, sequence(check, rest));
}
export function checkedAsWhole<T>(parser: Parser<T>): CheckedParser<T> {
  return new CheckedParser(parser, parser);
}
export function choiceWithCheck<T>(
  ...choices: ReadonlyArray<CheckedParser<T>>
): Parser<T> {
  return new Parser((position) => {
    const errors: Array<ResultError> = [];
    for (const { check, parser } of choices) {
      const result = check.rawParser(position);
      if (result.isError()) {
        errors.push(...result.errors);
      } else {
        return parser.rawParser(position);
      }
    }
    return ArrayResult.errors(errors);
  });
}
export function optionalWithCheck<T>(
  parser: CheckedParser<T>,
): Parser<null | T> {
  return choiceWithCheck(parser, checkedAsWhole(nothing));
}
export const allWithCheck = memoize(
  <T>(parser: CheckedParser<T>): Parser<ReadonlyArray<T>> =>
    choiceWithCheck(
      new CheckedParser(
        parser.check,
        sequence(parser.parser, lazy(lazyEval(() => allWithCheck(parser))))
          .map(([first, rest]): ReadonlyArray<T> => [first, ...rest]),
      ),
      checkedAsWhole(emptyArray),
    ),
);
export function allAtLeastOnceWithCheck<T>(
  parser: CheckedParser<T>,
): Parser<ReadonlyArray<T>> {
  return sequence(parser.parser, allWithCheck(parser))
    .map(([first, rest]) => [first, ...rest]);
}
