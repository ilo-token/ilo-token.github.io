/** Module for describing English AST. */

import {
  AdjectiveType,
  DeterminerType as OriginalDeterminerType,
} from "dictionary/type.ts";

export type Word = {
  word: string;
  emphasis: boolean;
};
export type Quantity = "singular" | "plural" | "both" | "condensed";
export type DeterminerType = OriginalDeterminerType | "numeral";
export type NounPhrase =
  | {
    type: "simple";
    determiners: Array<Determiner>;
    adjectives: Array<AdjectivePhrase>;
    noun: Word;
    quantity: Quantity;
    preposition: Array<Preposition>;
  }
  | {
    type: "compound";
    conjunction: string;
    nouns: Array<NounPhrase>;
    quantity: Quantity;
    preposition: Array<Preposition>;
  };
export type Determiner = {
  type: "default";
  kind: DeterminerType;
  determiner: Word;
  quantity: Quantity;
};
export type AdjectivePhrase =
  | {
    type: "simple";
    kind: AdjectiveType;
    adverbs: Array<Word>;
    adjective: Word;
  }
  | {
    type: "compound";
    conjunction: string;
    adjectives: Array<AdjectivePhrase>;
  };
export type VerbPhrase =
  | {
    type: "default";
    adverbs: Array<Word>;
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
    preposition: Array<Preposition>;
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
