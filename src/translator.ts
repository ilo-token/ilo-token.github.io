import { FullClause, Sentence } from "./ast.ts";
import { Output } from "./output.ts";
import { parser } from "./parser.ts";

/** A special kind of Output that translators returns. */
export type TranslationOutput = Output<string>;

function translateFullClause(fullClause: FullClause): TranslationOutput {
  throw new Error("todo");
}
/** Translates a single sentence. */
function translateSentence(sentence: Sentence): TranslationOutput {
  const laClauses = sentence.laClauses;
  const contexts = laClauses.slice(0, laClauses.length - 1);
  const final = laClauses[laClauses.length - 1];
  const contextTranslation = contexts.reduce(
    (output, context) =>
      output.flatMap((left) =>
        translateFullClause(context).map((right) => {
          if (left === "") {
            return `given ${right}, `;
          } else {
            return `${left}given ${right}`;
          }
        })
      ),
    new Output([""]),
  );
  return contextTranslation.flatMap((contexts) =>
    translateFullClause(final).map((final) => {
      if (contexts === "") {
        return [final, sentence.punctuation].join("");
      } else {
        return [contexts, final, sentence.punctuation].join("");
      }
    })
  );
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
