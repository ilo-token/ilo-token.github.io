/** Module for describing English AST. */

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
export type SubjectComplement =
  | { type: "noun"; noun: NounPhrase }
  | { type: "adjective"; adjective: AdjectivePhrase };
export type VerbPhrase =
  | {
    type: "default";
    adverb: Array<Word>;
    verb: Word;
    object: null | NounPhrase;
    preposition: Array<Preposition>;
    hideVerb: boolean;
  }
  | {
    type: "linking";
    linkingVerb: Word;
    subjectComplement: SubjectComplement;
    preposition: Array<Preposition>;
    hideVerb: boolean;
  }
  | {
    type: "compound";
    conjunction: Word;
    verbs: VerbPhrase;
    preposition: Array<Preposition>;
  };
export type Clause =
  | { type: "free form"; text: string }
  | {
    type: "default";
    subject: NounPhrase;
    verb: VerbPhrase;
    preposition: Array<Preposition>;
    hideSubject: boolean;
  }
  | { type: "subject phrase"; subject: NounPhrase }
  | { type: "interjection"; interjection: Word }
  | { type: "vocative"; call: string; addressee: NounPhrase }
  | { type: "dependent"; conjunction: Word; clause: Clause };
export type Preposition = {
  preposition: Word;
  object: NounPhrase;
};
export type Sentence = {
  clauses: Array<Clause>;
  punctuation: string;
};
