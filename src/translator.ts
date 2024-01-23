import { Clause } from "./ast.ts";
import { FullClause, Sentence } from "./ast.ts";
import { UnreachableError } from "./error.ts";
import { Output } from "./output.ts";
import { parser } from "./parser.ts";

/** A special kind of Output that translators returns. */
export type TranslationOutput = Output<string>;

/**
 * Helper function for turning array or tuple of Output into Output of array or
 * tuple.
 */
// TODO: maybe there's a better name
function rotate<T extends Array<unknown>>(
  array: { [I in keyof T]: Output<T[I]> } & { length: T["length"] },
): Output<T> {
  // We resorted to using `any` types here, make sure it works properly
  return array.reduce(
    // deno-lint-ignore no-explicit-any
    (result: Output<any>, output) =>
      result.flatMap((left) => output.map((right) => [...left, right])),
    // deno-lint-ignore no-explicit-any
    new Output<any>([[]]),
  ) as Output<T>;
}
/** Translates a clause. */
function translateClause(clause: Clause): TranslationOutput {
  throw new Error("todo");
}
/** Translates a full clause. */
function translateFullClause(fullClause: FullClause): TranslationOutput {
  let but = "";
  const taso = fullClause.taso;
  if (taso) {
    if (taso.type === "default") {
      but = "but ";
    } else if (taso.type === "reduplication") {
      but = new Array(taso.count).fill("but ").join();
    }
  }
  let isntIt = "";
  const anuSeme = fullClause.anuSeme;
  if (anuSeme) {
    if (anuSeme.type === "default") {
      isntIt = ", isn't it";
    } else if (anuSeme.type === "reduplication") {
      // TODO: better translation
      isntIt = new Array(anuSeme.count).fill(", isn't it").join();
    }
  }
  return translateClause(fullClause.clause).map((clause) => {
    return [but, clause, isntIt].join("");
  });
}
/** Translates a single sentence. */
function translateSentence(sentence: Sentence): TranslationOutput {
  return rotate(sentence.laClauses.map(translateFullClause)).map((clauses) => {
    const contexts = clauses.slice(0, clauses.length - 1);
    const final = clauses[clauses.length - 1];
    return [
      ...contexts.map((context) => `given ${context}, `),
      final,
      sentence.punctuation,
    ].join("");
  });
}
/** Translates multiple sentences. */
function translateSentences(sentences: Array<Sentence>): TranslationOutput {
  return rotate(sentences.map(translateSentence)).map((sentences) =>
    sentences.join(" ")
  );
}
/** Full Toki Pona translator. */
export function translate(src: string): TranslationOutput {
  return parser(src).flatMap(translateSentences);
}
