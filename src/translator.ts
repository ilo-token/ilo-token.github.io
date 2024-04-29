import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import {
  PARTICLE_DEFINITION,
  PREPOSITION_DEFINITION,
  SPECIAL_CONTENT_WORD_DEFINITION,
} from "./dictionary.ts";
import * as English from "./english-ast.ts";
import { TodoError, UnreachableError } from "./error.ts";
import { Output } from "./output.ts";

function sentence(sentence: TokiPona.Sentence): Output<English.Sentence> {
  return new Output(new TodoError("translation of sentence"));
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  if (sentences.type === "single word") {
    const word = sentences.word;
    return new Output([
      ...PARTICLE_DEFINITION[word] ?? [],
      ...SPECIAL_CONTENT_WORD_DEFINITION[word] ?? [],
      ...PREPOSITION_DEFINITION[word] ?? [],
      // TODO: Preverb
      // TODO: Content word definition
    ])
      .map((definition) => ({
        dependentClauses: [],
        independentClause: {
          type: "free form",
          text: definition,
        } as English.Clause,
        punctuation: "",
      }))
      .map((definition) => [definition]);
  } else if (sentences.type === "sentences") {
    return Output.combine(...sentences.sentences.map(sentence));
  } else {
    throw new UnreachableError();
  }
}
export function translate(src: string): Output<Array<English.Sentence>> {
  return parse(src).flatMap(multipleSentences);
}
