// This module is bound to be replaced with a translator that uses English AST

import {
  Clause,
  FullClause,
  Modifier,
  MultiplePhrases,
  MultipleSentences,
  Phrase,
  Sentence,
  WordUnit,
} from "./ast.ts";
import { Output } from "./output.ts";
import { parse } from "./ast-parser.ts";
import { OutputError, TodoError } from "./error.ts";
import { DEFINITION } from "./old-definition.ts";

/** A special kind of Output that translators returns. */
export type TranslationOutput = Output<string>;

// TODO: -like and -related suffixes for nouns as adjectives
// TODO: "and" in "of" and "in X way"

function definition(
  kind: "noun" | "adjective" | "adverb",
  word: string,
): TranslationOutput {
  return Output.concat(
    new Output(new OutputError(`No ${kind} translation found for ${word}.`)),
    new Output(DEFINITION[word][kind]),
  );
}
function wordUnitAs(
  kind: "noun" | "adjective" | "adverb",
  word: WordUnit,
): TranslationOutput {
  switch (word.type) {
    case "default":
      return definition(kind, word.word);
    case "number":
      return new Output([word.number.toString()]);
    case "reduplication":
      return definition(kind, word.word)
        .map((noun) => new Array(word.count).fill(noun).join(" "));
    case "x ala x":
      return new Output(new TodoError("translation for X ala X"));
  }
}
function modifierAs(
  kind: "noun" | "adjective" | "adverb",
  modifier: Modifier,
): TranslationOutput {
  switch (modifier.type) {
    case "default":
      return wordUnitAs(kind, modifier.word);
    case "nanpa":
    case "proper words":
      return new Output();
    case "pi":
      if (kind === "adverb") {
        return new Output();
      }
      return phraseAs(kind, modifier.phrase, { named: false, suffix: false });
    // case "quotation":
    default:
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
  switch (suffix.type) {
    case "default":
      return wordUnitAs(kind, suffix.word)
        .map((translation) => construction.replace("X", translation));
    case "nanpa":
      return phraseAs(kind, suffix.phrase, {
        named: kind === "noun",
        suffix: false,
      })
        .map((translation) => `in position ${translation}`);
    case "pi":
      return phraseAs(kind, suffix.phrase, {
        named: kind === "noun",
        suffix: false,
      })
        .map((translation) => construction.replace("X", translation));
    case "proper words":
      return new Output([`named ${suffix.words}`]);
    // case "quotation":
    default:
      return new Output(
        new TodoError(`translation of ${suffix.type} as noun`),
      );
  }
}
function defaultPhraseAs(
  kind: "noun" | "adjective",
  phrase: Phrase & { type: "default" },
  options?: { named?: boolean; suffix?: boolean },
): TranslationOutput {
  const named = options?.named ?? true;
  const suffix = options?.suffix ?? true;
  const name = (
    phrase.modifiers
      .filter((modifier) => modifier.type === "proper words")[0] as
        | undefined
        | (Modifier & { type: "proper words" })
  )
    ?.words;
  if (name && !named) {
    return new Output();
  }
  let modifierKind: "adjective" | "adverb";
  switch (kind) {
    case "noun":
      modifierKind = "adjective";
      break;
    case "adjective":
      modifierKind = "adverb";
      break;
  }
  const headWord = wordUnitAs(kind, phrase.headWord);
  const modifierNoName = phrase.modifiers
    .filter((modifier) => modifier.type !== "proper words");
  const modifierTranslation: Array<TranslationOutput> = modifierNoName
    .map((modifier) => modifierAs(modifierKind, modifier));
  const translations = Output.combine(
    headWord,
    Output.combine(...modifierTranslation),
  )
    .map(([headWord, modifiers]) =>
      [...modifiers.slice().reverse(), headWord].join(" ")
    )
    .map((translation) => {
      if (name != null) {
        return `${translation} named ${name}`;
      } else {
        return translation;
      }
    });
  if (suffix) {
    const extraTranslations: Array<TranslationOutput> = [
      ...modifierNoName.keys(),
    ]
      .map((i) => {
        const suffixTranslation = modifierAsSuffix(kind, modifierNoName[i]);
        const modifierTranslation = [
          ...modifierNoName.slice(0, i),
          ...modifierNoName.slice(i + 1),
        ]
          .map((modifier) => modifierAs(modifierKind, modifier));
        return Output.combine(headWord, Output.combine(...modifierTranslation))
          .map(([headWord, modifiers]) =>
            [...modifiers.slice().reverse(), headWord].join(" ")
          )
          .map((translation) => {
            if (name != null) {
              return `${translation} named ${name}`;
            } else {
              return translation;
            }
          })
          .flatMap((left) =>
            suffixTranslation.map((right) => [left, right].join(" "))
          );
      });
    return Output.concat(translations, ...extraTranslations);
  } else {
    return translations;
  }
}
function phraseAs(
  kind: "noun" | "adjective",
  phrase: Phrase,
  options?: { named?: boolean; suffix?: boolean },
): TranslationOutput {
  if (phrase.type === "default") {
    return defaultPhraseAs(kind, phrase, options);
  } else {
    return new Output(new TodoError(`translation of ${phrase.type}`));
  }
}
function translateMultiplePhrases(
  phrases: MultiplePhrases,
  translator: (phrase: Phrase) => TranslationOutput,
  level: 1 | 2 = 2,
): TranslationOutput {
  switch (phrases.type) {
    case "single":
      return translator(phrases.phrase);
    case "and conjunction":
    case "anu": {
      let conjunction: string;
      if (phrases.type === "and conjunction") {
        conjunction = "and";
      } else {
        conjunction = "or";
      }
      const translations = Output.combine(
        ...phrases.phrases.map((phrases) =>
          translateMultiplePhrases(phrases, translator, 1)
        ),
      );
      switch (level) {
        case 2:
          return translations.map((phrases) => {
            if (phrases.length === 2) {
              return [phrases[0], conjunction, phrases[1]].join(" ");
            } else {
              const comma = phrases.slice(0, phrases.length - 1);
              const last = phrases[phrases.length - 1];
              return [
                comma.map((translation) => [translation, ", "].join("")).join(
                  "",
                ),
                conjunction,
                " ",
                last,
              ]
                .join("");
            }
          });
        case 1:
          return translations
            .map((phrases) => phrases.join([" ", conjunction, " "].join("")));
      }
    }
  }
}
/** Translates a clause. */
function translateClause(clause: Clause): TranslationOutput {
  switch (clause.type) {
    case "phrases": {
      const hasEn = (phrases: MultiplePhrases): boolean => {
        switch (phrases.type) {
          case "single":
            return false;
          case "and conjunction":
            return true;
          case "anu":
            return phrases.phrases.some(hasEn);
        }
      };
      const { phrases } = clause;
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
    }
    case "o vocative":
      return translateMultiplePhrases(
        clause.phrases,
        (phrase) => phraseAs("noun", phrase).map((phrase) => `hey ${phrase}`),
      );
    // case "li clause":
    // case "o clause":
    // case "prepositions":
    // case "quotation":
    default:
      return new Output(new TodoError(`translation for ${clause.type}`));
  }
}
/** Translates a full clause. */
function translateFullClause(fullClause: FullClause): TranslationOutput {
  // let but = "";
  // const {taso} = fullClause
  // if (taso) {
  //   if (taso.type === "default") {
  //     but = "but ";
  //   } else if (taso.type === "reduplication") {
  //     but = new Array(taso.count).fill("but ").join("");
  //   }
  // }
  // let isntIt = "";
  // const {anuSeme} = fullClause
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
  return Output.combine(
    ...[...sentence.laClauses, sentence.finalClause].map(translateFullClause),
  ).map(
    (clauses) => {
      const contexts = clauses.slice(0, clauses.length - 1);
      const final = clauses[clauses.length - 1];
      return [
        ...contexts.map((context) => `given ${context}, `),
        final,
        sentence.punctuation,
      ]
        .join("");
    },
  );
}
/** Translates multiple sentences. */
function translateSentences(sentences: MultipleSentences): TranslationOutput {
  if (sentences.type === "sentences") {
    return Output.combine(...sentences.sentences.map(translateSentence))
      .map((sentences) => sentences.join(" "));
  } else {
    return new Output(new TodoError("translation of a single word"));
  }
}
/** Full Toki Pona translator. */
export function translate(src: string): TranslationOutput {
  return parse(src).flatMap(translateSentences);
}
