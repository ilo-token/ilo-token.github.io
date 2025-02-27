import * as Dictionary from "../../dictionary/type.ts";

export type Word = {
  word: string;
  emphasis: boolean;
};
export type Quantity = "singular" | "plural" | "condensed";
export type NounPhrase =
  | {
    type: "simple";
    determiner: Array<Determiner>;
    adjective: Array<AdjectivePhrase>;
    noun: Word;
    quantity: Quantity;
    perspective: Dictionary.Perspective;
    postAdjective: null | { adjective: string; name: string };
    preposition: Array<Preposition>;
    emphasis: boolean;
  }
  | {
    type: "compound";
    conjunction: string;
    nouns: Array<NounPhrase>;
    quantity: Quantity;
  };
export type Determiner = {
  kind: Dictionary.DeterminerType;
  determiner: Word;
  quantity: Dictionary.Quantity;
};
export type AdjectivePhrase =
  | {
    type: "simple";
    kind: Dictionary.AdjectiveType;
    adverb: Array<Word>;
    adjective: Word;
    emphasis: boolean;
  }
  | {
    type: "compound";
    conjunction: string;
    adjective: Array<AdjectivePhrase>;
    emphasis: boolean;
  };
export type Complement =
  | { type: "noun"; noun: NounPhrase }
  | { type: "adjective"; adjective: AdjectivePhrase };
export type Verb = {
  modal: null | Word;
  finite: Array<Word>;
  infinite: Word;
};
export type VerbPhrase =
  | {
    type: "default";
    adverb: Array<Word>;
    verb: Verb;
    subjectComplement: null | Complement;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    preposition: Array<Preposition>;
    hideVerb: boolean;
  }
  | {
    type: "compound";
    conjunction: string;
    verbs: Array<VerbPhrase>;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    preposition: Array<Preposition>;
  };
export type Clause =
  | { type: "free form"; text: string }
  | {
    type: "default";
    subject: NounPhrase;
    verb: VerbPhrase;
    hideSubject: boolean;
  }
  | { type: "subject phrase"; subject: NounPhrase }
  | { type: "interjection"; interjection: Word }
  | { type: "vocative"; call: string; addressee: NounPhrase }
  | { type: "dependent"; conjunction: Word; clause: Clause };
export type Preposition = {
  adverb: Array<Word>;
  preposition: Word;
  object: NounPhrase;
};
export type Sentence = {
  clauses: Array<Clause>;
  punctuation: string;
};
