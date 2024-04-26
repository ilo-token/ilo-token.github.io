import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import { SPECIAL_CONTENT_WORD_DEFINITION } from "./dictionary.ts";
import { CONTENT_WORD_DEFINITION } from "./dictionary.ts";
import { PREPOSITION_DEFINITION } from "./dictionary.ts";
import { PARTICLE_DEFINITION } from "./dictionary.ts";
import * as English from "./english-ast.ts";
import { TodoError, UnreachableError } from "./error.ts";
import { Output } from "./output.ts";

function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<English.Sentence> {
  if (sentences.type === "single word") {
    const word = sentences.word;
    return new Output([
      ...PARTICLE_DEFINITION[word] ?? [],
      ...SPECIAL_CONTENT_WORD_DEFINITION[word] ?? [],
      ...PREPOSITION_DEFINITION[word] ?? [],
      // TODO: Preverb
      // TODO: Content word definition
    ]).map((definition) => ({
      dependentClauses: [],
      independentClause: { type: "free form", text: definition },
      punctuation: "",
    }));
  } else if (sentences.type === "sentences") {
    return new Output(new TodoError("translation of sentences"));
  } else {
    throw new UnreachableError();
  }
}
export function translate(src: string): Output<English.Sentence> {
  return parse(src).flatMap(multipleSentences);
}
