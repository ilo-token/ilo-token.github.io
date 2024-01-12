import {
  Clause,
  FullClause,
  FullPhrase,
  Modifier,
  Phrase,
  Predicate,
  Preposition,
  Sentence,
} from "./ast.ts";
import { UnreachableError, UnrecognizedError } from "./error.ts";
import { Output } from "./output.ts";
import {
  CONTENT_WORD,
  PREPOSITION,
  PREVERB,
  SPECIAL_SUBJECT,
} from "./vocabulary.ts";

type ValueRest<T> = {value: T; rest: string};
type ParserOutput<T> = Output<ValueRest<T>>;
class Parser<T> {
  constructor(public readonly parser: (src: string) => ParserOutput<T>) {}
  map<U>(mapper: (x: T) => U): Parser<U> {
    return new Parser((src) => {
      const result = this.parser(src);
      if (result.isError()) {
        if (result.error) {
          return new Output<ValueRest<U>>(result.error);
        } else {
          return new Output([]);
        }
      }
      const output = new Output<ValueRest<U>>([]);
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
      return new Output([
        { value: match, rest: src.slice(match[0].length) },
      ]);
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
    let output = new Output<ValueRest<T>>([]);
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
    let wholeOutput = new Output<ValueRest<any>>([{ value: [], rest: src }]);
    for (const parser of sequence) {
      let newOutput = new Output<ValueRest<any>>([]);
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
    let wholeOutput = new Output<ValueRest<Array<T>>>([{ value: [], rest: src }]);
    let currentOutput = new Output<ValueRest<Array<T>>>([{ value: [], rest: src }]);
    while (true) {
      let newOutput = new Output<ValueRest<Array<T>>>([]);
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
    let wholeOutput = new Output<ValueRest<Array<T>>>([{ value: [], rest: src }]);
    while (true) {
      let newOutput = new Output<ValueRest<Array<T>>>([]);
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
function manyAtLeastOnce<T>(parser: Parser<T>): Parser<Array<T>> {
  return sequence(parser, many(parser)).map(([first, rest]) => [
    first,
    ...rest,
  ]);
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
  return allAtLeastOnce(match(/([A-Z][a-z]*)\s*/).map(([_, word]) => word)).map(
    (array) => array.join(" ")
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
  return wordFrom(CONTENT_WORD, "headword");
}
function modifier(): Parser<Modifier> {
  return choice(
    specificWord("nanpa")
      .with(fullPhrase())
      .map((phrase) => ({
        type: "nanpa ordinal",
        phrase,
      })),
    wordFrom(CONTENT_WORD, "modifier").map(
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
function preposition(): Parser<Preposition> {
  return sequence(wordFrom(PREPOSITION, "preposition"), fullPhrase()).map(
    ([preposition, phrase]) => ({
      preposition,
      phrase,
    })
  );
}
function enPhrases(): Parser<Array<FullPhrase>> {
  return sequence(
    fullPhrase(),
    many(specificWord("en").with(fullPhrase()))
  ).map(([first, rest]) => [first, ...rest]);
}
function predicate(): Parser<Predicate> {
  return choice(
    preposition().map((preposition) => ({ type: "preposition", preposition })),
    fullPhrase().map(
      (predicate) => ({ type: "default", predicate } as Predicate)
    )
  );
}
function clause(): Parser<Clause> {
  return choice(
    sequence(
      wordFrom(SPECIAL_SUBJECT, "mi/sina subject"),
      predicate(),
      many(specificWord("li").with(predicate())),
      many(preposition())
    ).map(([subject, predicate, morePredicates, prepositions]) => ({
      type: "li clause",
      subjects: [
        { type: "default", phrase: { headWord: subject, modifiers: [] } },
      ],
      predicates: [predicate, ...morePredicates],
      prepositions,
    })),
    enPhrases().map(
      (phrases) =>
        ({
          type: "en phrases",
          phrases,
        } as Clause)
    ),
    enPhrases()
      .skip(specificWord("o"))
      .map((phrases) => ({
        type: "o vocative",
        phrases,
      })),
    sequence(
      enPhrases(),
      manyAtLeastOnce(specificWord("li").with(predicate())),
      many(preposition())
    ).map(([subjects, predicates, prepositions]) => ({
      type: "li clause",
      subjects,
      predicates,
      prepositions,
    })),
    sequence(
      enPhrases(),
      manyAtLeastOnce(specificWord("o").with(predicate())),
      many(preposition())
    ).map(([subjects, predicates, prepositions]) => ({
      type: "o clause",
      subjects,
      predicates,
      prepositions,
    })),
    manyAtLeastOnce(preposition()).map((prepositions) => ({
      type: "prepositions",
      prepositions,
    }))
  );
}
function fullClause(): Parser<FullClause> {
  return sequence(optional(specificWord("taso")), clause()).map(
    ([taso, clause]) => ({
      taso: !!taso,
      clause,
    })
  );
}
function sentence(): Parser<Sentence> {
  return choice(
    fullClause().map(
      (clause) => ({ type: "single clause", clause } as Sentence)
    ),
    sequence(fullClause().skip(specificWord("la")), recursive(sentence)).map(
      ([left, right]) => ({ type: "la clauses", left, right })
    )
  );
}
function fullSentence(): Parser<Sentence> {
  return allSpace()
    .with(sentence())
    .skip(optional(match(/\./)))
    .skip(allSpace())
    .skip(eol());
}
