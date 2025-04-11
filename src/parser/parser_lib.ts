import { assertGreater } from "@std/assert/greater";
import { MemoizationCacheResult, memoize } from "@std/cache/memoize";
import { ArrayResult, ArrayResultError } from "../array_result.ts";

type ParserResult<T> = ArrayResult<Readonly<{ value: T; length: number }>>;
type InnerParser<T> = (input: number) => ParserResult<T>;
type Memo<T> = Map<number, MemoizationCacheResult<ParserResult<T>>>;

let currentSource = "";
const allMemo: Set<WeakRef<Memo<unknown>>> = new Set();

export class Parser<T> {
  readonly rawParser: InnerParser<T>;
  constructor(parser: InnerParser<T>) {
    const cache: Memo<T> = new Map();
    allMemo.add(new WeakRef(cache));
    this.rawParser = memoize<InnerParser<T>, number, Memo<T>>(
      parser,
      { cache },
    );
  }
  parse(source: string): ArrayResult<T> {
    currentSource = source;
    for (const memo of allMemo) {
      const ref = memo.deref();
      if (ref == null) {
        allMemo.delete(memo);
      } else {
        ref.clear();
      }
    }
    return this.rawParser(0).map(({ value }) => value);
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
    return new Parser((position) =>
      this.rawParser(position)
        .flatMap(({ value, length }) =>
          mapper(value)
            .rawParser(position + length)
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
export function count(
  parser: Parser<Readonly<{ length: number }>>,
): Parser<number> {
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
  return new Parser((position) => {
    const sourceString = currentSource.slice(position);
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
      return new ArrayResult(
        new UnexpectedError(
          describeSource(currentSource.slice(position)),
          description,
        ),
      );
    }
  });
}
export const allRest = new Parser((position) =>
  new ArrayResult([{
    value: currentSource.slice(position),
    length: currentSource.length - position,
  }])
);
export const end = new Parser((position) =>
  position === currentSource.length
    ? new ArrayResult([{ value: null, length: 0 }])
    : new ArrayResult(
      new UnexpectedError(
        describeSource(currentSource.slice(position)),
        "end of text",
      ),
    )
);
export const notEnd = new Parser((position) =>
  position < currentSource.length
    ? new ArrayResult([{ value: null, length: 0 }])
    : new ArrayResult(new UnexpectedError("end of text", "not end of text"))
);
export function withSource<T>(
  parser: Parser<T>,
): Parser<readonly [value: T, source: string]> {
  return new Parser((position) =>
    parser.rawParser(position).map(({ value, length }) => ({
      value: [
        value,
        currentSource.slice(position, position + length),
      ] as const,
      length,
    }))
  );
}
export class CheckedParser<T> {
  constructor(public check: Parser<unknown>, public parser: Parser<T>) {}
  map<U>(mapper: (value: T) => U): CheckedParser<U> {
    return new CheckedParser(this.check, this.parser.map(mapper));
  }
  filter(check: (value: T) => boolean): CheckedParser<T> {
    return new CheckedParser(this.check, this.parser.filter(check));
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
  return choices.reduceRight(
    (right: Parser<T>, { check, parser }) =>
      new Parser((position) => {
        const arrayResult = check.rawParser(position);
        if (arrayResult.isError()) {
          return ArrayResult.concat(
            arrayResult as ArrayResult<never>,
            right.rawParser(position),
          );
        } else {
          return parser.rawParser(position);
        }
      }),
    empty,
  );
}
export function optionalWithCheck<T>(
  parser: CheckedParser<T>,
): Parser<null | T> {
  return choiceWithCheck(parser, checkedAsWhole(nothing));
}
export const allWithCheck = memoize(<T>(
  parser: CheckedParser<T>,
): Parser<ReadonlyArray<T>> =>
  choiceWithCheck(
    new CheckedParser(
      parser.check,
      sequence(parser.parser, lazy(() => allWithCheck(parser)))
        .map(([first, rest]) => [first, ...rest]),
    ),
    checkedAsWhole(emptyArray),
  )
);
export function allAtLeastOnceWithCheck<T>(
  parser: CheckedParser<T>,
): Parser<ReadonlyArray<T>> {
  return sequence(parser.parser, allWithCheck(parser))
    .map(([first, rest]) => [first, ...rest]);
}
