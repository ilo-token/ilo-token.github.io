import { throwError } from "../../misc/misc.ts";
import { extractResultError } from "../compound.ts";
import {
  Clause,
  ContextClause,
  Modifier,
  Nanpa,
  Phrase,
  Preposition,
  Sentence,
  WordUnit,
} from "./ast.ts";
import {
  everyWordUnitInPhrase,
  everyWordUnitInPreposition,
  everyWordUnitInSentence,
} from "./extract.ts";
import { UnrecognizedError } from "./parser_lib.ts";

export const WORD_UNIT_RULES: ReadonlyArray<(wordUnit: WordUnit) => boolean> = [
  // disallow "seme ala seme"
  (wordUnit) =>
    wordUnit.type !== "x ala x" || wordUnit.word !== "seme" ||
    throwError(new UnrecognizedError('"seme ala seme"')),
];
export const NANPA_RULES: ReadonlyArray<(nanpa: Nanpa) => boolean> = [
  // disallow "nanpa ala nanpa"
  ({ nanpa: { type } }) =>
    type !== "x ala x" ||
    throwError(new UnrecognizedError('"nanpa ala nanpa"')),

  // nanpa construction cannot contain preverbs
  ({ phrase: { type } }) =>
    type !== "preverb" ||
    throwError(new UnrecognizedError("preverb inside nanpa")),

  // nanpa construction cannot contain pi
  ({ phrase }) =>
    phrase.type !== "simple" ||
    phrase.modifiers.every(({ type }) => type !== "pi") ||
    throwError(new UnrecognizedError("pi inside nanpa")),

  // nanpa construction cannot contain nanpa
  ({ phrase }) =>
    phrase.type !== "simple" ||
    phrase.modifiers.every(({ type }) => type !== "nanpa") ||
    throwError(new UnrecognizedError("nanpa inside nanpa")),

  // nanpa cannot have emphasis particle
  ({ phrase: { emphasis } }) => emphasis == null,
];
export const MODIFIER_RULES: ReadonlyArray<(modifier: Modifier) => boolean> = [
  // pi must follow phrases with modifier
  (modifier) => {
    if (modifier.type === "pi") {
      const { phrase } = modifier;
      if (phrase.type === "simple" && phrase.modifiers.length === 0) {
        throw new UnrecognizedError("pi followed by one word");
      }
    }
    return true;
  },
  // // pi cannot be nested
  // (modifier) => {
  //   const checker = (modifier: Modifier) => {
  //     switch (modifier.type) {
  //       case "simple":
  //       case "name":
  //       case "nanpa":
  //         return everyModifierInPhrase(modifier.phrase).some(checker);
  //       case "pi":
  //         return true;
  //     }
  //   };
  //   if (modifier.type === "pi") {
  //     if (everyModifierInPhrase(modifier.phrase).some(checker)) {
  //       throw new UnrecognizedError("pi inside pi");
  //     }
  //   }
  //   return true;
  // },

  // pi cannot have emphasis particle
  (modifier) => modifier.type !== "pi" || modifier.phrase.emphasis == null,
];
export const MULTIPLE_MODIFIERS_RULES: ReadonlyArray<
  (modifiers: ReadonlyArray<Modifier>) => boolean
> = [
  // // disallow multiple pi
  // (modifiers) =>
  //   modifiers.filter(({type}) => type === "pi").length <= 1 ||
  //   throwError(new UnrecognizedError("multiple pi")),

  // disallow multiple nanpa
  (modifiers) =>
    modifiers.filter(({ type }) => type === "nanpa").length <= 1 ||
    throwError(new UnrecognizedError("multiple nanpa")),

  // disallow multiple proper words
  (modifiers) =>
    modifiers
        .filter(({ type }) => type === "name")
        .length <= 1 ||
    throwError(new UnrecognizedError("multiple proper words")),

  // disallow multiple number words
  (modifiers) =>
    modifiers.filter(modifierIsNumeric).length <= 1 ||
    throwError(new UnrecognizedError("multiple number words")),
];
export const PHRASE_RULES: ReadonlyArray<(phrase: Phrase) => boolean> = [
  // disallow preverb modifiers other than "ala"
  (phrase) =>
    phrase.type !== "preverb" || modifiersIsAlaOrNone(phrase.modifiers) ||
    throwError(
      new UnrecognizedError('preverb with modifiers other than "ala"'),
    ),

  // disallow multiple number words
  (phrase) =>
    phrase.type !== "simple" ||
    phrase.headWord.type !== "number" ||
    !phrase.modifiers.some(modifierIsNumeric) ||
    throwError(new UnrecognizedError("multiple number words")),

  // if the phrase has no modifiers, disallow emphasis particle
  (phrase) =>
    phrase.type !== "simple" ||
    phrase.emphasis == null ||
    phrase.modifiers.length > 0,

  // for preverbs, inner phrase must not have emphasis particle
  (phrase) =>
    phrase.type !== "preverb" ||
    !phraseHasTopLevelEmphasis(phrase.phrase),

  // emphasis must not be nested
  (phrase) =>
    phrase.emphasis == null ||
    everyWordUnitInPhrase(phrase)
      .every(({ emphasis }) => emphasis == null) ||
    throwError(new UnrecognizedError("nested emphasis")),
];
export const PREPOSITION_RULES: ReadonlyArray<
  (phrase: Preposition) => boolean
> = [
  // disallow preverb modifiers other than "ala"
  (preposition) =>
    modifiersIsAlaOrNone(preposition.modifiers) ||
    throwError(
      new UnrecognizedError('preverb with modifiers other than "ala"'),
    ),

  // preposition with "anu" must not have emphasis particle
  (preposition) =>
    preposition.emphasis == null || preposition.phrases.type !== "anu",

  // inner phrase must not have emphasis particle
  (preposition) =>
    preposition.phrases.type !== "simple" ||
    !phraseHasTopLevelEmphasis(preposition.phrases.phrase),

  // emphasis must not be nested
  (preposition) =>
    preposition.emphasis == null ||
    everyWordUnitInPreposition(preposition)
      .every(({ emphasis }) => emphasis == null) ||
    throwError(new UnrecognizedError("nested emphasis")),
];
export const CONTEXT_CLAUSE_RULES: ReadonlyArray<
  (contextClause: ContextClause) => boolean
> = [
  // disallow "anu ala anu la"
  (clause) =>
    clause.type !== "anu" || clause.anu.type !== "x ala x" ||
    throwError(new UnrecognizedError('"anu ala anu la"')),
];
export const CLAUSE_RULES: ReadonlyArray<(clause: Clause) => boolean> = [
  // disallow "mi li" or "sina li"
  (clause) => {
    if (
      clause.type === "li clause" &&
      clause.explicitLi &&
      clause.subjects.type === "simple"
    ) {
      const { subjects: { phrase } } = clause;
      if (
        phrase.type === "simple" &&
        phrase.headWord.type === "simple" &&
        phrase.headWord.emphasis == null &&
        phrase.modifiers.length === 0 &&
        phrase.emphasis == null
      ) {
        const { headWord: { word } } = phrase;
        if (["mi", "sina"].includes(word)) {
          throw new UnrecognizedError(`"${word} li"`);
        }
      }
    }
    return true;
  },
];
export const SENTENCE_RULES: ReadonlyArray<(sentence: Sentence) => boolean> = [
  // disallow "taso ala taso" or "kin ala kin"
  (sentence) => {
    if (sentence.type === "simple") {
      if (
        sentence.startingParticle != null &&
        sentence.startingParticle.type === "x ala x"
      ) {
        const { startingParticle: { word } } = sentence;
        throw new UnrecognizedError(`"${word} ala ${word}"`);
      }
    }
    return true;
  },
  // there can't be more than 1 "x ala x" or "seme"
  (sentence) => {
    if (sentence.interrogative != null) {
      const interrogatives = everyWordUnitInSentence(sentence)
        .filter((wordUnit) => {
          switch (wordUnit.type) {
            case "number":
              return false;
            case "x ala x":
              return true;
            case "simple":
            case "reduplication":
              return wordUnit.word === "seme";
          }
        });
      if (interrogatives.length > 1) {
        throw new UnrecognizedError(
          'more than 1 interrogative elements: "x ala x" or "seme"',
        );
      }
    }
    return true;
  },
  // "anu la" must only be at the beginning
  (sentence) =>
    sentence.type !== "simple" ||
    sentence.contextClauses.slice(1).every(({ type }) => type !== "anu") ||
    throwError(new UnrecognizedError('"anu la" inside a sentence')),

  // TODO: also include "kin" and "anu" as content word
  // there cannot be both "anu" as sentence starting particle and "anu la"
  (sentence) =>
    sentence.type !== "simple" || sentence.startingParticle == null ||
    sentence.startingParticle.word !== "anu" ||
    sentence.contextClauses.every(({ type }) => type !== "anu"),
];
export const MULTIPLE_SENTENCES_RULES: ReadonlyArray<
  (sentences: ReadonlyArray<Sentence>) => boolean
> = [
  // only allow at most 2 sentences
  (sentences) =>
    sentences.filter(({ type }) => type !== "filler").length <= 2 ||
    throwError(new UnrecognizedError("multiple sentences")),
];
export function filter<T>(
  rules: ReadonlyArray<(value: T) => boolean>,
): (value: T) => boolean {
  return (value) => {
    const result = rules.map(
      (rule) => {
        try {
          if (rule(value)) {
            return null;
          } else {
            return [];
          }
        } catch (error) {
          return extractResultError(error);
        }
      },
    );
    if (result.every((result) => result == null)) {
      return true;
    } else {
      const errors = result.flatMap((result) => result ?? []);
      if (errors.length === 0) {
        return false;
      } else {
        throw new AggregateError(errors);
      }
    }
  };
}
function modifierIsNumeric(modifier: Modifier) {
  return modifier.type === "simple" && modifier.word.type === "number";
}
function modifiersIsAlaOrNone(modifiers: ReadonlyArray<Modifier>) {
  switch (modifiers.length) {
    case 0:
      return true;
    case 1: {
      const [modifier] = modifiers;
      return modifier.type === "simple" && modifier.word.type === "simple" &&
        modifier.word.word === "ala";
    }
    default:
      return false;
  }
}
function phraseHasTopLevelEmphasis(phrase: Phrase) {
  switch (phrase.type) {
    case "simple":
    case "preverb":
      return phrase.emphasis != null;
  }
}
