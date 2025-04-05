import * as Dictionary from "../../dictionary/type.ts";

export type Word = Readonly<{
  word: string;
  emphasis: boolean;
}>;
export type Quantity = "singular" | "plural" | "condensed";
export type NounPhrase =
  | Readonly<{
    type: "simple";
    determiner: ReadonlyArray<Determiner>;
    adjective: ReadonlyArray<AdjectivePhrase>;
    noun: Word;
    quantity: Quantity;
    perspective: Dictionary.Perspective;
    postAdjective: null | Readonly<{ adjective: string; name: string }>;
    preposition: ReadonlyArray<Preposition>;
    emphasis: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    nouns: ReadonlyArray<NounPhrase>;
    quantity: Quantity;
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
    adverb: ReadonlyArray<Word>;
    adjective: Word;
    emphasis: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    adjective: ReadonlyArray<AdjectivePhrase>;
    emphasis: boolean;
  }>;
export type Complement =
  | Readonly<{ type: "noun"; noun: NounPhrase }>
  | Readonly<{ type: "adjective"; adjective: AdjectivePhrase }>;
export type AdverbVerb = {
  adverb: ReadonlyArray<Word>;
  verb: Word;
};
export type Verb = Readonly<{
  modal: null | AdverbVerb;
  verb: ReadonlyArray<AdverbVerb>;
}>;
export type VerbPhrase =
  | Readonly<{
    type: "default";
    verb: Verb;
    subjectComplement: null | Complement;
    contentClause: null | Clause;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    preposition: ReadonlyArray<Preposition>;
    hideVerb: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    verbs: ReadonlyArray<VerbPhrase>;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    preposition: ReadonlyArray<Preposition>;
  }>;
export type Clause =
  | Readonly<{
    type: "default";
    subject: NounPhrase;
    verb: VerbPhrase;
    hideSubject: boolean;
  }>
  | Readonly<{ type: "subject phrase"; subject: NounPhrase }>
  | Readonly<{ type: "interjection"; interjection: Word }>
  | Readonly<{ type: "vocative"; call: string; addressee: NounPhrase }>
  | (Readonly<{ type: "preposition" }> & Preposition)
  | Readonly<{ type: "dependent"; conjunction: Word; clause: Clause }>;
export type Preposition = Readonly<{
  adverb: ReadonlyArray<Word>;
  preposition: Word;
  object: NounPhrase;
  emphasis: boolean;
}>;
export type Sentence = Readonly<{
  clauses: ReadonlyArray<Clause>;
  punctuation: string;
}>;
export type Sentences =
  | Readonly<{ type: "free form"; text: string }>
  | Readonly<{ type: "sentences"; sentences: ReadonlyArray<Sentence> }>;
