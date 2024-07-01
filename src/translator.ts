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
function filler(
  filler: TokiPona.Emphasis,
): string {
  switch (filler.type) {
    case "word":
      switch (filler.word as "a" | "n") {
        case "a":
          return "ah";
        case "n":
          return "hm";
      }
      // unreachable
      // fallthrough
    case "long word":
      switch (filler.word as "a" | "n") {
        case "a":
          return `${repeat("a", filler.length)}h`;
        case "n":
          return `h${repeat("m", filler.length)}`;
      }
      // unreachable
      // fallthrough
    case "multiple a":
      return repeat("ha", filler.count);
  }
}
function extractEmphasis(sentence: TokiPona.Sentence): {
  preEmphasis: TokiPona.Emphasis;
  laClauses: Array<TokiPona.Clause>;
  finalClause: TokiPona.Clause;
  postEmphasis: TokiPona.Emphasis;
  punctuation: string;
} {
  throw new Error("todo");
}
function sentence(
  sentence: TokiPona.Sentence,
): Output<Array<English.Sentence>> {
  if (sentence.finalClause.type === "filler") {
    if (sentence.laClauses.length !== 0) {
      return new Output(new UnrecognizedError('filler with "la"'));
    }
    return new Output([[{
      clause: {
        type: "interjection",
        interjection: filler(sentence.finalClause.emphasis),
      },
      punctuation: sentence.punctuation,
    }]]);
  } else {
    const extracted = extractEmphasis(sentence);
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
