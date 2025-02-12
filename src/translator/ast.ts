/** Module for describing English AST. */

import * as Dictionary from "../../dictionary/type.ts";

export type Word = {
  word: string;
  emphasis: boolean;
};
export type Quantity = "singular" | "plural" | "both" | "condensed";
export type NounPhrase =
  | {
    type: "simple";
    determiner: Array<Determiner>;
    adjective: Array<AdjectivePhrase>;
    noun: Word;
    quantity: Quantity;
    postCompound: null | NounPhrase;
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
export type VerbPhrase =
  | {
    type: "default";
    adverb: Array<Word>;
    verb: Word;
    preposition: Array<Preposition>;
  }
  | {
    type: "linking noun";
    linkingVerb: Word;
    noun: NounPhrase;
    preposition: Array<Preposition>;
  }
  | {
    type: "linking adjective";
    linkingVerb: Word;
    adjective: AdjectivePhrase;
    preposition: Array<Preposition>;
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
    object: null | NounPhrase;
    preposition: Array<Preposition>;
  }
  | { type: "subject phrase"; subject: NounPhrase }
  | {
    type: "implied it's";
    verb: VerbPhrase;
  }
  | { type: "interjection"; interjection: Word }
  | { type: "vocative"; call: string; addressee: NounPhrase }
  | {
    type: "compound";
    conjunction: string;
    clauses: Array<Clause>;
    preposition: Array<Preposition>;
  }
  | { type: "dependent"; conjunction: Word; clause: Clause };
export type Preposition = {
  preposition: Word;
  object: NounPhrase;
};
export type Sentence = {
  clauses: Array<Clause>;
  punctuation: string;
};
