export type Emphasis =
  | Readonly<{ type: "word"; word: string }>
  | Readonly<{ type: "long word"; word: string; length: number }>;
export type Filler =
  | Emphasis
  | Readonly<{ type: "multiple a"; count: number }>;
export type SimpleHeadedWordUnit =
  | Readonly<{ type: "default"; word: string }>
  | Readonly<{ type: "x ala x"; word: string }>
  | Readonly<{ type: "reduplication"; word: string; count: number }>;
export type SimpleWordUnit =
  | SimpleHeadedWordUnit
  | Readonly<{ type: "number"; words: ReadonlyArray<string> }>;
export type HeadedWordUnit =
  & SimpleHeadedWordUnit
  & Readonly<{ emphasis: null | Emphasis }>;
export type WordUnit =
  & SimpleWordUnit
  & Readonly<{ emphasis: null | Emphasis }>;
export type Nanpa = Readonly<{ nanpa: WordUnit; phrase: Phrase }>;
export type Modifier =
  | Readonly<{ type: "default"; word: WordUnit }>
  | Readonly<{ type: "proper words"; words: string }>
  | Readonly<{ type: "pi"; phrase: Phrase }>
  | (Readonly<{ type: "nanpa" }> & Nanpa);
export type Phrase =
  | Readonly<{
    type: "default";
    headWord: WordUnit;
    modifiers: ReadonlyArray<Modifier>;
    emphasis: null | Emphasis;
  }>
  | Readonly<{
    type: "preverb";
    preverb: HeadedWordUnit;
    modifiers: ReadonlyArray<Modifier>;
    phrase: Phrase;
    emphasis: null | Emphasis;
  }>
  | (Readonly<{ type: "preposition" }> & Preposition);
export type MultiplePhrases =
  | Readonly<{ type: "single"; phrase: Phrase }>
  | Readonly<{
    type: "and conjunction";
    phrases: ReadonlyArray<MultiplePhrases>;
  }>
  | Readonly<{ type: "anu"; phrases: ReadonlyArray<MultiplePhrases> }>;
export type Preposition = Readonly<{
  preposition: HeadedWordUnit;
  modifiers: ReadonlyArray<Modifier>;
  phrases: MultiplePhrases & Readonly<{ type: "single" | "anu" }>;
  emphasis: null | Emphasis;
}>;
export type Predicate =
  | Readonly<{ type: "single"; predicate: Phrase }>
  | Readonly<{
    type: "associated";
    predicates: MultiplePhrases;
    objects: null | MultiplePhrases;
    prepositions: ReadonlyArray<Preposition>;
  }>
  | Readonly<{ type: "and conjunction"; predicates: ReadonlyArray<Predicate> }>
  | Readonly<{ type: "anu"; predicates: ReadonlyArray<Predicate> }>;
export type Clause =
  | Readonly<{ type: "phrases"; phrases: MultiplePhrases }>
  | Readonly<{ type: "o vocative"; phrases: MultiplePhrases }>
  | Readonly<{
    type: "li clause";
    subjects: MultiplePhrases;
    predicates: Predicate;
    explicitLi: boolean;
  }>
  | Readonly<{
    type: "o clause";
    subjects: null | MultiplePhrases;
    predicates: Predicate;
  }>
  | Readonly<
    { type: "prepositions"; prepositions: ReadonlyArray<Preposition> }
  >;
export type ContextClause =
  | Clause
  | (Readonly<{ type: "nanpa" }> & Nanpa);
export type Sentence =
  | Readonly<{
    type: "default";
    kinOrTaso: null | HeadedWordUnit;
    laClauses: ReadonlyArray<ContextClause>;
    finalClause: Clause;
    anuSeme: null | HeadedWordUnit;
    emphasis: null | Emphasis;
    punctuation: string;
    interrogative: null | "seme" | "x ala x";
  }>
  | Readonly<{
    type: "filler";
    filler: Filler;
    punctuation: string;
    interrogative: null | "seme" | "x ala x";
  }>;
export type Quotation = Readonly<{
  sentences: ReadonlyArray<Sentence>;
  leftMark: string;
  rightMark: string;
}>;
export type MultipleSentences =
  | Readonly<{ type: "single word"; word: string }>
  | Readonly<{ type: "sentences"; sentences: ReadonlyArray<Sentence> }>;
