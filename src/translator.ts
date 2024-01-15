import { Sentence } from "./ast.ts";
import { Output } from "./output.ts";
import { parser } from "./parser.ts";

type TranslationOutput = Output<string>;

function translateSentence(output: Sentence): TranslationOutput {
  throw new Error("todo");
}
function translate(src: string): TranslationOutput {
  return parser(src).flatMap((sentences) =>
    new Output(sentences).flatMap(translateSentence)
  );
}
