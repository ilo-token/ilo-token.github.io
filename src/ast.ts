export type Modifier =
  | { type: "word"; word: string }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | { type: "nanpa ordinal"; phrase: Phrase }
  | { type: "cardinal"; number: Array<string> };

export type Phrase = { head: string; modifiers: Array<Modifier> };

export type FullPhrase =
  | { type: "default"; phrase: Phrase }
  | { type: "preverb"; preverb: string; phrase: Phrase };

export type Preposition = { preposition: string; phrase: FullPhrase };

export type Clause =
  | { type: "en phrase"; phrases: Array<FullPhrase> }
  | { type: "o vocative"; phrases: Array<FullPhrase> }
  | {
      type: "li clause";
      subjects: Array<FullPhrase>;
      predicates: Array<FullPhrase>;
      prepositions: Array<Preposition>;
    }
  | {
      type: "o clause";
      subjects: Array<FullPhrase>;
      predicates: Array<FullPhrase>;
      prepositions: Array<Preposition>;
    }
  | { type: "preposition"; prepositions: Array<Preposition> };

export type FullClause = { taso: boolean; clause: Clause };

export type Sentence =
  | { type: "single clause"; clause: FullClause }
  | { type: "la"; left: Clause; right: Sentence };
