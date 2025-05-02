export type Emphasis =
  | Readonly<{ type: "word"; word: string }>
  | Readonly<{ type: "long word"; word: string; length: number }>;
export type Filler =
  | Emphasis
  | Readonly<{ type: "reduplicated a"; count: number }>;
export type SimpleHeadedWordUnit =
  | Readonly<{ type: "simple"; word: string }>
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
  | Readonly<{ type: "simple"; word: WordUnit }>
  | Readonly<{ type: "name"; words: string }>
  | Readonly<{ type: "pi"; phrase: Phrase }>
  | (Readonly<{ type: "nanpa" }> & Nanpa);
export type Phrase =
  | Readonly<{
    type: "simple";
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
  | Readonly<{ type: "simple"; phrase: Phrase }>
  | Readonly<{
    type: "and";
    phrases: ReadonlyArray<MultiplePhrases>;
  }>
  | Readonly<{ type: "anu"; phrases: ReadonlyArray<MultiplePhrases> }>;
export type Preposition = Readonly<{
  preposition: HeadedWordUnit;
  modifiers: ReadonlyArray<Modifier>;
  phrases: Readonly<{ type: "simple" | "anu" }> & MultiplePhrases;
  emphasis: null | Emphasis;
}>;
export type Predicate =
  | Readonly<{ type: "simple"; predicate: Phrase }>
  | Readonly<{
    type: "associated";
    predicates: MultiplePhrases;
    objects: null | MultiplePhrases;
    prepositions: ReadonlyArray<Preposition>;
  }>
  | Readonly<{ type: "and"; predicates: ReadonlyArray<Predicate> }>
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
  }>;
export type ContextClause =
  | Clause
  | Readonly<
    { type: "prepositions"; prepositions: ReadonlyArray<Preposition> }
  >
  | (Readonly<{ type: "nanpa" }> & Nanpa)
  | (Readonly<{ type: "anu"; anu: HeadedWordUnit }>);
export type Sentence =
  | Readonly<{
    type: "simple";
    startingParticle: null | HeadedWordUnit;
    contextClauses: ReadonlyArray<ContextClause>;
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
export type MultipleSentences =
  | Readonly<{ type: "single word"; word: string }>
  | Readonly<{ type: "sentences"; sentences: ReadonlyArray<Sentence> }>;
