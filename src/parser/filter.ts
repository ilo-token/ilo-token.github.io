import { extractArrayResultError } from "../array_result.ts";
import { compound, flattenError, throwError } from "../../misc/misc.ts";
import { settings } from "../settings.ts";
import {
  Clause,
  ContextClause,
  Modifier,
  MultiplePhrases,
  Nanpa,
  Phrase,
  Preposition,
  Sentence,
  WordUnit,
} from "./ast.ts";
import {
  everyObjectInMultiplePredicates,
  everyPhraseInMultiplePhrases,
  everyWordUnitInPhrase,
  everyWordUnitInPreposition,
  everyWordUnitInSentence,
} from "./extract.ts";
import { UnrecognizedError } from "./parser_lib.ts";

export const WORD_UNIT_RULES: ReadonlyArray<(wordUnit: WordUnit) => boolean> = [
  // avoid "seme ala seme"
  (wordUnit) =>
    wordUnit.type !== "x ala x" || wordUnit.word !== "seme" ||
    throwError(new UnrecognizedError('"seme ala seme"')),
];
export const NANPA_RULES: ReadonlyArray<(nanpa: Nanpa) => boolean> = [
  // disallow "nanpa ala nanpa"
  ({ nanpa: { type } }) =>
    type !== "x ala x" ||
    throwError(new UnrecognizedError('"nanpa ala nanpa"')),

  // nanpa construction cannot contain preposition
  ({ phrase: { type } }) =>
    type !== "preposition" ||
    throwError(new UnrecognizedError("preposition inside nanpa")),

  // nanpa construction cannot contain preverb
  ({ phrase: { type } }) =>
    type !== "preverb" ||
    throwError(new UnrecognizedError("preverb inside nanpa")),

  // nanpa construction cannot contain pi
  ({ phrase }) =>
    phrase.type !== "default" ||
    phrase.modifiers.every(({ type }) => type !== "pi") ||
    throwError(new UnrecognizedError("pi inside nanpa")),

  // nanpa construction cannot contain nanpa
  ({ phrase }) =>
    phrase.type !== "default" ||
    phrase.modifiers.every(({ type }) => type !== "nanpa") ||
    throwError(new UnrecognizedError("nanpa inside nanpa")),

  // nanpa cannot have emphasis particle
  ({ phrase: { emphasis } }) => emphasis == null,
];
export const MODIFIER_RULES: ReadonlyArray<(modifier: Modifier) => boolean> = [
  // pi cannot contain preposition
  (modifier) =>
    modifier.type !== "pi" || modifier.phrase.type !== "preposition" ||
    throwError(new UnrecognizedError("preposition inside pi")),

  // pi must follow phrases with modifier
  (modifier) => {
    if (modifier.type === "pi") {
      const { phrase } = modifier;
      if (phrase.type === "default" && phrase.modifiers.length === 0) {
        throw new UnrecognizedError("pi followed by one word");
      }
    }
    return true;
  },
  // // pi cannot be nested
  // (modifier) => {
  //   const checker = (modifier: Modifier) => {
  //     switch (modifier.type) {
  //       case "default":
  //       case "proper words":
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
  (modifier: ReadonlyArray<Modifier>) => boolean
> = [
  // // no multiple pi
  // (modifiers) =>
  //   modifiers.filter(({type}) => type === "pi").length <= 1 ||
  //   throwError(new UnrecognizedError("multiple pi")),

  // no multiple nanpa
  (modifiers) =>
    modifiers.filter(({ type }) => type === "nanpa").length <= 1 ||
    throwError(new UnrecognizedError("multiple nanpa")),

  // no multiple proper words
  (modifiers) =>
    modifiers
        .filter(({ type }) => type === "proper words")
        .length <= 1 ||
    throwError(new UnrecognizedError("multiple proper words")),

  // no multiple number words
  (modifiers) =>
    modifiers.filter(modifierIsNumeric).length <= 1 ||
    throwError(new UnrecognizedError("multiple number words")),

  // avoid duplicate modifiers when disabled by settings
  (modifiers) => {
    if (settings.separateRepeatedModifiers) {
      return true;
    } else {
      const words = modifiers.flatMap((modifier) => {
        switch (modifier.type) {
          case "default":
            if (modifier.word.type !== "number") {
              return [modifier.word.word];
            } else {
              return [];
            }
          case "pi":
            if (
              modifier.phrase.type === "default" &&
              modifier.phrase.headWord.type !== "number"
            ) {
              return [modifier.phrase.headWord.word];
            } else {
              return [];
            }
          case "proper words":
          case "nanpa":
            return [];
        }
      });
      const duplicate = findDuplicate(words);
      if (duplicate.size === 0) {
        return true;
      } else {
        const repeatConjunction = false;
        const list = compound(
          [...duplicate].map((word) => `"${word}"`),
          "and",
          repeatConjunction,
        );
        throw new UnrecognizedError(
          `duplicate ${list} in modifier`,
        );
      }
    }
  },
];
export const PHRASE_RULE: ReadonlyArray<(phrase: Phrase) => boolean> = [
  // Disallow preverb modifiers other than "ala"
  (phrase) =>
    phrase.type !== "preverb" || modifiersIsAlaOrNone(phrase.modifiers) ||
    throwError(
      new UnrecognizedError('preverb with modifiers other than "ala"'),
    ),

  // No multiple number words
  (phrase) =>
    phrase.type !== "default" ||
    phrase.headWord.type !== "number" ||
    !phrase.modifiers.some(modifierIsNumeric) ||
    throwError(new UnrecognizedError("multiple number words")),

  // If the phrase has no modifiers, avoid emphasis particle
  (phrase) =>
    phrase.type !== "default" ||
    phrase.emphasis == null ||
    phrase.modifiers.length > 0,

  // For preverbs, inner phrase must not have emphasis particle
  (phrase) =>
    phrase.type !== "preverb" ||
    !phraseHasTopLevelEmphasis(phrase.phrase),

  // Emphasis must not be nested
  (phrase) =>
    phrase.emphasis == null ||
    everyWordUnitInPhrase(phrase)
      .every(({ emphasis }) => emphasis == null) ||
    throwError(new UnrecognizedError("nested emphasis")),
];
export const PREPOSITION_RULE: ReadonlyArray<(phrase: Preposition) => boolean> =
  [
    // Disallow preverb modifiers other than "ala"
    (preposition) =>
      modifiersIsAlaOrNone(preposition.modifiers) ||
      throwError(
        new UnrecognizedError('preverb with modifiers other than "ala"'),
      ),

    // Disallow nested preposition
    (preposition) =>
      !everyPhraseInMultiplePhrases(preposition.phrases)
        .some(hasPrepositionInPhrase) ||
      throwError(new UnrecognizedError("preposition inside preposition")),

    // Preposition with "anu" must not have emphasis particle
    (preposition) =>
      preposition.emphasis == null || preposition.phrases.type !== "anu",

    // Inner phrase must not have emphasis particle
    (preposition) =>
      preposition.phrases.type !== "single" ||
      !phraseHasTopLevelEmphasis(preposition.phrases.phrase),

    // Emphasis must not be nested
    (preposition) =>
      preposition.emphasis == null ||
      everyWordUnitInPreposition(preposition)
        .every(({ emphasis }) => emphasis == null) ||
      throwError(new UnrecognizedError("nested emphasis")),
  ];
export const CONTEXT_CLAUSE_RULE: ReadonlyArray<
  (contextClause: ContextClause) => boolean
> = [
  // Prevent "anu ala anu la"
  (clause) =>
    clause.type !== "anu" || clause.anu.type !== "x ala x" ||
    throwError(new UnrecognizedError('"anu ala anu la"')),
];
export const CLAUSE_RULE: ReadonlyArray<(clause: Clause) => boolean> = [
  // disallow preposition in subject
  (clause) => {
    let phrases: MultiplePhrases;
    switch (clause.type) {
      case "phrases":
      case "o vocative":
        phrases = clause.phrases;
        break;
      case "li clause":
      case "o clause":
        if (clause.subjects) {
          phrases = clause.subjects;
        } else {
          return true;
        }
        break;
    }
    if (
      everyPhraseInMultiplePhrases(phrases).some(hasPrepositionInPhrase)
    ) {
      throw new UnrecognizedError("preposition in subject");
    } else {
      return true;
    }
  },
  // disallow preposition in object
  (clause) => {
    switch (clause.type) {
      case "li clause":
      case "o clause":
        if (
          everyObjectInMultiplePredicates(clause.predicates)
            .some(hasPrepositionInPhrase)
        ) {
          throw new UnrecognizedError("preposition in object");
        } else {
          return true;
        }
      default:
        return true;
    }
  },
  // disallow "mi li" or "sina li"
  (clause) => {
    if (
      clause.type === "li clause" &&
      clause.explicitLi &&
      clause.subjects.type === "single"
    ) {
      const { subjects: { phrase } } = clause;
      if (
        phrase.type === "default" &&
        phrase.headWord.type === "default" &&
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
export const SENTENCE_RULE: ReadonlyArray<(sentence: Sentence) => boolean> = [
  // Prevent "taso ala taso" or "kin ala kin"
  (sentence) => {
    if (sentence.type === "default") {
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
  // If there is "la", there can't be starting particle e.g. taso
  (sentence) =>
    sentence.type !== "default" || sentence.contextClauses.length === 0 ||
    sentence.startingParticle == null || throwError(
      new UnrecognizedError(
        `${sentence.startingParticle.word} particle with "la"`,
      ),
    ),

  // There can't be more than 1 "x ala x" or "seme"
  (sentence) => {
    if (sentence.interrogative != null) {
      const interrogative = everyWordUnitInSentence(sentence)
        .filter((wordUnit) => {
          switch (wordUnit.type) {
            case "number":
              return false;
            case "x ala x":
              return true;
            case "default":
            case "reduplication":
              return wordUnit.word === "seme";
          }
        });
      if (interrogative.length > 1) {
        throw new UnrecognizedError(
          'more than 1 interrogative elements: "x ala x" or "seme"',
        );
      }
    }
    return true;
  },
];
export const MULTIPLE_SENTENCES_RULE: ReadonlyArray<
  (sentences: ReadonlyArray<Sentence>) => boolean
> = [
  // Only allow at most 2 sentences
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
          return flattenError(error);
        }
      },
    );
    if (result.every((result) => result == null)) {
      return true;
    } else {
      const errors = extractArrayResultError(
        result.flatMap((result) => result ?? []),
      );
      switch (errors.length) {
        case 0:
          return false;
        case 1:
          throw errors[0];
        default:
          throw new AggregateError(errors);
      }
    }
  };
}
function modifierIsNumeric(modifier: Modifier): boolean {
  return modifier.type === "default" && modifier.word.type === "number";
}
function modifiersIsAlaOrNone(modifiers: ReadonlyArray<Modifier>): boolean {
  switch (modifiers.length) {
    case 0:
      return true;
    case 1: {
      const [modifier] = modifiers;
      return modifier.type === "default" && modifier.word.type === "default" &&
        modifier.word.word === "ala";
    }
    default:
      return false;
  }
}
function hasPrepositionInPhrase(phrase: Phrase): boolean {
  switch (phrase.type) {
    case "default":
      return false;
    case "preposition":
      return true;
    case "preverb":
      return hasPrepositionInPhrase(phrase.phrase);
  }
}
function phraseHasTopLevelEmphasis(phrase: Phrase): boolean {
  switch (phrase.type) {
    case "default":
    case "preverb":
    case "preposition":
      return phrase.emphasis != null;
  }
}
function findDuplicate<T>(iterable: Iterable<T>): Set<T> {
  const unique = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of iterable) {
    if (unique.has(value)) {
      duplicates.add(value);
    } else {
      unique.add(value);
    }
  }
  return duplicates;
}
