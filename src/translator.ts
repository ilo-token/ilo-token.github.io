import { Sentence } from "./ast.ts";
import { Output } from "./output.ts";
import { parser } from "./parser.ts";

type TranslationOutput = Output<string>;
function translateSentence(sentence: Sentence): TranslationOutput {
  throw new Error("todo");
}
function translateSentences(sentences: Array<Sentence>): TranslationOutput {
  return sentences.reduce(
    (output, sentence) =>
      output.flatMap((left) =>
        translateSentence(sentence).map((right) => {
          if (left === "") {
            return right;
          } else {
            return [left, right].join(" ");
          }
        })
      ),
    new Output([""]),
  );
}
function translate(src: string): TranslationOutput {
  return parser(src).flatMap(translateSentences);
}
