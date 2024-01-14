/** Represents a single modifier. */
export type Modifier =
  | { type: "word"; word: string }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: FullPhrase }
  | { type: "nanpa ordinal"; phrase: FullPhrase }
  | { type: "cardinal"; number: Array<string> };

/** Represents a simple phrase. */
export type Phrase = { headWord: string; modifiers: Array<Modifier> };

/** Represents a phrase including preverbial phrases. */
export type FullPhrase =
  | { type: "default"; phrase: Phrase }
  | { type: "preverb"; preverb: string; phrase: Phrase };

/** Represents a single prepositional phrase. */
export type Preposition = { preposition: string; phrase: FullPhrase };

/** Represents a single predicate. */
export type Predicate =
  | { type: "default"; predicate: FullPhrase }
  | { type: "preposition"; preposition: Preposition };

/** Represents a simple clause. */
export type Clause =
  | { type: "en phrases"; phrases: Array<FullPhrase> }
  | { type: "o vocative"; phrases: Array<FullPhrase> }
  | {
    type: "li clause";
    subjects: Array<FullPhrase>;
    predicates: Array<Predicate>;
    prepositions: Array<Preposition>;
  }
  | {
    type: "o clause";
    subjects: Array<FullPhrase>;
    predicates: Array<Predicate>;
    prepositions: Array<Preposition>;
  }
  | { type: "prepositions"; prepositions: Array<Preposition> };

/** Represents a clause including preclause and postclause. */
export type FullClause = { taso: boolean; clause: Clause };

/** Represents a single full sentence. */
export type Sentence =
  | { type: "single clause"; clause: FullClause }
  | { type: "la clauses"; left: FullClause; right: Sentence };
