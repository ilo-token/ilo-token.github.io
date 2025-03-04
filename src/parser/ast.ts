export type Emphasis =
  | { type: "word"; word: string }
  | { type: "long word"; word: string; length: number };
export type Filler =
  | Emphasis
  | { type: "multiple a"; count: number };
export type SimpleHeadedWordUnit =
  | { type: "default"; word: string }
  | { type: "x ala x"; word: string }
  | { type: "reduplication"; word: string; count: number };
export type SimpleWordUnit =
  | SimpleHeadedWordUnit
  | { type: "number"; words: ReadonlyArray<string> };
export type HeadedWordUnit =
  & SimpleHeadedWordUnit
  & { emphasis: null | Emphasis };
export type WordUnit =
  & SimpleWordUnit
  & { emphasis: null | Emphasis };
export type Nanpa = { nanpa: WordUnit; phrase: Phrase };
export type Modifier =
  | { type: "default"; word: WordUnit }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | ({ type: "nanpa" } & Nanpa)
  | ({ type: "quotation" } & Quotation);
export type Phrase =
  | {
    type: "default";
    headWord: WordUnit;
    modifiers: ReadonlyArray<Modifier>;
    emphasis: null | Emphasis;
  }
  | {
    type: "preverb";
    preverb: HeadedWordUnit;
    modifiers: ReadonlyArray<Modifier>;
    phrase: Phrase;
    emphasis: null | Emphasis;
  }
  | ({ type: "preposition" } & Preposition)
  | ({ type: "quotation" } & Quotation);
export type MultiplePhrases =
  | { type: "single"; phrase: Phrase }
  | { type: "and conjunction"; phrases: ReadonlyArray<MultiplePhrases> }
  | { type: "anu"; phrases: ReadonlyArray<MultiplePhrases> };
export type Preposition = {
  preposition: HeadedWordUnit;
  modifiers: ReadonlyArray<Modifier>;
  phrases: MultiplePhrases & { type: "single" | "anu" };
  emphasis: null | Emphasis;
};
export type Predicate =
  | { type: "single"; predicate: Phrase }
  | {
    type: "associated";
    predicates: MultiplePhrases;
    objects: null | MultiplePhrases;
    prepositions: ReadonlyArray<Preposition>;
  }
  | { type: "and conjunction"; predicates: ReadonlyArray<Predicate> }
  | { type: "anu"; predicates: ReadonlyArray<Predicate> };
export type Clause =
  | { type: "phrases"; phrases: MultiplePhrases }
  | { type: "o vocative"; phrases: MultiplePhrases }
  | {
    type: "li clause";
    subjects: MultiplePhrases;
    predicates: Predicate;
    explicitLi: boolean;
  }
  | {
    type: "o clause";
    subjects: null | MultiplePhrases;
    predicates: Predicate;
  }
  | { type: "prepositions"; prepositions: ReadonlyArray<Preposition> }
  | ({ type: "quotation" } & Quotation);
export type ContextClause =
  | Clause
  | ({ type: "nanpa" } & Nanpa);
export type Sentence =
  | {
    type: "default";
    kinOrTaso: null | HeadedWordUnit;
    laClauses: ReadonlyArray<ContextClause>;
    finalClause: Clause;
    anuSeme: null | HeadedWordUnit;
    emphasis: null | Emphasis;
    punctuation: string;
    interrogative: null | "seme" | "x ala x";
  }
  | {
    type: "filler";
    filler: Filler;
    punctuation: string;
    interrogative: null | "seme" | "x ala x";
  };
export type Quotation = {
  sentences: ReadonlyArray<Sentence>;
  leftMark: string;
  rightMark: string;
};
export type MultipleSentences =
  | { type: "single word"; word: string }
  | { type: "sentences"; sentences: ReadonlyArray<Sentence> };
