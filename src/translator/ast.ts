import * as Dictionary from "../../dictionary/type.ts";

// When editing, update `./fixer.ts` as well

export type Word = Readonly<{
  word: string;
  emphasis: boolean;
}>;
export type Quantity = "singular" | "plural" | "condensed";
export type NounPhrase =
  | Readonly<{
    type: "simple";
    determiners: ReadonlyArray<Determiner>;
    adjectives: ReadonlyArray<AdjectivePhrase>;
    noun: Word;
    quantity: Quantity;
    perspective: Dictionary.Perspective;
    postAdjective: null | Readonly<{ adjective: string; name: string }>;
    postCompound: null | NounPhrase;
    prepositions: ReadonlyArray<Preposition>;
    emphasis: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    nouns: ReadonlyArray<NounPhrase>;
  }>;
export type Determiner = Readonly<{
  kind: Dictionary.DeterminerType;
  determiner: Word;
  quantity: Dictionary.Quantity;
}>;
export type AdjectivePhrase =
  | Readonly<{
    type: "simple";
    kind: Dictionary.AdjectiveType;
    adverbs: ReadonlyArray<Adverb>;
    adjective: Word;
    emphasis: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    adjectives: ReadonlyArray<AdjectivePhrase>;
    emphasis: boolean;
  }>;
export type Complement =
  | Readonly<{ type: "noun"; noun: NounPhrase }>
  | Readonly<{ type: "adjective"; adjective: AdjectivePhrase }>;
export type Adverb = Readonly<{
  adverb: Word;
  negative: boolean;
}>;
export type AdverbVerb = {
  preAdverbs: ReadonlyArray<Adverb>;
  verb: Word;
  postAdverb: null | Adverb;
};
export type Verb = Readonly<{
  modal: null | AdverbVerb;
  verbs: ReadonlyArray<AdverbVerb>;
}>;
export type VerbPhrase =
  | Readonly<{
    type: "simple";
    verb: Verb;
    subjectComplement: null | Complement;
    contentClause: null | Clause;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    prepositions: ReadonlyArray<Preposition>;
    hideVerb: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    verbs: ReadonlyArray<VerbPhrase>;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    prepositions: ReadonlyArray<Preposition>;
  }>;
export type Clause =
  | Readonly<{
    type: "simple";
    subject: NounPhrase;
    verb: VerbPhrase;
    hideSubject: boolean;
  }>
  | Readonly<{ type: "subject phrase"; subject: NounPhrase }>
  | Readonly<{ type: "interjection"; interjection: Word }>
  | Readonly<{ type: "vocative"; call: string; addressee: NounPhrase }>
  | (Readonly<{ type: "preposition" }> & Preposition)
  | Readonly<{ type: "adverb"; adverb: Word }>
  | Readonly<{ type: "dependent"; conjunction: Word; clause: Clause }>;
export type Preposition = Readonly<{
  adverbs: ReadonlyArray<Adverb>;
  preposition: Word;
  object: NounPhrase;
  emphasis: boolean;
}>;
export type Sentence = Readonly<{
  clauses: ReadonlyArray<Clause>;
  punctuation: string;
}>;
export type MultipleSentences =
  | Readonly<{ type: "free form"; text: string }>
  | Readonly<{ type: "sentences"; sentences: ReadonlyArray<Sentence> }>;
