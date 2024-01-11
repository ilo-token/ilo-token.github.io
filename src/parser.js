import { HEADWORD } from "./vocabulary";

class ParseError extends Error {}
class UnrecognizedError extends ParseError {}

class Output {
  constructor(output) {
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
  push(output) {
    this.output.push(output);
    this.error = null;
  }
  append({ output, error }) {
    this.output = [...this.output, ...output];
    if (this.output.length > 0) {
      this.error = null;
    } else {
      this.error = error;
    }
  }
  setError(error) {
    if (!this.error && this.output.length > 0) {
      this.error = error;
    }
  }
  isError() {
    return this.output.length === 0;
  }
}
class Parser {
  constructor(parser) {
    this.parser = parser;
  }
  map(mapper) {
    return new Parser((src) => {
      const result = this.parser(src);
      if (result.error) {
        return result;
      }
      const output = new Output([]);
      for (const { value, rest } in result.output) {
        try {
          output.push({ value: mapper(value), rest });
        } catch (error) {
          output.setError(error);
        }
      }
      return output;
    });
  }
}
function char() {
  return new Parser((src) => {
    if (src.length === 0) {
      return new Output(
        new ParseError("Expected character, found end of phrase/sentence")
      );
    } else {
      let [first] = src;
      return new Output([
        {
          value: first,
          rest: src.slice(first.length),
        },
      ]);
    }
  });
}
function nothing() {
  return new Parser((src) => {
    return new Output([{ value: null, rest: src }]);
  });
}
function eol() {
  return new Parser((src) => {
    if (src === "") {
      return new Output([{ value: null, rest: "" }]);
    } else {
      return new Output(
        new ParseError(`Expected end of phrase/sentence, found "${src}"`)
      );
    }
  });
}
function choice(...choices) {
  return new Parser((src) => {
    let output = new Output([]);
    for (const parser of choices) {
      output.append(parser.parser(src));
    }
    return output;
  });
}
function optional(parser) {
  return choice(parser, nothing());
}
function sequence(...sequence) {
  if (sequence.length === 0) {
    throw new Error("sequences can't be empty");
  }
  return new Parser((src) => {
    let wholeOutput = new Output([{ value: [], rest: src }]);
    for (const parser of sequence) {
      let newOutput = new Output([]);
      for (const { value, rest } of wholeOutput.output) {
        const { output, error } = parser.parser(rest);
        if (output.length === 0) {
          newOutput.setError(error);
        } else {
          for (const { value: newValue, rest } of output) {
            newOutput.push({
              value: [...value, ...newValue],
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
function all(parser) {
  return new Parser((src) => {
    let wholeOutput = new Output([{ value: [], rest: src }]);
    while (true) {
      let newOutput = new Output([]);
      for (const { value, rest } of wholeOutput.output) {
        const { output, error } = parser.parser(rest);
        if (output.length === 0) {
          newOutput.setError(error);
        } else {
          for (const { value: newValue, rest } of output) {
            newOutput.push({
              value: [...value, ...newValue],
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
function allAtLeastOnce(parser) {
  return sequence(parser, all(parser)).map(([first, rest]) => [first, ...rest]);
}
function allSpace() {
  return new Parser((src) => {
    const position = src.search(/\S/);
    if (position === -1) {
      return new Output([
        {
          value: "",
          rest: src,
        },
      ]);
    } else {
      return new Output([
        {
          value: src.slice(0, position),
          rest: src.slice(position),
        },
      ]);
    }
  });
}
function wordOnly() {
  return new ParseError((src) => {
    const position = src.search(/\W/);
    if (position === -1) {
      if (src === "") {
        return new Output(
          new ParseError("Expected word, found end of phrase/sentence")
        );
      } else {
        return new Output([{ value: src, rest: "" }]);
      }
    } else if (position === 0) {
      return new Output(new ParseError(`Expected word, found space`));
    } else {
      return new Output([
        {
          value: src.slice(0, position),
          rest: src.slice(position),
        },
      ]);
    }
  });
}
function word() {
  return sequence(wordOnly(), allSpace()).map(([word, _]) => word);
}
function wordFrom(set) {
  return word().map((word) => {
    if (set.has(word)) {
      return word;
    } else {
      throw new UnrecognizedError(`"${word}"`);
    }
  });
}
function specificWord(word) {
  return word().map((thisWord) => {
    if (word === thisWord) {
      return thisWord;
    } else {
      throw new UnrecognizedError(`"${thisWord}"`);
    }
  });
}
function headWord() {
  return wordFrom(HEADWORD);
}
