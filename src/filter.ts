import { Modifier, MultiplePhrases, Phrase, WordUnit } from "./ast.ts";
import { UnrecognizedError } from "./error.ts";

/** Array of filter rules for a word unit. */
export const WORD_UNIT_RULES: Array<(wordUnit: WordUnit) => boolean> = [
  // avoid "seme ala seme"
  (wordUnit) => {
    if (wordUnit.type === "x ala x" && wordUnit.word === "seme") {
      throw new UnrecognizedError('"seme ala seme"');
    }
    return true;
  },
  // avoid reduplication of "wan" and "tu"
  (wordUnit) => {
    if (
      wordUnit.type === "x ala x" &&
      (wordUnit.word === "wan" || wordUnit.word === "tu")
    ) {
      throw new UnrecognizedError(`reduplication of ${wordUnit.word}`);
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
    if (modifier.type === "nanpa" && modifier.phrase.type === "default") {
      if (
        modifier.phrase.modifiers.some((modifier) => modifier.type === "pi")
      ) {
        throw new UnrecognizedError("pi inside nanpa");
      }
    }
    return true;
  },
  // nanpa construction cannot contain nanpa
  (modifier) => {
    if (modifier.type === "nanpa" && modifier.phrase.type === "default") {
      if (
        modifier.phrase.modifiers.some((modifier) => modifier.type === "nanpa")
      ) {
        throw new UnrecognizedError("nanpa inside nanpa");
      }
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
      const phrase = modifier.phrase;
      if (phrase.type === "default" && phrase.modifiers.length === 0) {
        throw new UnrecognizedError("pi followed by one word");
      }
    }
    return true;
  },
  // pi cannot be nested
  (modifier) => {
    if (modifier.type === "pi") {
      if (phraseHasPi(modifier.phrase)) {
        throw new UnrecognizedError("pi inside pi");
      }
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
/** Checks if modifiers has _pi_. */
function modifiersHasPi(modifiers: Array<Modifier>): boolean {
  return modifiers.some((modifier) => {
    if (
      modifier.type === "default" || modifier.type === "proper words" ||
      modifier.type === "quotation"
    ) {
      return false;
    } else if (modifier.type === "nanpa") {
      return phraseHasPi(modifier.phrase);
    } else if (modifier.type === "pi") {
      return true;
    } else {
      throw new Error("unreachable error");
    }
  });
}
/** Checks if a single phrase has _pi_. */
function phraseHasPi(phrase: Phrase): boolean {
  if (phrase.type === "default") {
    return modifiersHasPi(phrase.modifiers);
  } else if (phrase.type === "preverb") {
    return modifiersHasPi(phrase.modifiers) || phraseHasPi(phrase.phrase);
  } else if (phrase.type === "preposition") {
    const preposition = phrase.preposition;
    return modifiersHasPi(preposition.modifiers) ||
      multiplePhrasesHasPi(preposition.phrases);
  } else if (phrase.type === "quotation") {
    return false;
  } else {
    throw new Error("unreachable error");
  }
}
/** Checks if multiple phrases has _pi_. */
function multiplePhrasesHasPi(phrases: MultiplePhrases): boolean {
  if (phrases.type === "single") {
    return phraseHasPi(phrases.phrase);
  } else if (phrases.type === "and conjunction" || phrases.type === "anu") {
    return phrases.phrases.some(multiplePhrasesHasPi);
  } else {
    throw new Error("unreachable error");
  }
}
