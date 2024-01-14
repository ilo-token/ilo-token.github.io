/** Represents a single modifier. */
export type Modifier =
  | { type: "word"; word: string; alaQuestion: boolean }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | { type: "nanpa ordinal"; phrase: Phrase }
  | { type: "cardinal"; number: Array<string> };

/** Represents a simple phrase. */
export type SimplePhrase = {
  type: "default";
  headWord: string;
  alaQuestion: boolean;
  modifiers: Array<Modifier>;
} | { type: "cardinal"; number: Array<string> };

/** Represents a phrase including preverbial phrases. */
export type Phrase =
  | { type: "default"; phrase: SimplePhrase }
  | {
    type: "preverb";
    preverb: string;
    alaQuestion: boolean;
    phrase: SimplePhrase;
  };

/** Represents a single prepositional phrase. */
export type Preposition = {
  preposition: string;
  alaQuestion: boolean;
  modifiers: Array<Modifier>;
  phrase: Phrase;
};

/** Represents a single predicate. */
export type Predicate =
  | { type: "default"; predicate: Phrase; objects: Array<Phrase> }
  | {
    type: "preposition";
    preposition: Preposition;
    objects: Array<Phrase>;
  };

/** Represents a simple clause. */
export type Clause =
  | { type: "en phrases"; phrases: Array<Phrase> }
  | { type: "o vocative"; phrases: Array<Phrase> }
  | {
    type: "li clause";
    subjects: Array<Phrase>;
    predicates: Array<Predicate>;
    prepositions: Array<Preposition>;
  }
  | {
    type: "o clause";
    subjects: Array<Phrase>;
    predicates: Array<Predicate>;
    prepositions: Array<Preposition>;
  }
  | { type: "prepositions"; prepositions: Array<Preposition> };

/** Represents a clause including preclause and postclause. */
export type FullClause = { taso: boolean; anuSeme: boolean; clause: Clause };

/** Represents a single full sentence. */
export type Sentence =
  | { type: "single clause"; clause: FullClause }
  | { type: "la clauses"; left: FullClause; right: Sentence };
