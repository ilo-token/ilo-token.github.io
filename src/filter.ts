/** Module describing filter rules integrated within AST Parser. */

import {
  Clause,
  FullClause,
  Modifier,
  ModifyingParticle,
  MultiplePhrases,
  Phrase,
  Preposition,
  Sentence,
  someModifierInPhrase,
  someObjectInMultiplePredicate,
  somePhraseInMultiplePhrases,
  WordUnit,
} from "./ast.ts";
import { UnrecognizedError } from "./error.ts";
import { settings } from "./settings.ts";
import { describe } from "./token-tree.ts";

/** Array of filter rules for a word unit. */
export const WORD_UNIT_RULES: Array<(wordUnit: WordUnit) => boolean> = [
  // avoid "seme ala seme"
  (wordUnit) => {
    if (wordUnit.type === "x ala x" && wordUnit.word === "seme") {
      throw new UnrecognizedError('"seme ala seme"');
    }
    return true;
  },
  // // avoid reduplication of "wan" and "tu"
  // (wordUnit) => {
  //   if (
  //     wordUnit.type === "reduplication" &&
  //     (wordUnit.word === "wan" || wordUnit.word === "tu")
  //   ) {
  //     throw new UnrecognizedError(`reduplication of ${wordUnit.word}`);
  //   }
  //   return true;
  // },
  // disallow "anu" as content word only when turned off in settings
  (wordUnit) => {
    if (settings.get("anu-as-content-word")) {
      return true;
    }
    const isAnu = (
      wordUnit.type === "default" ||
      wordUnit.type === "reduplication" ||
      wordUnit.type === "x ala x"
    ) && wordUnit.word === "anu";
    if (isAnu) {
      throw new UnrecognizedError("anu as content word");
    } else {
      return true;
    }
  },
  // "n" and multiple "a" cannot modify a word
  (wordUnit) => {
    if (
      (wordUnit.type === "default" || wordUnit.type === "reduplication") &&
      isMultipleAOrN(wordUnit.modifyingParticle)
    ) {
      throw new UnrecognizedError(
        `${describe(wordUnit.modifyingParticle!)} modifying a word`,
      );
    }
    return true;
  },
];
/** Array of filter rules for a single modifier. */
export const MODIFIER_RULES: Array<(modifier: Modifier) => boolean> = [
  // quotation modifier cannot exist
  (modifier) => {
    if (modifier.type === "quotation") {
      throw new UnrecognizedError("quotation as modifier");
    }
    return true;
  },
  // disallow _nanpa ala nanpa_
  (modifier) => {
    if (modifier.type === "nanpa" && modifier.nanpa.type === "x ala x") {
      throw new UnrecognizedError('"nanpa ala nanpa"');
    }
    return true;
  },
  // nanpa construction cannot contain preposition
  (modifier) => {
    if (modifier.type === "nanpa" && modifier.phrase.type === "preposition") {
      throw new UnrecognizedError("preposition inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain preverb
  (modifier) => {
    if (modifier.type === "nanpa" && modifier.phrase.type === "preverb") {
      throw new UnrecognizedError("preverb inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain quotation
  (modifier) => {
    if (modifier.type === "nanpa" && modifier.phrase.type === "quotation") {
      throw new UnrecognizedError("quotation inside nanpa");
    }
    return true;
  },
  // nanpa construction cannot contain pi
  (modifier) => {
    if (
      modifier.type === "nanpa" &&
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
      modifier.type === "nanpa" &&
      modifier.phrase.type === "default" &&
      modifier.phrase.modifiers.some((modifier) => modifier.type === "nanpa")
    ) {
      throw new UnrecognizedError("nanpa inside nanpa");
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
  // pi cannot be nested
  (modifier) => {
    const checker = (modifier: Modifier) => {
      switch (modifier.type) {
        case "default":
        case "proper words":
        case "quotation":
          return false;
        case "nanpa":
          return someModifierInPhrase(modifier.phrase, false, checker);
        case "pi":
          return true;
      }
    };
    if (modifier.type === "pi") {
      if (someModifierInPhrase(modifier.phrase, false, checker)) {
        throw new UnrecognizedError("pi inside pi");
      }
    }
    return true;
  },
];
/** Array of filter rules for multiple modifiers. */
export const MULTIPLE_MODIFIERS_RULES: Array<
  (modifier: Array<Modifier>) => boolean
> = [
  // no multiple pi
  (modifiers) => {
    if (modifiers.filter((modifier) => modifier.type === "pi").length > 1) {
      throw new UnrecognizedError("multiple pi");
    }
    return true;
  },
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
  // avoid duplicate modifiers
  (modifiers) => {
    const set = new Set<string>();
    for (const modifier of modifiers) {
      let word: string;
      switch (modifier.type) {
        case "default":
          if (modifier.word.type !== "number") {
            word = modifier.word.word;
            break;
          } else {
            continue;
          }
        case "pi":
          if (
            modifier.phrase.type === "default" &&
            modifier.phrase.headWord.type !== "number"
          ) {
            word = modifier.phrase.headWord.word;
            break;
          } else {
            continue;
          }
        case "quotation":
        case "proper words":
        case "nanpa":
          continue;
      }
      if (set.has(word)) {
        throw new UnrecognizedError(`duplicate "${word}" in modifier`);
      } else {
        set.add(word);
      }
    }
    return true;
  },
];
/** Array of filter rules for a single phrase. */
export const PHRASE_RULE: Array<(phrase: Phrase) => boolean> = [
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
      throw new UnrecognizedError("Multiple number words");
    }
    return true;
  },
  // If the phrase has no modifiers, avoid modifying particle
  (phrase) =>
    phrase.type !== "default" ||
    phrase.modifyingParticle == null ||
    phrase.modifiers.length !== 0,
  // "n" and multiple "a" cannot modify a phrase
  (wordUnit) => {
    if (
      (wordUnit.type === "default" || wordUnit.type === "preverb") &&
      isMultipleAOrN(wordUnit.modifyingParticle)
    ) {
      throw new UnrecognizedError(
        `${describe(wordUnit.modifyingParticle!)} modifying a word`,
      );
    }
    return true;
  },
];
/** Array of filter rules for preposition. */
export const PREPOSITION_RULE: Array<(phrase: Preposition) => boolean> = [
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
      somePhraseInMultiplePhrases(preposition.phrases, hasPrepositionInPhrase)
    ) {
      throw new UnrecognizedError("Preposition inside preposition");
    }
    return true;
  },
  // "n" and multiple "a" cannot modify a preposition
  (wordUnit) => {
    if (isMultipleAOrN(wordUnit.modifyingParticle)) {
      throw new UnrecognizedError(
        `${describe(wordUnit.modifyingParticle!)} modifying a word`,
      );
    }
    return true;
  },
];
/** Array of filter rules for clauses. */
export const CLAUSE_RULE: Array<(clause: Clause) => boolean> = [
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
    if (somePhraseInMultiplePhrases(phrases, hasPrepositionInPhrase)) {
      throw new UnrecognizedError("Preposition in subject");
    }
    return true;
  },
  // disallow preposition in object
  (clause) => {
    if (
      (clause.type === "li clause" || clause.type === "o clause") &&
      someObjectInMultiplePredicate(clause.predicates, hasPrepositionInPhrase)
    ) {
      throw new UnrecognizedError("Preposition in object");
    }
    return true;
  },
];
export const FULL_CLAUSE_RULE: Array<(fullClase: FullClause) => boolean> = [
  // Prevent "taso ala taso"
  (fullClause) => {
    if (fullClause.type === "default") {
      const { preclause } = fullClause;
      if (
        preclause != null &&
        preclause.type === "taso" &&
        preclause.taso.type === "x ala x"
      ) {
        throw new UnrecognizedError('"taso ala taso"');
      }
    }
    return true;
  },
  // // If the clause is just a single phrase, avoid post modifying particles
  // // unless it is "n"
  // (fullClause) => {
  //   if (
  //     fullClause.type === "default" &&
  //     fullClause.postclause != null &&
  //     fullClause.postclause.type === "modifying particle"
  //   ) {
  //     const modifyingParticle = fullClause.postclause.modifyingParticle;
  //     if (
  //       (modifyingParticle.type === "word" ||
  //         modifyingParticle.type === "long word") &&
  //       modifyingParticle.word === "n"
  //     ) {
  //       return true;
  //     }
  //     if (
  //       fullClause.clause.type === "phrases" &&
  //       fullClause.clause.phrases.type === "single"
  //     ) {
  //       throw new CoveredError();
  //     }
  //   }
  //   return true;
  // },
];
/** Array of filter rules for multiple sentences. */
export const MULTIPLE_SENTENCES_RULE: Array<
  (sentences: Array<Sentence>) => boolean
> = [
  // Only allow at most 2 sentences
  (sentences) => {
    if (sentences.length > 2) {
      throw new UnrecognizedError("Multiple sentences");
    }
    return true;
  },
];
/** Helper function for generating filter function. */
export function filter<T>(
  rules: Array<(value: T) => boolean>,
): (value: T) => boolean {
  return (value) => rules.every((rule) => rule(value));
}
/** Helper function for checking whether a modifier is numeric. */
function modifierIsNumeric(modifier: Modifier): boolean {
  return modifier.type === "default" && modifier.word.type === "number";
}
/**
 * Helper function for checking if the modifiers is exactly just "ala" or nothing.
 */
function modifiersIsAlaOrNone(modifiers: Array<Modifier>): boolean {
  if (modifiers.length > 1) {
    return false;
  } else if (modifiers.length === 1) {
    const [modifier] = modifiers;
    return modifier.type === "default" && modifier.word.type === "default" &&
      modifier.word.word === "ala";
  }
  return true;
}
/**
 * Helper function for determining whether the phrase has a preposition inside.
 */
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
function isMultipleAOrN(modifyingParticle: null | ModifyingParticle): boolean {
  return modifyingParticle != null &&
    (modifyingParticle.type === "multiple a" ||
      ((modifyingParticle.type === "word" ||
        modifyingParticle.type === "long word") &&
        modifyingParticle.word === "n"));
}
