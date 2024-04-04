// This module is bound to be replaced with a translator that uses English AST

import { Clause } from "./ast.ts";
import {
  FullClause,
  Modifier,
  MultiplePhrases,
  Phrase,
  Sentence,
  WordUnit,
} from "./ast.ts";
import { Output } from "./output.ts";
import { parser } from "./ast-parser.ts";
import { OutputError, TodoError, UnreachableError } from "./error.ts";
import { DEFINITION } from "./definition.ts";

/** A special kind of Output that translators returns. */
export type TranslationOutput = Output<string>;

const WORD_TO_NUMBER: { [word: string]: number } = {
  ale: 100,
  ali: 100,
  mute: 20,
  luka: 5,
  tu: 2,
  wan: 1,
};
// TODO: -like and -related suffixes for nouns as adjectives
// TODO: "and" in "of" and "in X way"

/**
 * Helper function for turning array or tuple of Output into Output of array or
 * tuple. Make use of `as const` to infer array as tuple.
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
function definition(
  kind: "noun" | "adjective" | "adverb",
  word: string,
): TranslationOutput {
  return Output.concat(
    new Output(new OutputError(`No ${kind} translation found for ${word}.`)),
    new Output(DEFINITION[word][kind]),
  );
}
function number(words: Array<string>): number {
  return words.reduce((number, word) => number + WORD_TO_NUMBER[word], 0);
}
function wordUnitAs(
  kind: "noun" | "adjective" | "adverb",
  word: WordUnit,
): TranslationOutput {
  if (word.type === "default") {
    return definition(kind, word.word);
  } else if (word.type === "numbers") {
    return new Output([number(word.numbers).toString()]);
  } else if (word.type === "reduplication") {
    return definition(kind, word.word).map((noun) =>
      new Array(word.count).fill(noun).join(" ")
    );
  } else if (word.type === "x ala x") {
    return new Output(new TodoError("translation for X ala X"));
  } else {
    throw new UnreachableError();
  }
}
function modifierAs(
  kind: "noun" | "adjective" | "adverb",
  modifier: Modifier,
): TranslationOutput {
  if (modifier.type === "default") {
    return wordUnitAs(kind, modifier.word);
  } else if (modifier.type === "nanpa" || modifier.type === "proper words") {
    return new Output();
  } else if (modifier.type === "pi") {
    if (kind === "adverb") {
      return new Output();
    }
    return phraseAs(kind, modifier.phrase, { named: false, suffix: false });
  } else {
    return new Output(
      new TodoError(`translating ${modifier.type} as adjective`),
    );
  }
}
function modifierAsSuffix(
  kind: "noun" | "adjective",
  suffix: Modifier,
): TranslationOutput {
  let construction: string;
  if (kind === "noun") {
    construction = "of X";
  } else {
    construction = "in X way";
  }
  if (suffix.type === "default") {
    return wordUnitAs(kind, suffix.word).map((translation) =>
      construction.replace("X", translation)
    );
  } else if (suffix.type === "nanpa") {
    return phraseAs(kind, suffix.phrase, {
      named: kind === "noun",
      suffix: false,
    }).map(
      (translation) => `in position ${translation}`,
    );
  } else if (suffix.type === "pi") {
    return phraseAs(kind, suffix.phrase, {
      named: kind === "noun",
      suffix: false,
    }).map((
      translation,
    ) => construction.replace("X", translation));
  } else if (suffix.type === "proper words") {
    return new Output([`named ${suffix.words}`]);
  } else {
    return new Output(
      new TodoError(`translation of ${suffix.type} as noun`),
    );
  }
}
function defaultPhraseAs(
  kind: "noun" | "adjective",
  phrase: Phrase & { type: "default" },
  options?: {
    named?: boolean;
    suffix?: boolean;
  },
): TranslationOutput {
  const named = options?.named ?? true;
  const suffix = options?.suffix ?? true;
  const name = (
    phrase.modifiers.filter(
      (modifier) => modifier.type === "proper words",
    )[0] as undefined | (Modifier & { type: "proper words" })
  )?.words;
  if (name && !named) {
    return new Output();
  }
  let modifierKind: "adjective" | "adverb";
  if (kind === "noun") {
    modifierKind = "adjective";
  } else if (kind === "adjective") {
    modifierKind = "adverb";
  }
  const headWord = wordUnitAs(kind, phrase.headWord);
  const modifierNoName = phrase.modifiers.filter((
    modifier,
  ) => modifier.type !== "proper words");
  const modifierTranslation: Array<TranslationOutput> = modifierNoName.map(
    (modifier) => modifierAs(modifierKind, modifier),
  );
  const translations = rotate([headWord, rotate(modifierTranslation)] as const)
    .map(
      ([headWord, modifiers]) =>
        [...modifiers.slice().reverse(), headWord].join(" "),
    ).map(
      (translation) => {
        if (name != null) {
          return `${translation} named ${name}`;
        } else {
          return translation;
        }
      },
    );
  if (suffix) {
    const extraTranslations: Array<TranslationOutput> = [
      ...modifierNoName.keys(),
    ].map(
      (i) => {
        const suffixTranslation = modifierAsSuffix(kind, modifierNoName[i]);
        const modifierTranslation = [
          ...modifierNoName.slice(0, i),
          ...modifierNoName.slice(i + 1),
        ].map((modifier) => modifierAs(modifierKind, modifier));
        return rotate([headWord, rotate(modifierTranslation)] as const).map(
          ([headWord, modifiers]) =>
            [...modifiers.slice().reverse(), headWord].join(" "),
        ).map(
          (translation) => {
            if (name != null) {
              return `${translation} named ${name}`;
            } else {
              return translation;
            }
          },
        ).flatMap((left) =>
          suffixTranslation.map((right) => [left, right].join(" "))
        );
      },
    );
    return Output.concat(translations, ...extraTranslations);
  } else {
    return translations;
  }
}
function phraseAs(kind: "noun" | "adjective", phrase: Phrase, options?: {
  named?: boolean;
  suffix?: boolean;
}): TranslationOutput {
  if (phrase.type === "default") {
    return defaultPhraseAs(kind, phrase, options);
  } else {
    return new Output(new TodoError(`translation of ${phrase.type}`));
  }
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
            comma.map((translation) => [translation, ", "].join("")).join(""),
            conjunction,
            " ",
            last,
          ].join("");
        }
      });
    } else if (level === 1) {
      return translations.map((phrases) =>
        phrases.join([" ", conjunction, " "].join(""))
      );
    } else {
      throw new UnreachableError();
    }
  } else {
    throw new UnreachableError();
  }
}
/** Translates a clause. */
function translateClause(clause: Clause): TranslationOutput {
  if (clause.type === "phrases") {
    const hasEn = (phrases: MultiplePhrases): boolean => {
      if (phrases.type === "single") {
        return false;
      } else if (phrases.type === "and conjunction") {
        return true;
      } else if (phrases.type === "anu") {
        return phrases.phrases.some(hasEn);
      } else {
        throw new UnreachableError();
      }
    };
    const phrases = clause.phrases;
    const translations = translateMultiplePhrases(
      phrases,
      (phrase) => phraseAs("noun", phrase),
    );
    if (hasEn(phrases)) {
      return translations;
    } else {
      return Output.concat(
        translateMultiplePhrases(
          phrases,
          (phrase) => phraseAs("adjective", phrase),
        ),
        translations,
      );
    }
  } else if (clause.type === "o vocative") {
    return translateMultiplePhrases(
      clause.phrases,
      (phrase) => phraseAs("noun", phrase).map((phrase) => `hey ${phrase}`),
    );
  } else {
    return new Output(new TodoError(`translation for ${clause.type}`));
  }
}
/** Translates a full clause. */
function translateFullClause(fullClause: FullClause): TranslationOutput {
  // let but = "";
  // const taso = fullClause.taso;
  // if (taso) {
  //   if (taso.type === "default") {
  //     but = "but ";
  //   } else if (taso.type === "reduplication") {
  //     but = new Array(taso.count).fill("but ").join("");
  //   }
  // }
  // let isntIt = "";
  // const anuSeme = fullClause.anuSeme;
  // if (anuSeme) {
  //   if (anuSeme.type === "default") {
  //     isntIt = ", isn't it";
  //   } else if (anuSeme.type === "reduplication") {
  //     // TODO: better translation
  //     isntIt = new Array(anuSeme.count).fill(", isn't it").join("");
  //   }
  // }
  if (fullClause.type === "default") {
    return translateClause(fullClause.clause);
  } else {
    return new Output(new TodoError("translation for a"));
  }
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
