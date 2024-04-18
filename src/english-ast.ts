/** Module for describing English AST. */

import { AdjectiveType } from "./dictionary.ts";

// TODO: preposition

export type NounPhrase =
  | {
    type: "simple";
    determiners: Array<Determiner>;
    adjectives: Array<AdjectivePhrase>;
    noun: string;
  }
  | { type: "compound"; conjunction: string; subjects: NounPhrase };
export type Determiner =
  | { type: "quantifier"; quantifier: string }
  | { type: "numeral"; number: number };
export type AdjectivePhrase = {
  type: AdjectiveType;
  adverbs: Array<string>;
  adjective: string;
};
export type PredicateAdjective =
  | { type: "simple"; adjective: AdjectivePhrase }
  | { type: "compound"; conjunction: string; adjectives: PredicateAdjective };
export type Verb =
  | {
    type: "default";
    adverbs: Array<string>;
    verb: string;
  }
  | {
    type: "linking noun";
    noun: NounPhrase;
  }
  | {
    type: "linking adjective";
    adjective: PredicateAdjective;
  };
export type Clause =
  | { type: "free form"; text: string }
  | { type: "default"; subject: NounPhrase; verb: Verb; object: NounPhrase }
  | { type: "subject phrase"; subject: NounPhrase }
  | { type: "implied it's noun"; noun: NounPhrase }
  | { type: "implied it's adjective"; noun: PredicateAdjective }
  | { type: "interjection"; interjection: string };
export type DependentClause = {
  conjunction: string;
  clause: Clause;
};
export type Sentence = {
  dependentClauses: Array<DependentClause>;
  independentClause: Clause;
  punctuation: string;
};
