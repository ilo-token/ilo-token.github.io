import { Clause } from "./ast.ts";
import { FullClause, MultiplePhrases, Phrase, Sentence } from "./ast.ts";
import { Output } from "./output.ts";
import { parser } from "./parser.ts";
import { TodoError } from "./error.ts";

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
function phraseAsNoun(
  phrase: Phrase,
  named: boolean,
  of: boolean,
): TranslationOutput {
  throw new Error("todo");
}
function translateMultiplePhrases(
  phrases: MultiplePhrases,
  translator: (phrase: Phrase) => TranslationOutput,
  level = 2,
): TranslationOutput {
  if (phrases.type === "single") {
    return translator(phrases.phrase);
  } else if (phrases.type === "and conjunction" || phrases.type === "anu") {
    let conjunction: string;
    if (phrases.type === "and conjunction") {
      conjunction = "and";
    } else {
      conjunction = "or";
    }
    const translations = rotate(
      phrases.phrases.map((phrases) =>
        translateMultiplePhrases(phrases, translator, level - 1)
      ),
    );
    if (level === 2) {
      return translations.map((phrases) => {
        if (phrases.length === 2) {
          return [phrases[0], conjunction, phrases[1]].join(" ");
        } else {
          const comma = phrases.slice(0, phrases.length - 1);
          const last = phrases[phrases.length - 1];
          return [
            comma.map((translation) => [translation, ", "].join()).join(),
            conjunction,
            " ",
            last,
          ].join("");
        }
      });
    } else {
      return translations.map((phrases) =>
        phrases.join([" ", conjunction, " "].join())
      );
    }
  } else {
    throw new Error("unreachable");
  }
}
/** Translates a clause. */
function translateClause(clause: Clause): TranslationOutput {
  if (clause.type === "phrases") {
    return translateMultiplePhrases(
      clause.phrases,
      (phrase) => phraseAsNoun(phrase, true, true),
    );
  } else if (clause.type === "o vocative") {
    return translateMultiplePhrases(
      clause.phrases,
      (phrase) =>
        phraseAsNoun(phrase, true, true).map((phrase) => `hey ${phrase}`),
    );
  } else {
    return new Output(new TodoError(`translation for ${clause.type}`));
  }
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
  return translateClause(fullClause.clause).map((clause) =>
    [but, clause, isntIt].join("")
  );
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
