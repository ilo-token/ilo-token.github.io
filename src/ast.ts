/** Represents a single modifier. */
export type Modifier =
  | { type: "word"; word: string; alaQuestion: boolean }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | { type: "nanpa ordinal"; phrase: Phrase }
  | { type: "cardinal"; number: Array<string> }
  | { type: "quotation"; quotation: Quotation };
/** Represents quotation. */
export type Quotation = {
  sentences: Array<Sentence>;
  leftMark: string;
  rightMark: string;
};
/**
 * Represents a phrase including preverbial phrases, quotations, and
 * prepositional phrases intended for predicate.
 */
export type Phrase = {
  type: "default";
  headWord: string;
  alaQuestion: boolean;
  modifiers: Array<Modifier>;
} | {
  type: "cardinal";
  number: Array<string>;
  modifiers: Array<Modifier>;
} | {
  type: "preverb";
  preverb: string;
  alaQuestion: boolean;
  modifiers: Array<Modifier>;
  phrase: Phrase;
} | {
  type: "preposition";
  preposition: Preposition;
} | {
  type: "quotation";
  quotation: Quotation;
};
/** Represents a single prepositional phrase. */
export type Preposition = {
  preposition: string;
  alaQuestion: boolean;
  modifiers: Array<Modifier>;
  phrase: Phrase;
};
/** Represents a single predicate and multiple objects. */
export type PredicateObjects = {
  predicate: Phrase;
  objects: Array<Phrase>;
};
/** Represents a simple clause. */
export type Clause = { type: "en phrases"; phrases: Array<Phrase> } | {
  type: "o vocative";
  phrases: Array<Phrase>;
} | {
  type: "li clause";
  subjects: Array<Phrase>;
  predicates: Array<PredicateObjects>;
  prepositions: Array<Preposition>;
} | {
  type: "o clause";
  subjects: Array<Phrase>;
  predicates: Array<PredicateObjects>;
  prepositions: Array<Preposition>;
} | {
  type: "prepositions";
  prepositions: Array<Preposition>;
}; /** Represents a clause including preclause and postclause. */
export type FullClause = {
  taso: boolean;
  anuSeme: boolean;
  clause: Clause;
};
/** Represents a single full sentence. */
export type Sentence = { laClauses: Array<FullClause>; punctuation: string };
