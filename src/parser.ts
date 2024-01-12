import { FullPhrase, Modifier, Phrase } from "./ast.ts";
import { CONTENTWORD, PREVERB } from "./vocabulary.ts";

class ParseError extends Error {}
class UnreachableError extends ParseError {}
class UnrecognizedError extends ParseError {}

class Output<T> {
  output: Array<{ value: T; rest: string }>;
  error: null | Error;
  constructor(output: Array<{ value: T; rest: string }> | Error) {
    if (Array.isArray(output)) {
      this.output = output;
      this.error = null;
    } else if (output instanceof Error) {
      this.output = [];
      this.error = output;
    } else {
      throw new Error("passed not array nor error");
    }
  }
  push(output: { value: T; rest: string }): void {
    this.output.push(output);
    this.error = null;
  }
  append({ output, error }: Output<T>): void {
    this.output = [...this.output, ...output];
    if (this.output.length > 0) {
      this.error = null;
    } else {
      this.error = error;
    }
  }
  setError(error: null | Error): void {
    if (!this.error && this.output.length > 0) {
      this.error = error;
    }
  }
  isError(): boolean {
    return this.output.length === 0;
  }
}
class Parser<T> {
  constructor(public readonly parser: (src: string) => Output<T>) {}
  map<U>(mapper: (x: T) => U): Parser<U> {
    return new Parser((src) => {
      const result = this.parser(src);
      if (result.isError()) {
        if (result.error) {
          return new Output<U>(result.error);
        } else {
          return new Output([]);
        }
      }
      const output = new Output<U>([]);
      for (const { value, rest } of result.output) {
        try {
          output.push({ value: mapper(value), rest });
        } catch (error) {
          if (error instanceof Error) {
            output.setError(error);
          } else {
            throw error;
          }
        }
      }
      return output;
    });
  }
  with<U>(parser: Parser<U>): Parser<U> {
    return sequence(this, parser).map(([_, output]) => output);
  }
  skip<U>(parser: Parser<U>): Parser<T> {
    return sequence(this, parser).map(([output, _]) => output);
  }
}
function match(regex: RegExp): Parser<RegExpMatchArray> {
  const newRegex = new RegExp("^" + regex.source, regex.flags);
  return new Parser((src) => {
    const match = src.match(newRegex);
    if (match) {
      return new Output([{ value: match, rest: src.slice(match[0].length) }]);
    } else if (src === "") {
      return new Output(new UnreachableError());
    } else {
      const token = src.match(/(.*)(?:\s|$)/)?.[1];
      if (token) {
        return new Output(new UnrecognizedError(`"${token}"`));
      } else {
        return new Output(new UnreachableError());
      }
    }
  });
}
function nothing(): Parser<null> {
  return new Parser((src) => {
    return new Output([{ value: null, rest: src }]);
  });
}
function eol(): Parser<null> {
  return new Parser((src) => {
    if (src === "") {
      return new Output([{ value: null, rest: "" }]);
    } else {
      return new Output(new UnrecognizedError(`"${src}"`));
    }
  });
}
function recursive<T>(parser: () => Parser<T>): Parser<T> {
  return new Parser((src) => parser().parser(src));
}
function choice<T>(...choices: Array<Parser<T>>): Parser<T> {
  return new Parser((src) => {
    let output = new Output<T>([]);
    for (const parser of choices) {
      output.append(parser.parser(src));
    }
    return output;
  });
}
function optional<T>(parser: Parser<T>): Parser<null | T> {
  return choice(parser, nothing());
}
function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: Parser<T[I]> } & { length: T["length"] }
): Parser<T> {
  if (sequence.length === 0) {
    throw new Error("sequences can't be empty");
  }
  // We resorted to using `any` types here, make sure it works properly
  return new Parser((src) => {
    let wholeOutput = new Output<any>([{ value: [], rest: src }]);
    for (const parser of sequence) {
      let newOutput = new Output<any>([]);
      for (const { value, rest } of wholeOutput.output) {
        const { output, error } = parser.parser(rest);
        if (output.length === 0) {
          newOutput.setError(error);
        } else {
          for (const { value: newValue, rest } of output) {
            newOutput.push({
              value: [...value, newValue],
              rest,
            });
          }
        }
      }
      wholeOutput = newOutput;
    }
    return wholeOutput;
  });
}
function many<T>(parser: Parser<T>): Parser<Array<T>> {
  return new Parser((src) => {
    let wholeOutput = new Output<Array<T>>([{ value: [], rest: src }]);
    let currentOutput = new Output<Array<T>>([{ value: [], rest: src }]);
    while (true) {
      let newOutput = new Output<Array<T>>([]);
      for (const { value, rest } of currentOutput.output) {
        const { output, error } = parser.parser(rest);
        if (output.length === 0) {
          newOutput.setError(error);
        } else {
          for (const { value: newValue, rest } of output) {
            newOutput.push({
              value: [...value, newValue],
              rest,
            });
          }
        }
      }
      if (newOutput.isError()) {
        break;
      } else {
        wholeOutput.append(newOutput);
        currentOutput = newOutput;
      }
    }
    return wholeOutput;
  });
}
function all<T>(parser: Parser<T>): Parser<Array<T>> {
  return new Parser((src) => {
    let wholeOutput = new Output<Array<T>>([{ value: [], rest: src }]);
    while (true) {
      let newOutput = new Output<Array<T>>([]);
      for (const { value, rest } of wholeOutput.output) {
        const { output, error } = parser.parser(rest);
        if (output.length === 0) {
          newOutput.setError(error);
        } else {
          for (const { value: newValue, rest } of output) {
            newOutput.push({
              value: [...value, newValue],
              rest,
            });
          }
        }
      }
      if (newOutput.isError()) {
        break;
      } else {
        wholeOutput = newOutput;
      }
    }
    return wholeOutput;
  });
}
function allAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, all(parser)).map(([first, rest]) => [first, ...rest]);
}
function allSpace(): Parser<string> {
  return match(/\s*/).map(([space]) => space);
}
function word(): Parser<string> {
  return match(/([a-z]+)\s*/).map(([_, word]) => word);
}
function properWords(): Parser<string> {
  return allAtLeastOnce(match(/([A-Z][a-z]*)\s*/).map(([_, word]) => word)).map((array) =>
    array.join(" ")
  );
}
function wordFrom(set: Set<string>, description: string): Parser<string> {
  return word().map((word) => {
    if (set.has(word)) {
      return word;
    } else {
      throw new UnrecognizedError(`"${word}" as ${description}`);
    }
  });
}
function specificWord(thatWord: string): Parser<string> {
  return word().map((thisWord) => {
    if (thatWord === thisWord) {
      return thisWord;
    } else {
      throw new UnrecognizedError(`"${thisWord}" instead of "${word}"`);
    }
  });
}
function headWord(): Parser<string> {
  return wordFrom(CONTENTWORD, "headword");
}
function modifier(): Parser<Modifier> {
  return choice(
    wordFrom(CONTENTWORD, "modifier").map(
      (word) =>
        ({
          type: "word",
          word,
        } as Modifier)
    ),
    properWords().map((words) => ({
      type: "proper words",
      words,
    })),
    specificWord("pi")
      .with(fullPhrase())
      .map((phrase) => ({
        type: "pi",
        phrase,
      })),
    specificWord("nanpa")
      .with(fullPhrase())
      .map((phrase) => ({
        type: "nanpa ordinal",
        phrase,
      }))
    // TODO: cardinal modifier
  );
}
function phrase(): Parser<Phrase> {
  return sequence(headWord(), many(modifier())).map(
    ([headWord, modifiers]) => ({
      headWord,
      modifiers,
    })
  );
}
function fullPhrase(): Parser<FullPhrase> {
  return sequence(
    optional(wordFrom(PREVERB, "preverb")),
    recursive(phrase)
  ).map(([preverb, phrase]) => {
    if (preverb) {
      return {
        type: "preverb",
        preverb,
        phrase,
      };
    } else {
      return {
        type: "default",
        phrase,
      };
    }
  });
}
