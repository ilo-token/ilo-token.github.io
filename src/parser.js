class ParseError extends Error {}
class UnrecognizedError extends ParseError {}

function nothing() {
  return function (src) {
    return {
      output: [{ value: null, rest: src }],
      error: null,
    };
  };
}
function eol() {
  return function (src) {
    if (src === "") {
      return { output: [{ value: null, rest: "" }], error: null };
    } else {
      return {
        output: [],
        error: new ParseError(
          `Expected end of phrase/sentence, found "${src}"`
        ),
      };
    }
  };
}
function map(parser, mapper) {
  return function (src) {
    const result = parser(src);
    if (result.error) {
      return result;
    }
    const wholeOutput = [];
    let wholeError = null;
    for (const { value, rest } in result.output) {
      try {
        wholeOutput.push({ value: mapper(value), rest });
      } catch (error) {
        if (!wholeError) {
          wholeError = error;
        }
      }
    }
    if (wholeOutput.length === 0) {
      return {
        output: [],
        error: wholeError ?? new ParseError("No error provided"),
      };
    } else {
      return {
        output: wholeOutput,
        error: null,
      };
    }
  };
}
function choice(choices) {
  return function (src) {
    let wholeOutput = [];
    let wholeError = null;
    for (const parser of choices) {
      const { output, error } = parser(src);
      if (error) {
        if (!wholeError) {
          wholeError = error;
        }
      } else {
        wholeOutput = wholeOutput.concat(output);
      }
    }
    if (wholeOutput.length === 0) {
      return {
        output: [],
        error: wholeError ?? new ParseError("No error provided"),
      };
    } else {
      return {
        output: wholeOutput,
        error: null,
      };
    }
  };
}
function optional(parser) {
  return choice([nothing(), parser]);
}
function sequence(sequence) {
  if (sequence.length === 0) {
    throw new Error("sequences can't be empty");
  }
  return function (src) {
    let wholeOutput = [{ value: [], rest: src }];
    let wholeError = null;
    for (const parser of sequence) {
      let newOutput = [];
      for (const { value, rest } of wholeOutput) {
        const { output, error } = parser(rest);
        if (error) {
          if (!wholeError) {
            wholeError = error;
          }
        } else {
          for (const { value: newValue, rest } of output) {
            newOutput.push({
              value: value.concat([newValue]),
              rest,
            });
          }
        }
      }
      wholeOutput = newOutput;
    }
    if (wholeOutput.length === 0) {
      return {
        output: [],
        error: wholeError ?? new ParseError("No error provided"),
      };
    } else {
      return {
        output: wholeOutput,
        error: null,
      };
    }
  };
}
function allSpace() {
  return function (src) {
    const position = src.search(/\S/);
    if (position === -1) {
      return {
        output: [
          {
            value: "",
            rest: src,
          },
        ],
        error: null,
      };
    } else {
      return {
        output: [
          {
            value: src.slice(0, position),
            rest: src.slice(position),
          },
        ],
        error: null,
      };
    }
  };
}
function wordOnly() {
  return function (src) {
    const position = src.search(/\W/);
    if (position === -1) {
      if (src === "") {
        return {
          output: [],
          error: new ParseError("Expected word, found end of phrase/sentence"),
        };
      } else {
        return {
          output: [[{ value: src, rest: "" }]],
          error: null,
        };
      }
    } else if (position === 0) {
      return {
        output: [],
        error: new ParseError(`Expected word, found space`),
      };
    } else {
      return {
        output: [
          {
            value: src.slice(0, position),
            rest: src.slice(position),
          },
        ],
        error: null,
      };
    }
  };
}
function word() {
  return map(sequence([wordOnly(), allSpace()]), ([word, _]) => word);
}
function wordFrom(set) {
  return map(word(), (word) => {
    if (set.has(word)) {
      return word;
    } else {
      throw new UnrecognizedError(`"${word}"`);
    }
  });
}
function specificWord(word) {
  return map(word(), (thisWord) => {
    if (word === thisWord) {
      return thisWord;
    } else {
      throw new UnrecognizedError(`"${thisWord}"`);
    }
  });
}
