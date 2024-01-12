export type Modifier =
  | { type: "word"; word: string }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: FullPhrase }
  | { type: "nanpa ordinal"; phrase: FullPhrase }
  | { type: "cardinal"; number: Array<string> };

export type Phrase = { headWord: string; modifiers: Array<Modifier> };

export type FullPhrase =
  | { type: "default"; phrase: Phrase }
  | { type: "preverb"; preverb: string; phrase: Phrase };

export type Preposition = { preposition: string; phrase: FullPhrase };

export type Predicate =
  | { type: "default"; predicate: FullPhrase }
  | { type: "preposition"; preposition: Preposition };

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

export type FullClause = { taso: boolean; clause: Clause };

export type Sentence =
  | { type: "single clause"; clause: FullClause }
  | { type: "la"; left: FullClause; right: Sentence };
