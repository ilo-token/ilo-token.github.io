import { Sentence } from "./ast.ts";
import { Output } from "./output.ts";
import { parser } from "./parser.ts";

/** A special kind of Output that translators returns. */
export type TranslationOutput = Output<string>;

/** Translates a single sentence. */
function translateSentence(sentence: Sentence): TranslationOutput {
  throw new Error("todo");
}
/** Translates multiple sentences. */
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
/** Full Toki Pona translator. */
export function translate(src: string): TranslationOutput {
  return parser(src).flatMap(translateSentences);
}
