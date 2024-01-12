import { Sentence } from "./ast";
import { Output } from "./output";
import { parser } from "./parser";

type TranslationOutput = Output<string>;

function translateSentence(output: Sentence): TranslationOutput {
  throw new Error("todo");
}
function translate(src: string): TranslationOutput {
  return parser(src).flatMap(translateSentence);
}
