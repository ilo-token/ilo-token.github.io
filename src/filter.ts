/** Module describing filter rules integrated within AST Parser. */

import {
  Clause,
  Emphasis,
  everyWordUnitInSentence,
  FullClause,
  Modifier,
  MultiplePhrases,
  MultiplePredicates,
  Phrase,
  Preposition,
  Sentence,
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
  // disallow "anu" as content word only when turned off in settings
  (wordUnit) => {
    if (settings.get("anu-as-content-word")) {
      return true;
    }
    const isAnu = (
      wordUnit.type === "default" ||
      wordUnit.type === "reduplication" ||
      wordUnit.type === "x ala x"
    ) &&
      wordUnit.word === "anu";
    if (isAnu) {
      throw new UnrecognizedError("anu as content word");
    } else {
      return true;
    }
  },
  // "n" and multiple "a" cannot modify a word
  (wordUnit) => {
    if (isMultipleAOrN(wordUnit.emphasis)) {
      throw new UnrecognizedError(
        `${describe(wordUnit.emphasis!)} modifying a word`,
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
  // pi cannot have emphasis particle
  (modifier) => {
    if (modifier.type === "pi") {
      const phrase = modifier.phrase;
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
  // nanpa cannot have emphasis particle
  (modifier) => {
    if (modifier.type === "nanpa") {
      const phrase = modifier.phrase;
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
  // If the phrase has no modifiers, avoid emphasis particle
  (phrase) =>
    phrase.type !== "default" ||
    phrase.emphasis == null ||
    phrase.modifiers.length > 0,
  // "n" and multiple "a" cannot modify a phrase
  (wordUnit) => {
    if (
      (wordUnit.type === "default" || wordUnit.type === "preverb") &&
      isMultipleAOrN(wordUnit.emphasis)
    ) {
      throw new UnrecognizedError(
        `${describe(wordUnit.emphasis!)} modifying a word`,
      );
    }
    return true;
  },
  // For preverbs, inner phrase must not have emphasis particle
  (phrase) =>
    phrase.type !== "preverb" ||
    !phraseHasTopLevelEmphasis(phrase.phrase),
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
    if (isMultipleAOrN(wordUnit.emphasis)) {
      throw new UnrecognizedError(
        `${describe(wordUnit.emphasis!)} modifying a word`,
      );
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
  // disallow "mi li" or "sina li"
  (clause) => {
    if (
      clause.type === "li clause" &&
      clause.explicitLi &&
      clause.subjects.type === "single"
    ) {
      const phrase = clause.subjects.phrase;
      if (
        phrase.type === "default" &&
        phrase.headWord.type === "default" &&
        phrase.headWord.emphasis == null &&
        phrase.modifiers.length === 0 &&
        phrase.emphasis == null
      ) {
        const word = phrase.headWord.word;
        if (word === "mi" || word === "sina") {
          throw new UnrecognizedError(`"${word} li"`);
        }
      }
    }
    return true;
  },
];
export const FULL_CLAUSE_RULE: Array<(fullClase: FullClause) => boolean> = [
  // Prevent "taso ala taso" or "kin ala kin"
  (fullClause) => {
    if (fullClause.type === "default") {
      if (
        fullClause.kinOrTaso != null && fullClause.kinOrTaso.type === "x ala x"
      ) {
        const word = fullClause.kinOrTaso.word;
        throw new UnrecognizedError(`"${word} ala ${word}"`);
      }
    }
    return true;
  },
];
export const SENTENCE_RULE: Array<(sentence: Sentence) => boolean> = [
  // If there is "la", there must be no filler
  (sentence) => {
    if (sentence.laClauses.length > 0) {
      for (const clause of [...sentence.laClauses, sentence.finalClause]) {
        if (clause.type === "filler") {
          throw new UnrecognizedError('filler with "la"');
        }
      }
    }
    return true;
  },
  // If there is "la", there can't be "taso" or "kin"
  (sentence) => {
    if (sentence.laClauses.length > 0) {
      for (const clause of [...sentence.laClauses, sentence.finalClause]) {
        if (clause.type === "default" && clause.kinOrTaso != null) {
          throw new UnrecognizedError(
            `${clause.kinOrTaso.word} particle with "la"`,
          );
        }
      }
    }
    return true;
  },
  // Only the last clause can have anu seme
  (sentence) => {
    for (const clause of sentence.laClauses) {
      if (clause.type === "default" && clause.anuSeme != null) {
        throw new UnrecognizedError("anu seme inside sentence");
      }
    }
    return true;
  },
  // Only the first clause can have starting particle
  (sentence) => {
    for (
      const clause of [...sentence.laClauses, sentence.finalClause].slice(1)
    ) {
      if (clause.type === "default" && clause.startingParticle != null) {
        throw new UnrecognizedError("emphasis phrase inside sentence");
      }
    }
    return true;
  },
  // Only the last clause can have ending particle
  (sentence) => {
    for (const clause of sentence.laClauses) {
      if (clause.type === "default" && clause.endingParticle != null) {
        throw new UnrecognizedError("emphasis phrase inside sentence");
      }
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
/**
 * Helper function for checking whether some modifier passes the test
 * function.
 */
export function someModifierInPhrase(
  phrase: Phrase,
  whenQuotation: boolean,
  checker: (modifier: Modifier) => boolean,
): boolean {
  switch (phrase.type) {
    case "default":
      return phrase.modifiers.some(checker);
    case "preverb":
      return phrase.modifiers.some(checker) ||
        someModifierInPhrase(phrase.phrase, whenQuotation, checker);
    case "preposition": {
      return phrase.modifiers.some(checker) ||
        someModifierInMultiplePhrases(
          phrase.phrases,
          whenQuotation,
          checker,
        );
    }
    case "quotation":
      return whenQuotation;
  }
}
/**
 * Helper function for checking whether some modifier passes the test
 * function.
 */
export function someModifierInMultiplePhrases(
  phrases: MultiplePhrases,
  whenQuotation: boolean,
  checker: (modifier: Modifier) => boolean,
): boolean {
  switch (phrases.type) {
    case "single":
      return someModifierInPhrase(phrases.phrase, whenQuotation, checker);
    case "and conjunction":
    case "anu":
      return phrases.phrases
        .some((phrases) =>
          someModifierInMultiplePhrases(phrases, whenQuotation, checker)
        );
  }
}
/**
 * Helper function for checking whether some phrase passes the test
 * function.
 */
export function somePhraseInMultiplePhrases(
  phrases: MultiplePhrases,
  checker: (modifier: Phrase) => boolean,
): boolean {
  switch (phrases.type) {
    case "single":
      return checker(phrases.phrase);
    case "and conjunction":
    case "anu":
      return phrases.phrases
        .some((phrases) => somePhraseInMultiplePhrases(phrases, checker));
  }
}
/**
 * Helper function for checking whether some object phrase passes the test
 * function.
 */
export function someObjectInMultiplePredicate(
  predicate: MultiplePredicates,
  checker: (object: Phrase) => boolean,
): boolean {
  switch (predicate.type) {
    case "single":
      return false;
    case "associated":
      if (predicate.objects) {
        return somePhraseInMultiplePhrases(predicate.objects, checker);
      } else {
        return false;
      }
    case "and conjunction":
    case "anu":
      return predicate.predicates
        .some((predicates) =>
          someObjectInMultiplePredicate(predicates, checker)
        );
  }
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
function isMultipleAOrN(emphasis: null | Emphasis): boolean {
  return emphasis != null &&
    (emphasis.type === "multiple a" ||
      ((emphasis.type === "word" ||
        emphasis.type === "long word") &&
        emphasis.word === "n"));
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
