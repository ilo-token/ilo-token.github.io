import { extractArrayResultError } from "../array_result.ts";
import { flattenError } from "../misc.ts";
import { settings } from "../settings.ts";
import {
  Clause,
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
  (wordUnit) => {
    if (wordUnit.type === "x ala x" && wordUnit.word === "seme") {
      throw new UnrecognizedError('"seme ala seme"');
    }
    return true;
  },
];
export const NANPA_RULES: ReadonlyArray<(nanpa: Nanpa) => boolean> = [
  // disallow _nanpa ala nanpa_
  (modifier) => {
    if (modifier.nanpa.type === "x ala x") {
      throw new UnrecognizedError('"nanpa ala nanpa"');
    }
    return true;
  },
  // nanpa construction cannot contain preposition
  (modifier) => {
    if (modifier.phrase.type === "preposition") {
      throw new UnrecognizedError("preposition inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain preverb
  (modifier) => {
    if (modifier.phrase.type === "preverb") {
      throw new UnrecognizedError("preverb inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain quotation
  (modifier) => {
    if (modifier.phrase.type === "quotation") {
      throw new UnrecognizedError("quotation inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain pi
  (modifier) => {
    if (
      modifier.phrase.type === "default" &&
      modifier.phrase.modifiers.some((modifier) => modifier.type === "pi")
    ) {
      throw new UnrecognizedError("pi inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain nanpa
  (modifier) => {
    if (
      modifier.phrase.type === "default" &&
      modifier.phrase.modifiers.some((modifier) => modifier.type === "nanpa")
    ) {
      throw new UnrecognizedError("nanpa inside nanpa");
    }
    return true;
  },
  // nanpa cannot have emphasis particle
  (modifier) => {
    const { phrase } = modifier;
    if (
      (
        phrase.type === "default" ||
        phrase.type === "preverb" ||
        phrase.type === "preposition"
      ) &&
      phrase.emphasis != null
    ) {
      return false;
    }
    return true;
  },
];
export const MODIFIER_RULES: ReadonlyArray<(modifier: Modifier) => boolean> = [
  // quotation modifier cannot exist
  (modifier) => {
    if (modifier.type === "quotation") {
      throw new UnrecognizedError("quotation as modifier");
    }
    return true;
  },
  // pi cannot contain preposition
  (modifier) => {
    if (modifier.type === "pi" && modifier.phrase.type === "preposition") {
      throw new UnrecognizedError("preposition inside pi");
    }
    return true;
  },
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
  //       case "quotation":
  //         return false;
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
  (modifier) => {
    if (modifier.type === "pi") {
      const { phrase } = modifier;
      if (
        (
          phrase.type === "default" ||
          phrase.type === "preverb" ||
          phrase.type === "preposition"
        ) &&
        phrase.emphasis != null
      ) {
        return false;
      }
    }
    return true;
  },
];
export const MULTIPLE_MODIFIERS_RULES: ReadonlyArray<
  (modifier: ReadonlyArray<Modifier>) => boolean
> = [
  // // no multiple pi
  // (modifiers) => {
  //   if (modifiers.filter((modifier) => modifier.type === "pi").length > 1) {
  //     throw new UnrecognizedError("multiple pi");
  //   }
  //   return true;
  // },
  // no multiple nanpa
  (modifiers) => {
    if (modifiers.filter((modifier) => modifier.type === "nanpa").length > 1) {
      throw new UnrecognizedError("multiple nanpa");
    }
    return true;
  },
  // no multiple proper words
  (modifiers) => {
    if (
      modifiers.filter((modifier) => modifier.type === "proper words").length >
        1
    ) {
      throw new UnrecognizedError("multiple proper words");
    }
    return true;
  },
  // no multiple number words
  (modifiers) => {
    if (modifiers.filter(modifierIsNumeric).length > 1) {
      throw new UnrecognizedError("multiple number words");
    }
    return true;
  },
  // avoid duplicate modifiers when disabled by settings
  (modifiers) => {
    if (settings.separateRepeatedModifiers) {
      return true;
    }
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
        case "quotation":
        case "proper words":
        case "nanpa":
          return [];
      }
    });
    for (const [i, a] of words.entries()) {
      for (const b of words.slice(i + 1)) {
        if (a === b) {
          throw new UnrecognizedError(`duplicate "${a}" in modifier`);
        }
      }
    }
    return true;
  },
];
export const PHRASE_RULE: ReadonlyArray<(phrase: Phrase) => boolean> = [
  // Disallow quotation
  (phrase) => {
    if (phrase.type === "quotation") {
      throw new UnrecognizedError("quotation as phrase");
    }
    return true;
  },
  // Disallow preverb modifiers other than "ala"
  (phrase) => {
    if (phrase.type === "preverb" && !modifiersIsAlaOrNone(phrase.modifiers)) {
      throw new UnrecognizedError('preverb with modifiers other than "ala"');
    }
    return true;
  },
  // No multiple number words
  (phrase) => {
    if (
      phrase.type === "default" &&
      phrase.headWord.type === "number" &&
      phrase.modifiers.some(modifierIsNumeric)
    ) {
      throw new UnrecognizedError("multiple number words");
    }
    return true;
  },
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
  (phrase) => {
    if (
      (phrase.type === "default" || phrase.type === "preverb" ||
        phrase.type === "preposition") &&
      phrase.emphasis != null &&
      everyWordUnitInPhrase(phrase)
        .some((wordUnit) => wordUnit.emphasis != null)
    ) {
      throw new UnrecognizedError("nested emphasis");
    }
    return true;
  },
];
export const PREPOSITION_RULE: ReadonlyArray<(phrase: Preposition) => boolean> =
  [
    // Disallow preverb modifiers other than "ala"
    (preposition) => {
      if (!modifiersIsAlaOrNone(preposition.modifiers)) {
        throw new UnrecognizedError('preverb with modifiers other than "ala"');
      }
      return true;
    },
    // Disallow nested preposition
    (preposition) => {
      if (
        everyPhraseInMultiplePhrases(preposition.phrases)
          .some(hasPrepositionInPhrase)
      ) {
        throw new UnrecognizedError("preposition inside preposition");
      }
      return true;
    },
    // Preposition with "anu" must not have emphasis particle
    (preposition) =>
      preposition.emphasis == null || preposition.phrases.type !== "anu",
    // Inner phrase must not have emphasis particle
    (preposition) =>
      preposition.phrases.type !== "single" ||
      !phraseHasTopLevelEmphasis(preposition.phrases.phrase),
    // Emphasis must not be nested
    (preposition) => {
      if (
        preposition.emphasis != null &&
        everyWordUnitInPreposition(preposition)
          .some((wordUnit) => wordUnit.emphasis != null)
      ) {
        throw new UnrecognizedError("nested emphasis");
      }
      return true;
    },
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
      case "prepositions":
      case "quotation":
        return true;
    }
    if (
      everyPhraseInMultiplePhrases(phrases).some(hasPrepositionInPhrase)
    ) {
      throw new UnrecognizedError("preposition in subject");
    }
    return true;
  },
  // disallow preposition in object
  (clause) => {
    if (
      (clause.type === "li clause" || clause.type === "o clause") &&
      everyObjectInMultiplePredicates(clause.predicates)
        .some(hasPrepositionInPhrase)
    ) {
      throw new UnrecognizedError("preposition in object");
    }
    return true;
  },
  // disallow "mi li" or "sina li"
  (clause) => {
    if (
      clause.type === "li clause" &&
      clause.explicitLi &&
      clause.subjects.type === "single"
    ) {
      const { phrase } = clause.subjects;
      if (
        phrase.type === "default" &&
        phrase.headWord.type === "default" &&
        phrase.headWord.emphasis == null &&
        phrase.modifiers.length === 0 &&
        phrase.emphasis == null
      ) {
        const { word } = phrase.headWord;
        if (word === "mi" || word === "sina") {
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
        sentence.kinOrTaso != null && sentence.kinOrTaso.type === "x ala x"
      ) {
        const { word } = sentence.kinOrTaso;
        throw new UnrecognizedError(`"${word} ala ${word}"`);
      }
    }
    return true;
  },
  // If there is "la", there can't be "taso" or "kin"
  (sentence) => {
    if (
      sentence.type === "default" && sentence.laClauses.length > 0 &&
      sentence.kinOrTaso != null
    ) {
      throw new UnrecognizedError(
        `${sentence.kinOrTaso.word} particle with "la"`,
      );
    }
    return true;
  },
  // There can't be more than 1 "x ala x" or "seme"
  (sentence) => {
    if (
      sentence.interrogative != null && everyWordUnitInSentence(sentence)
          .filter((wordUnit) =>
            wordUnit.type === "x ala x" ||
            ((wordUnit.type === "default" ||
              wordUnit.type === "reduplication") &&
              wordUnit.word === "seme")
          )
          .length > 1
    ) {
      throw new UnrecognizedError(
        'more than 1 interrogative elements: "x ala x" or "seme"',
      );
    }
    return true;
  },
];
export const MULTIPLE_SENTENCES_RULE: ReadonlyArray<
  (sentences: ReadonlyArray<Sentence>) => boolean
> = [
  // Only allow at most 2 sentences
  (sentences) => {
    if (sentences.filter((sentence) => sentence.type !== "filler").length > 2) {
      throw new UnrecognizedError("multiple sentences");
    }
    return true;
  },
];
export function filter<T>(
  rules: ReadonlyArray<(value: T) => boolean>,
): (value: T) => boolean {
  return (value) => {
    const result: ReadonlyArray<null | ReadonlyArray<unknown>> = rules.map(
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
    case "quotation":
      return false;
  }
}
function phraseHasTopLevelEmphasis(phrase: Phrase): boolean {
  switch (phrase.type) {
    case "default":
    case "preverb":
    case "preposition":
      return phrase.emphasis != null;
    case "quotation":
      return false;
  }
}
