/** Module for describing English AST. */

import { AdjectiveType } from "./dictionary.ts";

export type NounPhrase =
  | {
    type: "simple";
    determiners: Array<Determiner>;
    adjectives: Array<AdjectivePhrase>;
    noun: string;
    preposition: Array<Preposition>;
  }
  | {
    type: "compound";
    conjunction: string;
    subjects: NounPhrase;
    preposition: Array<Preposition>;
  };
export type Determiner =
  | { type: "quantifier"; quantifier: string }
  | { type: "numeral"; number: number };
export type AdjectivePhrase = {
  type: AdjectiveType;
  adverbs: Array<string>;
  adjective: string;
};
export type PredicateAdjective =
  | {
    type: "simple";
    adjective: AdjectivePhrase;
    preposition: Array<Preposition>;
  }
  | {
    type: "compound";
    conjunction: string;
    adjectives: PredicateAdjective;
    preposition: Array<Preposition>;
  };
export type Verb =
  | {
    type: "default";
    adverbs: Array<string>;
    verb: string;
    preposition: Array<Preposition>;
  }
  | {
    type: "linking noun";
    noun: NounPhrase;
    preposition: Array<Preposition>;
  }
  | {
    type: "linking adjective";
    adjective: PredicateAdjective;
    preposition: Array<Preposition>;
  };
export type Clause =
  | { type: "free form"; text: string }
  | {
    type: "default";
    subject: NounPhrase;
    verb: Verb;
    object: NounPhrase;
    preposition: Array<Preposition>;
  }
  | { type: "subject phrase"; subject: NounPhrase }
  | {
    type: "implied it's noun";
    noun: NounPhrase;
    preposition: Array<Preposition>;
  }
  | {
    type: "implied it's adjective";
    noun: PredicateAdjective;
    preposition: Array<Preposition>;
  }
  | { type: "interjection"; interjection: string }
  | {
    type: "compound";
    conjunction: string;
    clauses: Array<Clause>;
    preposition: Array<Preposition>;
  };
export type DependentClause = {
  conjunction: string;
  clause: Clause;
};
export type Preposition = {
  preposition: string;
  object: NounPhrase;
};
export type Sentence = {
  dependentClauses: Array<DependentClause>;
  independentClause: Clause;
  punctuation: string;
};
