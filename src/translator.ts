import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import {
  NUMERAL_DEFINITION,
  PARTICLE_DEFINITION,
  PREPOSITION_DEFINITION,
  SPECIAL_CONTENT_WORD_DEFINITION,
} from "./dictionary.ts";
import * as English from "./english-ast.ts";
import { TodoError, UnrecognizedError } from "./error.ts";
import { nullableAsArray, repeat } from "./misc.ts";
import { Output } from "./output.ts";

function clause(clause: TokiPona.Clause): Output<Array<English.Clause>> {
  return new Output(new TodoError("translation of clause"));
}
function filler(filler: TokiPona.Emphasis): Output<string> {
  switch (filler.type) {
    case "word":
      switch (filler.word as "a" | "n") {
        case "a":
          return new Output(["ah", "oh", "ha", "eh", "um", "oy"]);
        case "n":
          return new Output(["hm", "uh", "mm", "er", "um"]);
      }
      // unreachable
      // fallthrough
    case "long word": {
      let output: Output<string>;
      switch (filler.word as "a" | "n") {
        case "a":
          output = new Output(["ah", "oh", "ha", "eh", "um"]);
          break;
        case "n":
          output = new Output(["hm", "uh", "mm", "um"]);
          break;
      }
      return output
        .map(([first, second]) => `${first}${repeat(second, filler.length)}`);
    }
    case "multiple a":
      return new Output([repeat("ha", filler.count)]);
  }
}
function sentence(
  sentence: TokiPona.Sentence,
): Output<Array<English.Sentence>> {
  if (sentence.finalClause.type === "filler") {
    if (sentence.laClauses.length !== 0) {
      return new Output(new UnrecognizedError('filler with "la"'));
    }
    return filler(sentence.finalClause.emphasis)
      .map((interjection) =>
        ({
          clause: {
            type: "interjection",
            interjection,
          },
          punctuation: sentence.punctuation,
        }) as English.Sentence
      )
      .map((sentence) => [sentence]);
  } else {
    return new Output(new TodoError("translation of sentence"));
  }
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output([
        ...PARTICLE_DEFINITION[word] ?? [],
        ...PREPOSITION_DEFINITION[word] ?? [],
        ...nullableAsArray(NUMERAL_DEFINITION[word]).map((num) => `${num}`),
        // TODO: Preverb
        ...SPECIAL_CONTENT_WORD_DEFINITION[word] ?? [],
        // TODO: Content word definition
      ])
        .map((definition) =>
          ({
            clause: { type: "free form", text: definition },
            punctuation: "",
          }) as English.Sentence
        )
        .map((definition) => [definition]);
    }
    case "sentences":
      return Output.combine(...sentences.sentences.map(sentence))
        .map((array) => array.flat());
  }
}
export function translate(src: string): Output<Array<English.Sentence>> {
  return parse(src).flatMap(multipleSentences);
}
