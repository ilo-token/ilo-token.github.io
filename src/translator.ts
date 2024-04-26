import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import * as English from "./english-ast.ts";
import { Output } from "./output.ts";

function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<English.Sentence> {
  throw new Error("todo");
}
export function translate(src: string): Output<English.Sentence> {
  return parse(src).flatMap(multipleSentences);
}
