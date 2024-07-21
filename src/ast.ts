/** Module for describing Toki Pona AST. */

/** Represents an emphasis particle. */
export type Emphasis =
  | { type: "word"; word: string }
  | { type: "long word"; word: string; length: number }
  | { type: "multiple a"; count: number };
export type SimpleHeadedWordUnit =
  | { type: "default"; word: string }
  | { type: "x ala x"; word: string }
  | { type: "reduplication"; word: string; count: number };
export type SimpleWordUnit =
  | SimpleHeadedWordUnit
  | { type: "number"; number: number };
export type HeadedWordUnit =
  & SimpleHeadedWordUnit
  & { emphasis: null | Emphasis };
/** Represents a word unit. */
export type WordUnit =
  & SimpleWordUnit
  & { emphasis: null | Emphasis };
/** Represents a single modifier. */
export type Modifier =
  | { type: "default"; word: WordUnit }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | { type: "nanpa"; nanpa: WordUnit; phrase: Phrase }
  | ({ type: "quotation" } & Quotation);
/**
 * Represents a phrase including preverbial phrases, quotations, and
 * prepositional phrases intended for predicate.
 */
export type Phrase =
  | {
    type: "default";
    headWord: WordUnit;
    modifiers: Array<Modifier>;
    emphasis: null | Emphasis;
  }
  | {
    type: "preverb";
    preverb: HeadedWordUnit;
    modifiers: Array<Modifier>;
    phrase: Phrase;
    emphasis: null | Emphasis;
  }
  | ({ type: "preposition" } & Preposition)
  | ({ type: "quotation" } & Quotation);
/** Represents multiple phrases separated by repeated particle or "anu". */
export type MultiplePhrases =
  | { type: "single"; phrase: Phrase }
  | { type: "and conjunction"; phrases: Array<MultiplePhrases> }
  | { type: "anu"; phrases: Array<MultiplePhrases> };
/** Represents a single prepositional phrase. */
export type Preposition = {
  preposition: HeadedWordUnit;
  modifiers: Array<Modifier>;
  phrases: MultiplePhrases & { type: "single" | "anu" };
  emphasis: null | Emphasis;
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
  | ({ type: "quotation" } & Quotation);
/** Represents a clause including preclauses and postclauses. */
export type FullClause =
  | {
    type: "default";
    startingParticle: null | Emphasis;
    kinOrTaso: null | HeadedWordUnit;
    clause: Clause;
    anuSeme: null | HeadedWordUnit;
    endingParticle: null | Emphasis;
  }
  | { type: "filler"; emphasis: Emphasis };
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
