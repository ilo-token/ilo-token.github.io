/** Module for describing Toki Pona AST. */

/** Represents a modifying particle. */
export type ModifyingParticle =
  | { type: "word"; word: string }
  | { type: "long word"; word: string; length: number }
  | { type: "multiple a"; count: number };
/** Represents a word unit. */
export type WordUnit =
  | {
    type: "default";
    word: string;
    modifyingParticle: null | ModifyingParticle;
  }
  | { type: "x ala x"; word: string }
  | { type: "reduplication"; word: string; count: number }
  | { type: "number"; number: number };
/** Represents a single modifier. */
export type Modifier =
  | { type: "default"; word: WordUnit }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | { type: "nanpa"; nanpa: WordUnit; phrase: Phrase }
  | { type: "quotation"; quotation: Quotation };
/**
 * Represents a phrase including preverbial phrases, quotations, and
 * prepositional phrases intended for predicate.
 */
export type Phrase =
  | {
    type: "default";
    headWord: WordUnit;
    modifiers: Array<Modifier>;
    modifyingParticle: null | ModifyingParticle;
  }
  | {
    type: "preverb";
    preverb: WordUnit;
    modifiers: Array<Modifier>;
    phrase: Phrase;
    modifyingParticle: null | ModifyingParticle;
  }
  | { type: "preposition"; preposition: Preposition }
  | { type: "quotation"; quotation: Quotation };
/** Represents multiple phrases separated by repeated particle or "anu". */
export type MultiplePhrases =
  | { type: "single"; phrase: Phrase }
  | { type: "and conjunction"; phrases: Array<MultiplePhrases> }
  | { type: "anu"; phrases: Array<MultiplePhrases> };
/** Represents a single prepositional phrase. */
export type Preposition = {
  preposition: WordUnit;
  modifiers: Array<Modifier>;
  /** This cannot be an "and conjunction": only "anu" or "single". */
  phrases: MultiplePhrases;
  modifyingParticle: null | ModifyingParticle;
};
/** Represents multiple predicates. */
export type MultiplePredicates =
  | { type: "single"; predicate: Phrase }
  | {
    type: "associated";
    predicates: MultiplePhrases;
    objects: null | MultiplePhrases;
    prepositions: Array<Preposition>;
  }
  | { type: "and conjunction"; predicates: Array<MultiplePredicates> }
  | { type: "anu"; predicates: Array<MultiplePredicates> };
/** Represents a simple clause. */
export type Clause =
  | { type: "phrases"; phrases: MultiplePhrases }
  | { type: "o vocative"; phrases: MultiplePhrases }
  | {
    type: "li clause";
    subjects: MultiplePhrases;
    predicates: MultiplePredicates;
    explicitLi: boolean;
  }
  | {
    type: "o clause";
    subjects: null | MultiplePhrases;
    predicates: MultiplePredicates;
  }
  | { type: "prepositions"; prepositions: Array<Preposition> }
  | { type: "quotation"; quotation: Quotation };
/** Represents constructions found in the start of the clause. */
export type Preclause =
  | { type: "taso"; taso: WordUnit }
  | { type: "modifying particle"; modifyingParticle: ModifyingParticle };
/** Represents constructions found in the end of the clause. */
export type Postclause =
  | { type: "anu seme"; seme: WordUnit }
  | { type: "modifying particle"; modifyingParticle: ModifyingParticle };
/** Represents a clause including preclause and postclause. */
export type FullClause =
  | {
    type: "default";
    preclause: null | Preclause;
    postclause: null | Postclause;
    clause: Clause;
  }
  | { type: "modifying particle"; modifyingParticle: ModifyingParticle };
/** Represents a single full sentence. */
export type Sentence = {
  laClauses: Array<FullClause>;
  finalClause: FullClause;
  punctuation: string;
};
/** Represents quotation. */
export type Quotation = {
  sentences: Array<Sentence>;
  leftMark: string;
  rightMark: string;
};
/** The final representation of whole Toki Pona input text. */
export type MultipleSentences =
  | { type: "single word"; word: string }
  | { type: "sentences"; sentences: Array<Sentence> };
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
      const preposition = phrase.preposition;
      return preposition.modifiers.some(checker) ||
        someModifierInMultiplePhrases(
          preposition.phrases,
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
