import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import {
  NUMERAL_DEFINITION,
  PARTICLE_DEFINITION,
  PREPOSITION_DEFINITION,
  SPECIAL_CONTENT_WORD_DEFINITION,
} from "./dictionary.ts";
import * as English from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray } from "./misc.ts";
import { Output } from "./output.ts";

function sentence(
  sentence: TokiPona.Sentence,
): Output<Array<English.Sentence>> {
  return new Output(new TodoError("translation of sentence"));
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output([
        ...PARTICLE_DEFINITION[word] ?? [],
        ...SPECIAL_CONTENT_WORD_DEFINITION[word] ?? [],
        ...PREPOSITION_DEFINITION[word] ?? [],
        ...nullableAsArray(NUMERAL_DEFINITION[word]).map((num) => `${num}`),
        // TODO: Preverb
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
